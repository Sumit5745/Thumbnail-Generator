import mongoose, { Schema } from 'mongoose';
import { IThumbnail } from '../../src/types';

const thumbnailSchema = new Schema<IThumbnail>({
  jobId: {
    type: String,
    required: true,
    ref: 'Job'
  },
  fileId: {
    type: String,
    required: true,
    ref: 'File'
  },
  size: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    required: true,
    min: 1
  },
  height: {
    type: Number,
    required: true,
    min: 1
  },
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create indexes
thumbnailSchema.index({ jobId: 1 });
thumbnailSchema.index({ fileId: 1 });
thumbnailSchema.index({ size: 1 });
thumbnailSchema.index({ createdAt: -1 });

export const Thumbnail = mongoose.model<IThumbnail>('Thumbnail', thumbnailSchema);
