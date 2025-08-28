'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, File, Image, Video, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Loader } from '@/components/ui/loader';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface FileUploadProps {
  onUploadComplete: (jobs: any[]) => void;
  className?: string;
  token?: string;
}

const ACCEPTED_FILE_TYPES = {
  'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
  'video/quicktime': ['.mov']
};

const MAX_FILES = 10;

export function FileUpload({ onUploadComplete, className, token }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach((file) => {
      const { errors } = file;
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`File ${file.file.name} is too large. Maximum size is 100MB.`);
        } else if (error.code === 'file-invalid-type') {
          toast.error(`File ${file.file.name} has an invalid type. Only images and videos are allowed.`);
        } else {
          toast.error(`Error with file ${file.file.name}: ${error.message}`);
        }
      });
    });

    // Check for duplicate files
    const existingFileNames = files.map(f => f.name.toLowerCase());
    const duplicates = acceptedFiles.filter(file =>
      existingFileNames.includes(file.name.toLowerCase())
    );

    if (duplicates.length > 0) {
      toast.warning(`Duplicate files detected: ${duplicates.map(f => f.name).join(', ')}. These files will be skipped.`);
    }

    // Filter out duplicates
    const uniqueFiles = acceptedFiles.filter(file =>
      !existingFileNames.includes(file.name.toLowerCase())
    );

    // Process accepted files
    const newFiles = uniqueFiles.map((file) => {
      const fileWithPreview = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
      return fileWithPreview;
    });

    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed. Some files were not added.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: 100 * 1024 * 1024,
    maxFiles: MAX_FILES,
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const updated = prev.filter((file) => file.id !== fileId);
      // Revoke object URLs to prevent memory leaks
      const fileToRemove = prev.find((file) => file.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Calculate total file size for better progress indication
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

      console.log(`📤 Starting upload of ${files.length} files (${totalSizeMB}MB total)`);

      // Use real progress tracking with XMLHttpRequest
      const result = await api.upload.multiple(formData, token, (progress) => {
        setUploadProgress(progress);
        console.log(`📊 Upload progress: ${progress}%`);
      });

      if (result.success && result.data) {
        setUploadProgress(100);
        toast.success(`${result.data.jobs.length} files uploaded successfully! (${totalSizeMB}MB)`);
        onUploadComplete(result.data.jobs);

        files.forEach(file => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
        setFiles([]);
      } else {
        const errorMessage = typeof result.error === 'string' ? result.error : 'Upload failed';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);

      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes('timeout')) {
        toast.error('Upload timed out. Please try with smaller files or check your connection.');
      } else if (error instanceof Error && error.message.includes('cancelled')) {
        toast.error('Upload was cancelled. Please try again.');
      } else if (error instanceof Error && error.message.includes('Network error')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(error instanceof Error ? error.message : 'An error occurred during upload');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-white/30 hover:border-white/50 hover:bg-white/5'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-white/60 mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-300">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-white mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-slate-300">
                  Support for images and videos up to 100MB each (max {MAX_FILES} files)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border border-white/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Selected Files ({files.length})</h3>
                <Button
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader variant="dots" size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-300">
                        Uploading {files.length} file{files.length > 1 ? 's' : ''}...
                      </span>
                      <span className="text-sm text-slate-400">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="w-full h-3" />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      {(files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2)}MB total
                    </span>
                    <span>
                      {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      getFileIcon(file)
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-300">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="capitalize">
                          {file.type.split('/')[1]} {file.type.startsWith('image/') ? 'Image' : 'Video'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
