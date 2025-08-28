import { Worker } from 'bullmq';
import { connectDB } from '../../server/config/database';
import { redisConnection } from '../../server/config/redis';
import { processThumbnailJob } from './thumbnailProcessor';
import { setupQueueEventListeners } from '../../server/queue/thumbnailQueue';
import { ThumbnailJobData } from '../types';
import { CONFIG } from '../../server/config/config';

class ThumbnailWorker {
  private worker: Worker;
  private isProcessing: boolean = false;

  constructor() {
    // Create BullMQ worker
    this.worker = new Worker<ThumbnailJobData>(
      'thumbnail-processing',
      async (job) => {
        console.log(`🔄 Processing job ${job.id} for user ${job.data.userId} - FIFO MODE`);
        
        // FIFO LOCK - ensure only one job processes at a time
        while (this.isProcessing) {
          console.log(`⏳ Job ${job.id} waiting - another job is processing`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        this.isProcessing = true;
        
        try {
          console.log(`🎯 FIFO Processing: Job ${job.id} starting`);
          const result = await this.processJob(job);
          console.log(`✅ Job ${job.id} completed successfully`);
          return result;
        } finally {
          this.isProcessing = false;
        }
      },
      {
        connection: redisConnection,
        concurrency: 1, // FIFO processing - only one job at a time
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );

    this.setupEventListeners();
  }

  private async processJob(job: any) {
    try {
      console.log(`🔄 Starting job ${job.id} for file: ${job.data.filePath}`);
      
      // Update job progress
      await job.updateProgress(10);
      
      // Process the thumbnail with timeout
      const result = await Promise.race([
        processThumbnailJob(job.data, (progress: number) => {
          return job.updateProgress(progress);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Job timeout')), 5 * 60 * 1000)
        )
      ]);
      
      console.log(`✅ Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      
      // Update job status to failed
      try {
        const { Job } = require('../../server/models');
        await Job.findByIdAndUpdate(job.data.jobId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        });
      } catch (dbError) {
        console.error(`❌ Failed to update job status in database:`, dbError);
      }
      
      throw error;
    }
  }

  private setupEventListeners() {
    this.worker.on('ready', () => {
      console.log('🚀 Thumbnail worker is ready');
    });

    this.worker.on('active', (job) => {
      console.log(`🔄 Job ${job.id} is now active`);
    });

    this.worker.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed with result:`, result);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('❌ Worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`⚠️ Job ${jobId} stalled`);
    });
  }

  async start() {
    try {
      // Connect to MongoDB
      await connectDB();
      
      // Setup queue event listeners for real-time updates
      setupQueueEventListeners();
      
      console.log('🎯 Thumbnail worker started successfully');
      
      // Setup periodic health checks
      setInterval(async () => {
        try {
          const { thumbnailQueue } = require('../../server/queue/thumbnailQueue');
          const stats = await thumbnailQueue.getJobCounts();
          console.log('📊 Worker stats:', stats);
          
          // Check for stuck jobs
          const activeJobs = await thumbnailQueue.getActive();
          for (const job of activeJobs) {
            const jobAge = Date.now() - job.timestamp;
            if (jobAge > 10 * 60 * 1000) { // 10 minutes
              console.warn(`⚠️ Job ${job.id} has been active for ${Math.round(jobAge / 1000 / 60)} minutes, retrying...`);
              await job.retry();
            }
          }
        } catch (error) {
          console.error('Error in health check:', error);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
      
      // Keep the process running
      process.on('SIGINT', () => this.gracefulShutdown());
      process.on('SIGTERM', () => this.gracefulShutdown());
      
    } catch (error) {
      console.error('❌ Failed to start worker:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown() {
    console.log('🛑 Shutting down worker gracefully...');
    
    try {
      await this.worker.close();
      console.log('✅ Worker closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during worker shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  const worker = new ThumbnailWorker();
  worker.start();
}

export { ThumbnailWorker };
