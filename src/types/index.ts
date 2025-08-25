/**
 * Core Types for Thumbnail Generation System
 * 
 * This file contains all the TypeScript interfaces and types used throughout
 * the application for type safety and better development experience.
 */

import { Document } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    _id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  token: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// File Types
export interface IFile extends Document {
  _id: string;
  userId: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  type: 'image' | 'video';
  createdAt: Date;
  updatedAt: Date;
}

export interface FileUploadData {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  type: 'image' | 'video';
}

// Job Types
export type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export interface IJob extends Document {
  _id: string;
  userId: string;
  fileId: string;
  status: JobStatus;
  progress: number;
  thumbnailSizes: string[];
  thumbnails: IThumbnail[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobCreateData {
  fileId: string;
  thumbnailSizes: string[];
}

export interface JobUpdateData {
  status?: JobStatus;
  progress?: number;
  thumbnails?: IThumbnail[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Thumbnail Types
export interface IThumbnail extends Document {
  _id: string;
  jobId: string;
  fileId: string;
  size: string;
  width: number;
  height: number;
  filename: string;
  path: string;
  url: string;
  createdAt: Date;
}

export interface ThumbnailCreateData {
  jobId: string;
  fileId: string;
  size: string;
  width: number;
  height: number;
  filename: string;
  path: string;
  url: string;
}

// Configuration Types
export interface ThumbnailSize {
  width: number;
  height: number;
}

export interface ThumbnailSizes {
  [key: string]: ThumbnailSize;
}

export interface AppConfig {
  mongodb: {
    uri: string;
    dbName: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  storage: {
    uploadDir: string;
    thumbnailDir: string;
    tempDir: string;
    maxFileSize: number;
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
  };
  thumbnails: {
    sizes: ThumbnailSizes;
    quality: number;
    format: string;
    videoThumbnailTime: string;
  };
  queue: {
    maxConcurrentJobs: number;
    jobAttempts: number;
    backoffDelay: number;
    cleanupInterval: number;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
  };
  ffmpeg: {
    path: string;
    probePath: string;
  };
  cleanup: {
    tempFilesInterval: number;
    oldFilesDays: number;
    failedJobsDays: number;
  };
}

// API Response Types (using the one defined above)

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Queue Job Data Types
export interface ThumbnailJobData {
  jobId: string;
  fileId: string;
  userId: string;
  filePath: string;
  fileType: 'image' | 'video';
  thumbnailSizes: string[];
  outputDir: string;
}

// Socket.IO Event Types
export interface SocketEvents {
  // Client to Server
  'join-room': (userId: string) => void;
  'leave-room': (userId: string) => void;
  
  // Server to Client
  'job-status-update': (data: {
    jobId: string;
    status: JobStatus;
    progress: number;
    error?: string;
  }) => void;
  
  'job-completed': (data: {
    jobId: string;
    thumbnails: IThumbnail[];
  }) => void;
  
  'job-failed': (data: {
    jobId: string;
    error: string;
  }) => void;
}

// Request/Response Types for API endpoints
export interface UploadRequest {
  files: Express.Multer.File[];
  thumbnailSizes?: string[];
}

export interface UploadResponse {
  jobs: {
    jobId: string;
    fileId: string;
    filename: string;
    status: JobStatus;
  }[];
}

export interface JobStatusResponse {
  job: IJob;
  file: IFile;
  thumbnails: IThumbnail[];
}

export interface UserJobsResponse {
  jobs: (IJob & {
    file: IFile;
    thumbnails: IThumbnail[];
  })[];
}

// Error Types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Frontend State Types (for Jotai)
export interface AppState {
  user: IUser | null;
  isAuthenticated: boolean;
  jobs: IJob[];
  files: IFile[];
  isLoading: boolean;
  error: string | null;
}

export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  uploadedFiles: string[];
  uploadError: string | null;
}

export interface JobState {
  activeJobs: Map<string, IJob>;
  completedJobs: IJob[];
  failedJobs: IJob[];
}

// Export all types
