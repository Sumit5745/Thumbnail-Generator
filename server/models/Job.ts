import mongoose, { Schema } from 'mongoose';
import { IJob, JobStatus } from '../../src/types';

const jobSchema = new Schema<IJob>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  fileId: {
    type: String,
    required: true,
    ref: 'File'
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  thumbnailSizes: [{
    type: String,
    required: true
  }],
  thumbnails: [{
    type: Schema.Types.ObjectId,
    ref: 'Thumbnail'
  }],
  error: {
    type: String
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create indexes
jobSchema.index({ userId: 1, status: 1, createdAt: -1 });
jobSchema.index({ fileId: 1 });
jobSchema.index({ status: 1, createdAt: 1 });
jobSchema.index({ createdAt: -1 });

// Update completedAt when status changes to completed
jobSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status === 'processing' && !this.startedAt) {
      this.startedAt = new Date();
    }
  }
  next();
});

export const Job = mongoose.model<IJob>('Job', jobSchema);
