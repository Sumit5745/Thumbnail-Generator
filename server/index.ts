// Main Fastify server entry point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import staticFiles from '@fastify/static';
import path from 'path';
import { connectDB } from './config/database';
import { authRoutes } from './routes/auth';
import { uploadRoutes } from './routes/upload';
import { thumbnailRoutes } from './routes/thumbnails';
import { setupSocketIO } from './socket/socketHandler';
import { CONFIG } from './config/config';
import { logger } from './utils/logger';
import { AppError, createErrorResponse } from './utils/errors';

async function buildServer() {
  // Create Fastify instance with production-ready configuration
  const fastify = Fastify({
    logger: CONFIG.NODE_ENV === 'development' ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    } : {
      level: 'warn'
    },
    bodyLimit: CONFIG.MAX_FILE_SIZE,
    requestTimeout: CONFIG.REQUEST_TIMEOUT,
    connectionTimeout: CONFIG.CONNECTION_TIMEOUT,
    keepAliveTimeout: CONFIG.CONNECTION_TIMEOUT,
    trustProxy: true // Important for production behind reverse proxy
  });

  // Global error handler for production-ready error responses
  fastify.setErrorHandler(async (error, request, reply) => {
    // Check if it's our custom AppError
    if (error instanceof AppError) {
      logger.warn('Application error occurred', {
        error: error.message,
        statusCode: error.statusCode,
        url: request.url,
        method: request.method,
        userAgent: request.headers['user-agent']
      });

      const errorResponse = createErrorResponse(error);
      return reply.status(error.statusCode).send(errorResponse);
    }

    // Handle Fastify validation errors
    if (error.validation) {
      logger.warn('Validation error occurred', {
        error: error.message,
        validation: error.validation,
        url: request.url,
        method: request.method
      });

      const validationError = new AppError('Invalid request data', 400, true, {
        validation: error.validation
      });
      const errorResponse = createErrorResponse(validationError);
      return reply.status(400).send(errorResponse);
    }

    // Programming error - log with full details but don't expose internals
    logger.error('Unexpected server error', error, {
      url: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    });

    const genericError = new AppError('Internal server error', 500);
    const errorResponse = createErrorResponse(genericError);
    return reply.status(500).send(errorResponse);
  });

  const allowedOrigins = [
    CONFIG.FRONTEND_URL,
    CONFIG.API_BASE_URL,
    // Always include localhost for Docker development
    'http://localhost:3000',
    'http://localhost:3001',
    `http://localhost:${CONFIG.PORT}`,
    // Development fallbacks
    ...(CONFIG.isDevelopment ? [
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ] : [])
  ].filter((origin, index, arr) => arr.indexOf(origin) === index);

  await fastify.register(cors, {
    origin: true, // Allow all origins for local development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  });

  await fastify.register(cookie);

  // Register form body parser only (JSON is built-in)
  await fastify.register(formbody);

  await fastify.register(jwt, {
    secret: CONFIG.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: CONFIG.MAX_FILE_SIZE,
      files: CONFIG.MAX_FILES_PER_UPLOAD,
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      headerPairs: 2000
    },
    attachFieldsToBody: false,
    sharedSchemaId: 'MultipartFileType'
  });

  const fs = require('fs');
  
  // Try multiple possible paths for uploads directory (server moved to root)
  const possiblePaths = [
    path.join(process.cwd(), CONFIG.UPLOAD_DIR),
    path.join(__dirname, '..', CONFIG.UPLOAD_DIR),
    path.join(__dirname, CONFIG.UPLOAD_DIR),
    CONFIG.UPLOAD_DIR
  ];
  
  let uploadsPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      uploadsPath = testPath;
      break;
    }
  }
  
  if (!uploadsPath) {
    // Create uploads directory if it doesn't exist
    uploadsPath = path.join(process.cwd(), CONFIG.UPLOAD_DIR);
    fs.mkdirSync(uploadsPath, { recursive: true });
    fs.mkdirSync(path.join(uploadsPath, 'thumbnails'), { recursive: true });
  }
  
  logger.info('Static file serving configuration:', {
    uploadsPath,
    prefix: '/uploads/',
    exists: fs.existsSync(uploadsPath),
    cwd: process.cwd(),
    dirname: __dirname,
    uploadsDir: CONFIG.UPLOAD_DIR,
    possiblePaths
  });

  // Check if thumbnails directory exists
  const thumbnailsPath = path.join(uploadsPath, 'thumbnails');
  if (!fs.existsSync(thumbnailsPath)) {
    fs.mkdirSync(thumbnailsPath, { recursive: true });
  }
  
  logger.info('Thumbnails directory check:', {
    thumbnailsPath,
    exists: fs.existsSync(thumbnailsPath),
    files: fs.existsSync(thumbnailsPath) ? fs.readdirSync(thumbnailsPath).slice(0, 5) : []
  });

  await fastify.register(staticFiles, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res, path) => {
      // Add CORS headers for images
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  });

  await connectDB();

  // Setup Socket.IO before registering routes
  try {
    const io = setupSocketIO(fastify.server);
    // Make io available globally for routes that need it
    fastify.decorate('io', io);
    logger.info('Socket.IO initialized successfully');
  } catch (socketError) {
    logger.warn('Socket.IO setup failed, continuing without real-time features', {
      error: socketError instanceof Error ? socketError.message : 'Unknown error'
    });
  }

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(uploadRoutes, { prefix: '/api/upload' });
  await fastify.register(thumbnailRoutes, { prefix: '/api/thumbnails' });

  // Health check endpoint
  fastify.get('/api/health', async () => {
    return { status: 'OK', timestamp: new Date().toISOString() };
  });

  // Test static file serving
  fastify.get('/api/test-static', async () => {
    const fs = require('fs');
    const thumbnailsPath = path.join(uploadsPath, 'thumbnails');
    const files = fs.existsSync(thumbnailsPath) ? fs.readdirSync(thumbnailsPath) : [];
    
    return { 
      status: 'OK', 
      uploadsPath,
      thumbnailsPath,
      filesCount: files.length,
      sampleFiles: files.slice(0, 3),
      testUrl: `${CONFIG.API_BASE_URL}/uploads/thumbnails/${files[0] || 'test'}`
    };
  });

  return fastify;
}

async function start() {
  try {
    // Initialize database connections first
    logger.info('Starting server initialization...');

    const fastify = await buildServer();

    // Start Fastify server
    await fastify.listen({ 
      port: CONFIG.PORT, 
      host: '0.0.0.0'  
    });
    logger.info(`Server running on http://localhost:${CONFIG.PORT}`, {
      port: CONFIG.PORT,
      environment: CONFIG.NODE_ENV,
      nodeVersion: process.version
    });



    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        await fastify.close();
        logger.info('Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error as Error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server', err as Error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildServer };
