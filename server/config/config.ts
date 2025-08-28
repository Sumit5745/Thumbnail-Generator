import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Environment validation and sanitization
const validatePort = (port: string | undefined, defaultPort: number): number => {
  const parsed = parseInt(port || '', 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(`⚠️ Invalid port ${port}, using default ${defaultPort}`);
    return defaultPort;
  }
  return parsed;
};

const validateFileSize = (size: string | undefined, defaultSize: number): number => {
  const parsed = parseInt(size || '', 10);
  if (isNaN(parsed) || parsed < 1024) {
    console.warn(`⚠️ Invalid file size ${size}, using default ${defaultSize}`);
    return defaultSize;
  }
  return parsed;
};

const validateTimeout = (timeout: string | undefined, defaultTimeout: number): number => {
  const parsed = parseInt(timeout || '', 10);
  if (isNaN(parsed) || parsed < 1000) {
    console.warn(`⚠️ Invalid timeout ${timeout}, using default ${defaultTimeout}`);
    return defaultTimeout;
  }
  return parsed;
};

export const CONFIG = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: 3000,
  
  // Database Configuration
  MONGODB_URI: 'mongodb://localhost:27017/thumbnail-generator',
  
  // Redis Configuration
  REDIS_URL: 'redis://:redis123@localhost:6379',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_PASSWORD: 'redis123',
  
  // Authentication
  JWT_SECRET: 'thumbnail-generator-secret-key',
  JWT_EXPIRES_IN: '7d',
  
  // File Upload Configuration
  MAX_FILE_SIZE: 104857600,
  MAX_FILES_PER_UPLOAD: 10,
  UPLOAD_DIR: 'uploads',

  // Timeout Configuration
  REQUEST_TIMEOUT: 300000,
  CONNECTION_TIMEOUT: 300000,
  UPLOAD_TIMEOUT: 300000,
  
  // Thumbnail Configuration
  THUMBNAIL_SIZE: 128,
  THUMBNAIL_QUALITY: 80,
  VIDEO_THUMBNAIL_TIME: '00:00:01',
  
  // Worker Configuration
  WORKER_CONCURRENCY: 1,
  WORKER_MAX_ATTEMPTS: 3,
  WORKER_BACKOFF_DELAY: 2000,
  
  // FFmpeg Configuration
  FFMPEG_PATH: 'ffmpeg',
  FFPROBE_PATH: 'ffprobe',
  
  // CORS Configuration
  FRONTEND_URL: 'http://localhost:3001',

  // API Configuration
  API_BASE_URL: 'http://localhost:3000',
  
  // File Types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/wmv', 'video/flv', 'video/webm'],
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Logging
  LOG_LEVEL: 'info'
};

// Configuration validation
const validateConfiguration = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredEnvVars = ['JWT_SECRET'];
  if (CONFIG.isProduction) {
    requiredEnvVars.push('MONGODB_URI', 'REDIS_URL');
  }

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Security warnings
  if (CONFIG.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    warnings.push('Using default JWT secret - change this in production');
  }

  if (CONFIG.REDIS_PASSWORD === 'redis123') {
    warnings.push('Using default Redis password - change this in production');
  }

  // Configuration validation
  if (CONFIG.THUMBNAIL_SIZE < 32 || CONFIG.THUMBNAIL_SIZE > 512) {
    warnings.push(`Thumbnail size ${CONFIG.THUMBNAIL_SIZE} is outside recommended range (32-512)`);
  }

  if (CONFIG.THUMBNAIL_QUALITY < 10 || CONFIG.THUMBNAIL_QUALITY > 100) {
    warnings.push(`Thumbnail quality ${CONFIG.THUMBNAIL_QUALITY} is outside valid range (10-100)`);
  }

  if (CONFIG.MAX_FILE_SIZE > 500 * 1024 * 1024) {
    warnings.push(`Maximum file size ${CONFIG.MAX_FILE_SIZE} bytes is very large`);
  }

  // Log errors and warnings
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    if (CONFIG.isProduction) {
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
};

// Validate configuration on load
validateConfiguration();

// Log configuration summary
console.log('🔧 Configuration Summary:');
console.log(`  Environment: ${CONFIG.NODE_ENV}`);
console.log(`  Server Port: ${CONFIG.PORT}`);
console.log(`  Upload Directory: ${CONFIG.UPLOAD_DIR}`);
console.log(`  Thumbnail Size: ${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`);
console.log(`  Worker Concurrency: ${CONFIG.WORKER_CONCURRENCY}`);
console.log(`  Max File Size: ${(CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB`);
console.log(`  Allowed Image Types: ${CONFIG.ALLOWED_IMAGE_TYPES.length} types`);
console.log(`  Allowed Video Types: ${CONFIG.ALLOWED_VIDEO_TYPES.length} types`);
