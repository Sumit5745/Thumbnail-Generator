'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { JobData } from '@/store/atoms';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  FileImage,
  Video,
  X
} from 'lucide-react';
import { Loader } from '@/components/ui/loader';

interface JobCardProps {
  job: JobData;
  onUpdate: (jobId: string, updates: Partial<JobData>) => void;
  onDelete: (jobId: string) => void;
  token?: string;
}

export function JobCard({ job, onUpdate, onDelete, token }: JobCardProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
      case 'queued':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getFileIcon = () => {
    return job.file.type === 'image' ? (
      <FileImage className="h-4 w-4 text-blue-500" />
    ) : (
      <Video className="h-4 w-4 text-purple-500" />
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return size + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const result = await api.jobs.retry(job._id, token);
      if (result.success) {
        onUpdate(job._id, { status: 'pending', progress: 0, error: undefined });
        toast.success('Job retry initiated');
      } else {
        throw new Error('Failed to retry job');
      }
    } catch (error) {
      toast.error('Failed to retry job');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await api.jobs.delete(job._id, token);
      if (result.success) {
        onDelete(job._id);
        toast.success('Job deleted successfully');
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (error) {
      toast.error('Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadThumbnail = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Thumbnail downloaded successfully');
    } catch (error) {
      toast.error('Failed to download thumbnail');
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-md border border-white/20 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg font-semibold text-white">
                {job.file.originalName}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                {getFileIcon()}
                <span>{formatFileSize(job.file.size)}</span>
                <span>•</span>
                <span>{formatDate(job.createdAt)}</span>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor()}>
            {job.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(job.status === 'processing' || job.status === 'pending' || job.status === 'queued') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-300">
              <span>Processing Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {job.status === 'failed' && job.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-400">{job.error}</p>
          </div>
        )}

        {/* Thumbnails */}
        {job.status === 'completed' && job.thumbnails && job.thumbnails.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Generated Thumbnails</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {job.thumbnails.map((thumbnail, index) => (
                <div key={thumbnail._id || index} className="relative group">
                  <div className="relative overflow-hidden rounded-lg border-2 border-white/20 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <img
                      src={thumbnail.url}
                      alt={`Thumbnail ${thumbnail.size}`}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadThumbnail(thumbnail.url, `${job.file.originalName}_${thumbnail.size}.jpg`)}
                          className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(thumbnail.url, '_blank')}
                          className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-center">
                    <span className="text-xs text-slate-400">{thumbnail.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {job.status === 'failed' && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRetrying ? (
                <Loader variant="dots" size="sm" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            size="sm"
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <Loader variant="dots" size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
