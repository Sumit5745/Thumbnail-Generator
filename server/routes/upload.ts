import { FastifyInstance, FastifyRequest } from 'fastify';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { File, Job } from '../models';
import { addThumbnailJob } from '../queue/thumbnailQueue';
import { UploadResponse } from '../../src/types';
import { CONFIG } from '../config/config';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import {
  ValidationError,
  createErrorResponse
} from '../utils/errors';
import { validateFileUpload } from '../utils/validation';

const UPLOAD_DIR = path.join(process.cwd(), CONFIG.UPLOAD_DIR);

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

export async function uploadRoutes(fastify: FastifyInstance) {
  // Use configuration values for allowed file types
  const ALLOWED_TYPES = [...CONFIG.ALLOWED_IMAGE_TYPES, ...CONFIG.ALLOWED_VIDEO_TYPES];

  // Upload single file endpoint with comprehensive validation
  fastify.post('/files', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      await ensureUploadDir();

      const { userId } = request.user as { userId: string };
      const data = await request.file();

      if (!data) {
        throw new ValidationError('No file uploaded');
      }

      const { filename, mimetype, file } = data;

      logger.info('File upload attempt', {
        userId,
        filename,
        mimetype,
        ip: request.ip
      });

      // Validate file using our security utility
      validateFileUpload(
        { filename, mimetype },
        ALLOWED_TYPES,
        CONFIG.MAX_FILE_SIZE
      );

      // Generate unique filename with proper extension handling
      const fileExtension = path.extname(filename).toLowerCase();
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFilename);

      // Save file to disk with error handling
      await pipeline(file, createWriteStream(filePath));

      // Get file stats for validation
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));

      // Double-check file size after upload
      if (stats.size > CONFIG.MAX_FILE_SIZE) {
        await import('fs').then(fs => fs.promises.unlink(filePath));
        throw new ValidationError(
          `File too large. Maximum size is ${Math.round(CONFIG.MAX_FILE_SIZE / 1024 / 1024)}MB`,
          { fileSize: stats.size, maxSize: CONFIG.MAX_FILE_SIZE }
        );
      }

      // Determine file type
      const isImage = mimetype.startsWith('image/');

      // Save file info to database
      const fileDoc = new File({
        userId,
        originalName: filename,
        filename: uniqueFilename,
        mimetype,
        size: stats.size,
        path: filePath,
        type: isImage ? 'image' : 'video'
      });

      await fileDoc.save();

      // Create thumbnail job
      const job = new Job({
        userId,
        fileId: fileDoc._id,
        status: 'pending',
        progress: 0,
        thumbnailSizes: [`${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`]
      });

      await job.save();

      // Add job to queue
      await addThumbnailJob({
        jobId: job._id.toString(),
        fileId: fileDoc._id.toString(),
        userId,
        filePath,
        fileType: fileDoc.type,
        thumbnailSizes: [`${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`],
        outputDir: path.join(UPLOAD_DIR, 'thumbnails')
      });

      // Update job status to queued
      job.status = 'queued';
      await job.save();

      const response: UploadResponse = {
        jobs: [{
          jobId: job._id.toString(),
          fileId: fileDoc._id.toString(),
          filename: fileDoc.originalName,
          fileSize: fileDoc.size,
          status: job.status
        }]
      };

      return reply.status(201).send({
        success: true,
        data: response,
        message: 'File uploaded successfully'
      });

    } catch (error) {
      fastify.log.error('Upload error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Upload multiple files endpoint
  fastify.post('/files/multiple', {
    preHandler: authenticate
  }, async (request, reply) => {
    const startTime = Date.now();
    let { userId } = { userId: '' };

    try {
      await ensureUploadDir();

      ({ userId } = request.user as { userId: string });
      const parts = request.files();
      const uploadedJobs = [];

      logger.info('Multiple file upload started', {
        userId,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      for await (const part of parts) {
        const { filename, mimetype, file } = part;

        logger.info('Processing file in multiple upload', {
          userId,
          filename,
          mimetype,
          ip: request.ip
        });

        // Validate file type (case-insensitive)
        const normalizedMimeType = mimetype.toLowerCase();
        const isImage = CONFIG.ALLOWED_IMAGE_TYPES.some(type => type.toLowerCase() === normalizedMimeType);
        const isVideo = CONFIG.ALLOWED_VIDEO_TYPES.some(type => type.toLowerCase() === normalizedMimeType);

        // Debug: Log the validation details
        logger.info('File type validation', {
          filename,
          mimetype,
          normalizedMimeType,
          isImage,
          isVideo,
          allowedImageTypes: CONFIG.ALLOWED_IMAGE_TYPES,
          allowedVideoTypes: CONFIG.ALLOWED_VIDEO_TYPES,
          userId
        });

        if (!isImage && !isVideo) {
          logger.warn('Invalid file type skipped', { filename, mimetype, userId });
          continue; // Skip invalid files
        }

        // Generate unique filename
        const fileExtension = path.extname(filename);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(UPLOAD_DIR, uniqueFilename);

        // Save file to disk with progress logging
        logger.info('Starting file save to disk', { filename, uniqueFilename, userId });
        await pipeline(file, createWriteStream(filePath));
        logger.info('File saved to disk successfully', { filename, uniqueFilename, userId });

        // Get file stats
        const stats = await import('fs').then(fs => fs.promises.stat(filePath));

        logger.info('File stats retrieved', {
          filename,
          size: stats.size,
          maxSize: CONFIG.MAX_FILE_SIZE,
          userId
        });

        if (stats.size > CONFIG.MAX_FILE_SIZE) {
          // Delete the file if it's too large and skip
          await import('fs').then(fs => fs.promises.unlink(filePath));
          logger.warn('File too large, deleted and skipped', {
            filename,
            size: stats.size,
            maxSize: CONFIG.MAX_FILE_SIZE,
            userId
          });
          continue;
        }

        // Save file info to database
        const fileDoc = new File({
          userId,
          originalName: filename,
          filename: uniqueFilename,
          mimetype,
          size: stats.size,
          path: filePath,
          type: isImage ? 'image' : 'video'
        });

        await fileDoc.save();

        // Create thumbnail job
        const job = new Job({
          userId,
          fileId: fileDoc._id,
          status: 'pending',
          progress: 0,
          thumbnailSizes: [`${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`]
        });

        await job.save();

        // Add job to queue
        await addThumbnailJob({
          jobId: job._id.toString(),
          fileId: fileDoc._id.toString(),
          userId,
          filePath,
          fileType: fileDoc.type,
          thumbnailSizes: [`${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`],
          outputDir: path.join(UPLOAD_DIR, 'thumbnails')
        });

        // Update job status to queued
        job.status = 'queued';
        await job.save();

        uploadedJobs.push({
          jobId: job._id.toString(),
          fileId: fileDoc._id.toString(),
          filename: fileDoc.originalName,
          fileSize: fileDoc.size,
          status: job.status
        });
      }

      const response: UploadResponse = {
        jobs: uploadedJobs
      };

      const duration = Date.now() - startTime;
      logger.info('Multiple file upload completed successfully', {
        userId,
        jobCount: uploadedJobs.length,
        duration: `${duration}ms`,
        ip: request.ip
      });

      return reply.status(201).send({
        success: true,
        data: response,
        message: `${uploadedJobs.length} files uploaded successfully`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Multiple upload error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        duration: `${duration}ms`,
        ip: request.ip
      });

      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}
