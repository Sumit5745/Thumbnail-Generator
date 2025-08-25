'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Eye, 
  RefreshCw, 
  Trash2, 
  Image, 
  Video, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface JobCardProps {
  job: {
    _id: string;
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    createdAt: string;
    thumbnails?: Array<{
      url: string;
      filename: string;
    }>;
  };
  file: {
    originalName: string;
    type: 'image' | 'video';
    size: number;
  };
  onRetry?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

export function JobCard({ job, file, onRetry, onDelete }: JobCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'queued':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = async (thumbnailUrl: string, filename: string) => {
    try {
      const response = await fetch(thumbnailUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Thumbnail downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download thumbnail');
    }
  };

  const handleView = (thumbnailUrl: string) => {
    window.open(thumbnailUrl, '_blank');
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry(job._id);
      toast.success('Job queued for retry');
    } catch (error) {
      toast.error('Failed to retry job');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(job._id);
      toast.success('Job deleted successfully');
    } catch (error) {
      toast.error('Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {file.type === 'image' ? (
              <Image className="h-5 w-5 text-blue-500" />
            ) : (
              <Video className="h-5 w-5 text-purple-500" />
            )}
            <CardTitle className="text-lg truncate">{file.originalName}</CardTitle>
          </div>
          <Badge className={cn('flex items-center space-x-1', getStatusColor(job.status))}>
            {getStatusIcon(job.status)}
            <span className="capitalize">{job.status}</span>
          </Badge>
        </div>
        <div className="text-sm text-gray-500">
          {formatFileSize(file.size)} • {formatDate(job.createdAt)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(job.status === 'processing' || job.status === 'queued') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="w-full" />
          </div>
        )}

        {/* Error Message */}
        {job.status === 'failed' && job.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{job.error}</p>
          </div>
        )}

        {/* Thumbnails */}
        {job.status === 'completed' && job.thumbnails && job.thumbnails.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Generated Thumbnails</h4>
            <div className="grid grid-cols-2 gap-3">
              {job.thumbnails.map((thumbnail, index) => (
                <div key={index} className="relative group">
                  <img
                    src={thumbnail.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleView(thumbnail.url)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(thumbnail.url, thumbnail.filename)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2">
          {job.status === 'failed' && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
