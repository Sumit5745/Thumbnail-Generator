import { Worker } from 'bullmq';
import { connectDB } from '../../server/config/database';
import { redisConnection } from '../../server/config/redis';
import { processThumbnailJob } from './thumbnailProcessor';
import { setupQueueEventListeners } from '../../server/queue/thumbnailQueue';
import { ThumbnailJobData } from '../types';
import { CONFIG } from '../../server/config/config';

class ThumbnailWorker {
  private worker: Worker;

  constructor() {
    // Create BullMQ worker
    this.worker = new Worker<ThumbnailJobData>(
      'thumbnail-processing',
      async (job) => {
        console.log(`🔄 Processing job ${job.id} for user ${job.data.userId}`);
        
        try {
          // Update job progress
          await job.updateProgress(10);
          
          // Process the thumbnail
          const result = await processThumbnailJob(job.data, (progress: number) => {
            return job.updateProgress(progress);
          });
          
          console.log(`✅ Job ${job.id} completed successfully`);
          return result;
          
        } catch (error) {
          console.error(`❌ Job ${job.id} failed:`, error);
          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: CONFIG.WORKER_CONCURRENCY,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );

    this.setupEventListeners();
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
