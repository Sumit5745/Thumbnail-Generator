import { Queue, QueueEvents } from 'bullmq';
import { redisConnection, redisPubSub } from '../config/redis';
import { CONFIG } from '../config/config';
import { ThumbnailJobData } from '../../src/types';

// Create thumbnail processing queue
export const thumbnailQueue = new Queue<ThumbnailJobData>('thumbnail-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: CONFIG.WORKER_MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: CONFIG.WORKER_BACKOFF_DELAY,
    },
    delay: 0,
  }
});

// Create queue events listener for real-time updates
export const thumbnailQueueEvents = new QueueEvents('thumbnail-processing', {
  connection: redisPubSub
});

// Add job to queue with per-user FIFO ordering
export async function addThumbnailJob(jobData: ThumbnailJobData): Promise<void> {
  try {
    // Get current queue length to ensure FIFO ordering
    const waitingJobs = await thumbnailQueue.getJobs(['waiting'], 0, -1);
    const activeJobs = await thumbnailQueue.getJobs(['active'], 0, -1);
    const totalJobs = waitingJobs.length + activeJobs.length;
    
    await thumbnailQueue.add(
      'process-thumbnail',
      jobData,
      {
        jobId: jobData.jobId,
        priority: totalJobs, // Lower number = higher priority for FIFO
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );

    console.log(`📋 Added thumbnail job ${jobData.jobId} for user ${jobData.userId} (queue position: ${totalJobs + 1})`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
    throw error;
  }
}

async function getUserQueueDelay(userId: string): Promise<number> {
  try {
    const waitingJobs = await thumbnailQueue.getJobs(['waiting'], 0, -1);
    const userJobs = waitingJobs.filter(job => job.data.userId === userId);
    return userJobs.length * 100;
  } catch (error) {
    console.error('Error calculating user queue delay:', error);
    return 0;
  }
}

export async function getQueueStats() {
  try {
    const waiting = await thumbnailQueue.getWaiting();
    const active = await thumbnailQueue.getActive();
    const completed = await thumbnailQueue.getCompleted();
    const failed = await thumbnailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0
    };
  }
}

export async function getUserJobs(userId: string) {
  try {
    const allJobs = await thumbnailQueue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, -1);
    return allJobs.filter(job => job.data.userId === userId);
  } catch (error) {
    console.error('Error getting user jobs:', error);
    return [];
  }
}

// Remove job from queue
export async function removeJob(jobId: string): Promise<boolean> {
  try {
    const job = await thumbnailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`🗑️ Removed job ${jobId} from queue`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing job from queue:', error);
    return false;
  }
}

// Clean up old jobs
export async function cleanupOldJobs(): Promise<void> {
  try {
    const completedJobs = await thumbnailQueue.getJobs(['completed'], 0, -1);
    const failedJobs = await thumbnailQueue.getJobs(['failed'], 0, -1);
    
    // Remove jobs older than 24 hours
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const job of [...completedJobs, ...failedJobs]) {
      if (job.timestamp < cutoffTime) {
        await job.remove();
        console.log(`🧹 Cleaned up old job ${job.id}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old jobs:', error);
  }
}

// Pause queue
export async function pauseQueue(): Promise<void> {
  await thumbnailQueue.pause();
  console.log('⏸️ Queue paused');
}

// Resume queue
export async function resumeQueue(): Promise<void> {
  await thumbnailQueue.resume();
  console.log('▶️ Queue resumed');
}

// Clean old jobs
export async function cleanQueue(): Promise<void> {
  try {
    // Clean completed jobs older than 1 day
    await thumbnailQueue.clean(24 * 60 * 60 * 1000, 100, 'completed');
    
    // Clean failed jobs older than 7 days
    await thumbnailQueue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed');
    
    console.log('🧹 Queue cleaned');
  } catch (error) {
    console.error('Error cleaning queue:', error);
  }
}

// Setup queue event listeners for real-time updates
export function setupQueueEventListeners() {
  thumbnailQueueEvents.on('completed', async ({ jobId, returnvalue }) => {
    try {
      console.log(`✅ Job ${jobId} completed`);
      
      // Get job data from database for complete info
      const { Job } = require('../models');
      const completedJob = await Job.findById(jobId).populate('thumbnails').lean();
      
      if (completedJob && completedJob.status === 'completed') {
        console.log(`✅ Job ${jobId} confirmed completed in database`);
        
        // Emit socket event for real-time updates
        redisPubSub.publish('job-completed', JSON.stringify({
          jobId,
          returnvalue: {
            thumbnails: completedJob.thumbnails?.map((thumb: any) => thumb.url) || []
          },
          status: 'completed',
          progress: 100
        }));
        
        console.log(`✅ Redis event published for completed job ${jobId}`);
      } else {
        console.log(`⚠️ Job ${jobId} not found or not completed in database, forcing completion`);
        
        // Force completion if job exists but status is wrong
        if (completedJob) {
          await Job.findByIdAndUpdate(jobId, {
            status: 'completed',
            progress: 100,
            completedAt: new Date()
          });
          
          // Emit completion event
          redisPubSub.publish('job-completed', JSON.stringify({
            jobId,
            returnvalue: {
              thumbnails: completedJob.thumbnails?.map((thumb: any) => thumb.url) || []
            },
            status: 'completed',
            progress: 100
          }));
        } else {
          // Fallback to basic completion event
          redisPubSub.publish('job-completed', JSON.stringify({ 
            jobId, 
            returnvalue,
            status: 'completed',
            progress: 100
          }));
        }
        
      }
    } catch (error) {
      console.error('Error in completed event handler:', error);
      // Fallback to basic completion event
      redisPubSub.publish('job-completed', JSON.stringify({ 
        jobId, 
        returnvalue,
        status: 'completed',
        progress: 100
      }));
    }
  });

  thumbnailQueueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      console.log(`❌ Job ${jobId} failed: ${failedReason}`);
      
      // Update job status in database
      const { Job } = require('../models');
      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: failedReason,
        completedAt: new Date()
      });
      
      // Emit socket event for real-time updates
      redisPubSub.publish('job-failed', JSON.stringify({ 
        jobId, 
        error: failedReason,
        status: 'failed',
        progress: 0
      }));
    } catch (error) {
      console.error('Error in failed event handler:', error);
      redisPubSub.publish('job-failed', JSON.stringify({ 
        jobId, 
        error: failedReason,
        status: 'failed',
        progress: 0
      }));
    }
  });

  thumbnailQueueEvents.on('active', ({ jobId }) => {
    console.log(`🔄 Job ${jobId} started processing`);
    // Emit socket event for real-time updates
    redisPubSub.publish('job-active', JSON.stringify({ 
      jobId,
      status: 'processing',
      progress: 0
    }));
  });

  thumbnailQueueEvents.on('progress', ({ jobId, data }) => {
    console.log(`📊 Job ${jobId} progress: ${data}%`);
    // Emit socket event for real-time updates
    redisPubSub.publish('job-progress', JSON.stringify({ 
      jobId, 
      progress: data,
      status: 'processing'
    }));
  });

  thumbnailQueueEvents.on('stalled', async ({ jobId }) => {
    try {
      console.warn(`⚠️ Job ${jobId} stalled, attempting recovery`);
      
      // Get stalled job and retry
      const stalledJob = await thumbnailQueue.getJob(jobId);
      if (stalledJob) {
        await stalledJob.retry();
        console.log(`🔄 Retried stalled job ${jobId}`);
      }
    } catch (error) {
      console.error('Error handling stalled job:', error);
    }
  });

  console.log('🎧 Queue event listeners setup complete');
}
