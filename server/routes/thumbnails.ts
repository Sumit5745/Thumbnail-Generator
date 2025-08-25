import { FastifyInstance, FastifyRequest } from 'fastify';
import { Job, File, Thumbnail } from '../models';
import { JobStatusResponse, UserJobsResponse } from '../../src/types';
import { transformThumbnailsForFrontend } from '../utils/urls';

export async function thumbnailRoutes(fastify: FastifyInstance) {
  // Authentication middleware
  const authenticate = async (request: FastifyRequest, reply: any) => {
    try {
      // Try cookie authentication first
      await request.jwtVerify();
    } catch (cookieErr) {
      // If cookie auth fails, try Authorization header
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = fastify.jwt.verify(token) as { userId: string; email: string };
          // Fastify JWT uses request.user, not request.authUser
          request.user = { userId: decoded.userId, email: decoded.email };
        } else {
          throw new Error('No valid authentication method found');
        }
      } catch (headerErr) {
        console.error('JWT verification failed (both cookie and header):', {
          cookieError: cookieErr,
          headerError: headerErr
        });
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized - Invalid or missing token'
        });
      }
    }
  };

  // Get all user jobs with files and thumbnails
  fastify.get('/jobs', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };
      
      const jobs = await Job.find({ userId })
        .sort({ createdAt: -1 })
        .populate('thumbnails')
        .lean();

      const jobsWithFiles = await Promise.all(
        jobs.map(async (job) => {
          const file = await File.findById(job.fileId).lean();

          // Transform thumbnails to include full URL and proper format for frontend
          const transformedThumbnails = transformThumbnailsForFrontend(
            job.thumbnails || [],
            job._id.toString()
          );

          return {
            ...job,
            file,
            thumbnails: transformedThumbnails
          };
        })
      );

      // Filter out jobs with null files and ensure proper typing
      const validJobsWithFiles = jobsWithFiles
        .filter(job => job.file !== null)
        .map(job => ({
          ...job,
          file: job.file!,
          thumbnails: job.thumbnails
        }));

      const response = {
        jobs: validJobsWithFiles
      };

      return reply.send({
        success: true,
        data: response
      });

    } catch (error) {
      fastify.log.error('Get jobs error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get specific job status
  fastify.get<{ Params: { jobId: string } }>('/jobs/:jobId', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };
      const { jobId } = request.params;

      const job = await Job.findOne({ _id: jobId, userId })
        .populate('thumbnails')
        .lean();

      if (!job) {
        return reply.status(404).send({
          success: false,
          error: 'Job not found'
        });
      }

      const file = await File.findById(job.fileId).lean();
      const thumbnails = await Thumbnail.find({ jobId }).lean();

      // Transform thumbnails for frontend
      const transformedThumbnails = transformThumbnailsForFrontend(
        thumbnails,
        jobId
      );

      const response: JobStatusResponse = {
        job,
        file: file!,
        thumbnails: transformedThumbnails as any
      };

      return reply.send({
        success: true,
        data: response
      });

    } catch (error) {
      fastify.log.error('Get job status error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get user files
  fastify.get('/files', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };

      const files = await File.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({
        success: true,
        data: { files }
      });

    } catch (error) {
      fastify.log.error('Get files error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get thumbnails for a specific file
  fastify.get<{ Params: { fileId: string } }>('/files/:fileId/thumbnails', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };
      const { fileId } = request.params;

      // Verify file belongs to user
      const file = await File.findOne({ _id: fileId, userId }).lean();
      if (!file) {
        return reply.status(404).send({
          success: false,
          error: 'File not found'
        });
      }

      const thumbnails = await Thumbnail.find({ fileId })
        .sort({ createdAt: -1 })
        .lean();

      // Transform thumbnails for frontend
      const transformedThumbnails = transformThumbnailsForFrontend(
        thumbnails,
        fileId
      );

      return reply.send({
        success: true,
        data: { thumbnails: transformedThumbnails }
      });

    } catch (error) {
      fastify.log.error('Get file thumbnails error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Delete a job (and its thumbnails)
  fastify.delete<{ Params: { jobId: string } }>('/jobs/:jobId', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };
      const { jobId } = request.params;

      const job = await Job.findOne({ _id: jobId, userId });
      if (!job) {
        return reply.status(404).send({
          success: false,
          error: 'Job not found'
        });
      }

      // Delete thumbnails
      await Thumbnail.deleteMany({ jobId });
      
      // Delete job
      await Job.findByIdAndDelete(jobId);

      return reply.send({
        success: true,
        message: 'Job deleted successfully'
      });

    } catch (error) {
      fastify.log.error('Delete job error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Retry a failed job
  fastify.post<{ Params: { jobId: string } }>('/jobs/:jobId/retry', {
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };
      const { jobId } = request.params;

      const job = await Job.findOne({ _id: jobId, userId });
      if (!job) {
        return reply.status(404).send({
          success: false,
          error: 'Job not found'
        });
      }

      if (job.status !== 'failed') {
        return reply.status(400).send({
          success: false,
          error: 'Only failed jobs can be retried'
        });
      }

      // Reset job status
      job.status = 'pending';
      job.progress = 0;
      job.error = undefined;
      job.startedAt = undefined;
      job.completedAt = undefined;
      await job.save();

      // Re-add to queue (you'll need to implement this)
      // await addThumbnailJob(...);

      return reply.send({
        success: true,
        message: 'Job queued for retry'
      });

    } catch (error) {
      fastify.log.error('Retry job error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}
