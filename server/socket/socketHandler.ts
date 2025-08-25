import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redisPubSub } from '../config/redis';
import { SocketEvents } from '../../src/types';
import { CONFIG } from '../config/config';
import { transformThumbnailsForFrontend } from '../utils/urls';

export function setupSocketIO(server: any): SocketIOServer {
  // Build allowed origins dynamically based on configuration
  const allowedOrigins = [
    CONFIG.FRONTEND_URL,
    CONFIG.API_BASE_URL,
    // Development fallbacks
    ...(CONFIG.isDevelopment ? [
        CONFIG.API_BASE_URL,
  CONFIG.FRONTEND_URL,
      `http://localhost:${CONFIG.PORT}`
    ] : [])
  ].filter((origin, index, arr) => arr.indexOf(origin) === index); // Remove duplicates

  const io = new SocketIOServer<SocketEvents>(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { userId: string; email: string };
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      
      console.log(`🔌 User ${decoded.email} connected to Socket.IO`);
      next();
    } catch (error) {
      console.error('Socket.IO authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  // Handle client connections
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userEmail = socket.data.email;

    console.log(`✅ User ${userEmail} (${userId}) connected`);

    // Join user to their personal room for targeted updates
    socket.join(`user:${userId}`);

    // Handle join room event
    socket.on('join-room', (roomUserId: string) => {
      if (roomUserId === userId) {
        socket.join(`user:${roomUserId}`);
        console.log(`👥 User ${userEmail} joined room: user:${roomUserId}`);
      }
    });

    // Handle leave room event
    socket.on('leave-room', (roomUserId: string) => {
      socket.leave(`user:${roomUserId}`);
      console.log(`👋 User ${userEmail} left room: user:${roomUserId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ User ${userEmail} disconnected: ${reason}`);
    });

    // Send initial connection confirmation
    socket.emit('job-status-update', {
      jobId: 'connection',
      status: 'completed',
      progress: 100,
      error: undefined
    });
  });

  // Setup Redis pub/sub listeners for job updates
  setupRedisListeners(io);

  return io;
}

function setupRedisListeners(io: SocketIOServer) {
  // Listen for job completion events
  redisPubSub.subscribe('job-completed', (err) => {
    if (err) {
      console.error('Error subscribing to job-completed:', err);
    } else {
      console.log('📡 Subscribed to job-completed events');
    }
  });

  // Listen for job failure events
  redisPubSub.subscribe('job-failed', (err) => {
    if (err) {
      console.error('Error subscribing to job-failed:', err);
    } else {
      console.log('📡 Subscribed to job-failed events');
    }
  });

  // Listen for job active events
  redisPubSub.subscribe('job-active', (err) => {
    if (err) {
      console.error('Error subscribing to job-active:', err);
    } else {
      console.log('📡 Subscribed to job-active events');
    }
  });

  // Listen for job progress events
  redisPubSub.subscribe('job-progress', (err) => {
    if (err) {
      console.error('Error subscribing to job-progress:', err);
    } else {
      console.log('📡 Subscribed to job-progress events');
    }
  });

  // Handle Redis messages
  redisPubSub.on('message', async (channel, message) => {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'job-completed':
          await handleJobCompleted(io, data);
          break;
        case 'job-failed':
          await handleJobFailed(io, data);
          break;
        case 'job-active':
          await handleJobActive(io, data);
          break;
        case 'job-progress':
          await handleJobProgress(io, data);
          break;
        default:
          console.log(`📨 Unknown channel: ${channel}`);
      }
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  });
}

async function handleJobCompleted(io: SocketIOServer, data: { jobId: string; returnvalue: any }) {
  try {
    // Get job details from database to find the user
    const { Job } = await import('../models');
    const job = await Job.findById(data.jobId);
    
    if (job) {
      // Transform thumbnail URLs to thumbnail objects for frontend using utility
      const thumbnails = transformThumbnailsForFrontend(
        data.returnvalue.thumbnails || [],
        data.jobId
      );

      // Emit to user's room
      io.to(`user:${job.userId}`).emit('job-completed', {
        jobId: data.jobId,
        thumbnails: thumbnails
      });

      // Also emit general status update
      io.to(`user:${job.userId}`).emit('job-status-update', {
        jobId: data.jobId,
        status: 'completed',
        progress: 100
      });

      console.log(`✅ Emitted job-completed for job ${data.jobId} to user ${job.userId}`);
    }
  } catch (error) {
    console.error('Error handling job completed:', error);
  }
}

async function handleJobFailed(io: SocketIOServer, data: { jobId: string; error: string }) {
  try {
    const { Job } = await import('../models');
    const job = await Job.findById(data.jobId);
    
    if (job) {
      // Emit to user's room
      io.to(`user:${job.userId}`).emit('job-failed', {
        jobId: data.jobId,
        error: data.error
      });

      // Also emit general status update
      io.to(`user:${job.userId}`).emit('job-status-update', {
        jobId: data.jobId,
        status: 'failed',
        progress: 0,
        error: data.error
      });

      console.log(`❌ Emitted job-failed for job ${data.jobId} to user ${job.userId}`);
    }
  } catch (error) {
    console.error('Error handling job failed:', error);
  }
}

async function handleJobActive(io: SocketIOServer, data: { jobId: string }) {
  try {
    const { Job } = await import('../models');
    const job = await Job.findById(data.jobId);

    if (job) {
      // Emit the specific job-active event that the frontend is listening for
      io.to(`user:${job.userId}`).emit('job-active', {
        jobId: data.jobId
      });

      // Also emit general status update
      io.to(`user:${job.userId}`).emit('job-status-update', {
        jobId: data.jobId,
        status: 'processing',
        progress: 0
      });

      console.log(`🔄 Emitted job-active for job ${data.jobId} to user ${job.userId}`);
    }
  } catch (error) {
    console.error('Error handling job active:', error);
  }
}

async function handleJobProgress(io: SocketIOServer, data: { jobId: string; progress: number }) {
  try {
    const { Job } = await import('../models');
    const job = await Job.findById(data.jobId);

    if (job) {
      // Emit the specific job-progress event that the frontend is listening for
      io.to(`user:${job.userId}`).emit('job-progress', {
        jobId: data.jobId,
        progress: data.progress
      });

      // Also emit general status update
      io.to(`user:${job.userId}`).emit('job-status-update', {
        jobId: data.jobId,
        status: 'processing',
        progress: data.progress
      });

      console.log(`📊 Emitted job-progress for job ${data.jobId}: ${data.progress}%`);
    }
  } catch (error) {
    console.error('Error handling job progress:', error);
  }
}
