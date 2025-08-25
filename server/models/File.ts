import mongoose, { Schema } from 'mongoose';
import { IFile } from '../../src/types';

const fileSchema = new Schema<IFile>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true,
    unique: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  path: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  }
}, {
  timestamps: true
});

// Create indexes (filename index is already created by unique: true)
fileSchema.index({ userId: 1, createdAt: -1 });
fileSchema.index({ type: 1 });
fileSchema.index({ createdAt: -1 });

export const File = mongoose.model<IFile>('File', fileSchema);
