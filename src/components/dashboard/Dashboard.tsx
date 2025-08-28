'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  Clock,
  RefreshCw,
  User,
  LogOut,
  Crown,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileImage,
  Eye,
  Download,
  X,
  ImageIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  authAtom,
  jobsAtom,
  jobStatsAtom,
  logoutActionAtom,
  addJobsActionAtom,
  removeJobActionAtom,
  updateJobActionAtom,
  JobData
} from '@/store/atoms';
import { DashboardStats } from './DashboardStats';
import { FileUpload } from '../upload/FileUpload';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/api';
import { Loader } from '@/components/ui/loader';

interface FileUpload {
  id: string;
  file: File | { name: string; size: number };
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error' | 'queued';
  progress: number;
  jobId?: string;
  error?: string;
  thumbnails?: Array<{
    id: string;
    url: string;
    size: string;
    format: string;
  }>;
}

interface ProcessedFile {
  _id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  thumbnails: Array<{
    _id: string;
    url: string;
    size: string;
  }>;
  status: string;
  createdAt: string;
}

export function Dashboard() {
  // Authentication state
  const [auth, setAuth] = useAtom(authAtom);
  const [, logout] = useAtom(logoutActionAtom);

  // Jobs state
  const [jobs, setJobs] = useAtom(jobsAtom);
  const [, addJobs] = useAtom(addJobsActionAtom);
  const [, removeJob] = useAtom(removeJobActionAtom);
  const [, updateJob] = useAtom(updateJobActionAtom);
  const jobStats = useAtomValue(jobStatsAtom);

  // Local state
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clean up current uploads - remove completed files
  const cleanupCurrentUploads = useCallback(() => {
    setFiles(prev => {
      const activeFiles = prev.filter(file =>
        ['pending', 'queued', 'processing'].includes(file.status)
      );
      console.log('🧹 Cleaned up current uploads, removed completed files');
      return activeFiles;
    });
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!auth.token || !auth.isAuthenticated) return;

    const newSocket = io(getSocketUrl(), {
      auth: {
        token: auth.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      // Join user room for targeted updates
      if (auth.user?._id) {
        newSocket.emit('join-room', auth.user._id);
        console.log(`👥 Joined user room: user:${auth.user._id}`);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      toast.error('Connection error. Trying to reconnect...');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      toast.success('Connection restored!');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
    });

    newSocket.on('job-status-update', (data) => {
      console.log('🔄 Socket: job-status-update received:', data);
      if (data.jobId !== 'connection') {
        updateJob({ ...data, _id: data.jobId });
        syncCurrentFiles(data);
      }
    });

    newSocket.on('job-completed', (data) => {
      console.log('✅ Socket: job-completed received:', data);

      try {
        // Update the job in global state with full job data
        updateJob({
          _id: data.jobId,
          status: 'completed',
          progress: 100,
          thumbnails: data.returnvalue?.thumbnails || data.thumbnails || []
        });

        // Immediately remove completed files from current uploads
        setFiles(prev => {
          const filtered = prev.filter(file => file.jobId !== data.jobId);
          console.log('🗑️ Removed completed file from current uploads:', data.jobId);
          return filtered;
        });

        // Update processed files state directly
        setProcessedFiles(prev => {
          const newProcessedFile = {
            _id: data.jobId,
            originalName: data.file?.originalName || data.originalName || 'Unknown File',
            fileType: data.file?.mimetype || data.fileType || 'unknown',
            fileSize: data.file?.size || data.fileSize || 0,
            thumbnails: (data.returnvalue?.thumbnails || data.thumbnails || []).map((thumb: any, index: number) => ({
              _id: thumb?._id || thumb?.id || `thumb-${index}`,
              url: typeof thumb === 'string' ? thumb : thumb.url || '',
              size: typeof thumb === 'object' ? thumb.size || '128x128' : '128x128'
            })),
            status: 'completed',
            createdAt: new Date().toISOString()
          };

          console.log('📁 Adding completed job to history:', newProcessedFile);
          return [newProcessedFile, ...prev];
        });

        // Show success toast
        toast.success('File processing completed successfully! Check Processing History for your thumbnails.');
      } catch (error) {
        console.error('Error handling job completion:', error);
        // Fallback: refresh data
        setTimeout(() => {
          loadJobs();
          fetchProcessedFiles();
        }, 1000);
      }
    });

    newSocket.on('job-failed', (data) => {
      console.log('❌ Socket: job-failed received:', data);
      updateJob({ ...data, _id: data.jobId, status: 'failed' });
      syncCurrentFiles({ ...data, status: 'failed' });
    });

    newSocket.on('job-active', (data) => {
      console.log('🔄 Socket: job-active received:', data);
      updateJob({ ...data, _id: data.jobId, status: 'processing', progress: 0 });
      syncCurrentFiles({ ...data, status: 'processing', progress: 0 });
    });

    newSocket.on('job-progress', (data) => {
      console.log('📊 Socket: job-progress received:', data);
      updateJob({ ...data, _id: data.jobId, status: 'processing', progress: data.progress });
      syncCurrentFiles({ ...data, status: 'processing', progress: data.progress });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [auth.token, auth.isAuthenticated, auth.user?._id, updateJob]);

  // Load initial data
  useEffect(() => {
    if (auth.token && auth.isAuthenticated) {
      console.log('🔄 Initial data load triggered');
      loadJobs();
      fetchProcessedFiles();
      cleanupCurrentUploads();
    }
  }, [auth.token, auth.isAuthenticated, cleanupCurrentUploads]);

  // Debug effect to log state changes
  useEffect(() => {
    console.log('📊 Current job stats:', jobStats);
    console.log('📁 Current files count:', files.length);
    console.log('📋 Current processed files count:', processedFiles.length);
  }, [jobStats, files.length, processedFiles.length]);

  // Periodic refresh to ensure UI stays in sync (less frequent)
  useEffect(() => {
    if (!auth.token || !auth.isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('🔄 Background sync triggered');
      loadJobs();
      fetchProcessedFiles();
      cleanupCurrentUploads();
    }, 30000); // Refresh every 30 seconds for background sync only

    return () => clearInterval(interval);
  }, [auth.token, auth.isAuthenticated, cleanupCurrentUploads]);

  // Load jobs from API
  const loadJobs = async () => {
    if (!auth.token) return;

    try {
      setIsLoading(true);
      const result = await api.jobs.getAll(auth.token);
      console.log('🔄 loadJobs - API result:', result);

      if (result.success && result.data) {
        // Handle the nested response structure from the API
        const jobsData = result.data.jobs || result.data;

        if (Array.isArray(jobsData)) {
          console.log('📊 Raw jobs data sample:', jobsData[0]);

          // Transform job data to match JobData type
          const transformedJobs: JobData[] = jobsData.map((job: any) => {
            console.log('🔄 Transforming job:', job._id, 'Status:', job.status, 'File:', job.file);

            return {
              _id: job._id,
              status: (job.status || 'pending') as 'pending' | 'queued' | 'processing' | 'completed' | 'failed',
              progress: job.progress || 0,
              error: job.error,
              createdAt: typeof job.createdAt === 'string' ? job.createdAt : job.createdAt?.toISOString() || new Date().toISOString(),
              thumbnails: job.thumbnails?.map((thumb: any) => ({
                _id: thumb._id || thumb.id || `thumb-${job._id}`,
                url: typeof thumb === 'string' ? thumb : thumb.url || '',
                filename: typeof thumb === 'string' ? `thumb_${job._id}.jpg` : thumb.filename || `thumb_${job._id}.jpg`,
                size: typeof thumb === 'object' ? thumb.size || '128x128' : '128x128'
              })) || [],
              file: {
                _id: job.fileId || job.file?._id || job._id,
                originalName: job.file?.originalName || 'Unknown File',
                filename: job.file?.filename || job.file?.originalName || 'Unknown File',
                type: (job.file?.type || (job.file?.mimetype?.startsWith('image/') ? 'image' : 'video')) as 'image' | 'video',
                size: job.file?.size || 0
              }
            };
          });

          console.log('📊 Transformed jobs:', transformedJobs);

          // Add all jobs to global state for stats calculation
          addJobs(transformedJobs);

          // Update local files state for current uploads display
          const currentFiles = transformedJobs
            .filter((job: any) => ['pending', 'queued', 'processing'].includes(job.status))
            .map((job: any) => ({
              id: job._id,
              file: {
                name: job.file.originalName,
                size: job.file.size
              },
              status: job.status || 'processing',
              progress: job.status === 'processing' ? 50 : 0,
              jobId: job._id,
              error: job.status === 'failed' ? 'Processing failed' : undefined,
              thumbnails: job.thumbnails?.map((thumb: any, index: number) => {
                // Handle different thumbnail data formats
                let thumbnailUrl = '';
                if (typeof thumb === 'string') {
                  thumbnailUrl = thumb.startsWith('http') ? thumb : `http://127.0.0.1:3000${thumb}`;
                } else if (thumb && typeof thumb === 'object') {
                  thumbnailUrl = thumb.url?.startsWith('http') ? thumb.url : `http://127.0.0.1:3000${thumb.url || ''}`;
                } else {
                  console.warn('Invalid thumbnail data format:', thumb);
                  thumbnailUrl = '';
                }

                return {
                  id: thumb?._id || thumb?.id || `thumb-${index}`,
                  url: thumbnailUrl,
                  size: thumb?.size || '128x128',
                  format: 'jpg'
                };
              }) || []
            }));

          console.log('🔄 loadJobs - API result data:', jobsData);
          console.log('📁 loadJobs - Filtered current files:', currentFiles);

          // Replace current files with fresh data from API
          setFiles(currentFiles);
          console.log('📊 loadJobs - Updated files state:', currentFiles);
        }
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast.error('Failed to load jobs. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch processed files
  const fetchProcessedFiles = async () => {
    if (!auth.token) return;

    try {
      console.log('🔄 fetchProcessedFiles called');
      const result = await api.jobs.getAll(auth.token);
      console.log('📊 fetchProcessedFiles - API result:', result);

      if (result.success && result.data) {
        // Handle the nested response structure from the API
        const jobsData = result.data.jobs || result.data;

        if (Array.isArray(jobsData)) {
          const completedJobs = jobsData.filter((job: any) => job.status === 'completed');
          console.log('📁 fetchProcessedFiles - Completed jobs count:', completedJobs.length);
          console.log('📁 fetchProcessedFiles - Raw job data sample:', jobsData[0]);

          const processedData = completedJobs.map((job: any) => {
            console.log('📁 Processing completed job for history:', job._id, job.file);
            return {
              _id: job._id,
              originalName: job.file?.originalName || 'Unknown File',
              fileType: job.file?.mimetype || 'unknown',
              fileSize: job.file?.size || 0,
              thumbnails: job.thumbnails?.map((thumb: any, index: number) => {
                // Handle different thumbnail data formats
                let thumbnailUrl = '';
                if (typeof thumb === 'string') {
                  thumbnailUrl = thumb.startsWith('http') ? thumb : `http://127.0.0.1:3000${thumb}`;
                } else if (thumb && typeof thumb === 'object') {
                  thumbnailUrl = thumb.url?.startsWith('http') ? thumb.url : `http://127.0.0.1:3000${thumb.url || ''}`;
                } else {
                  console.warn('Invalid thumbnail data format:', thumb);
                  thumbnailUrl = '';
                }

                return {
                  _id: thumb?._id || thumb?.id || `thumb-${index}`,
                  url: thumbnailUrl,
                  size: thumb?.size || '128x128'
                };
              }) || [],
              status: job.status || 'pending',
              createdAt: job.createdAt || new Date().toISOString()
            };
          });

          console.log('📁 fetchProcessedFiles - Processed data:', processedData);
          setProcessedFiles(processedData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch processed files:', error);
      toast.error('Failed to load processing history. Please try refreshing the page.');
    }
  };

  // Sync current files with job updates
  const syncCurrentFiles = useCallback((data: any) => {
    console.log('🔄 syncCurrentFiles called with:', data);

    setFiles(prev => {
      // If job is completed, remove it from current uploads
      if (data.status === 'completed') {
        const filtered = prev.filter(file => file.jobId !== data.jobId);
        console.log('🗑️ Removed completed file from current uploads:', data.jobId);
        return filtered;
      }

      // Otherwise, update the file status
      const updatedFiles = prev.map(file => {
        if (file.jobId === data.jobId) {
          console.log(`📊 Updating file ${file.jobId} with status: ${data.status}`);
          return {
            ...file,
            status: data.status || 'processing',
            progress: data.status === 'completed' ? 100 : file.progress,
            thumbnails: data.thumbnails?.map((thumb: any, index: number) => {
              // Handle different thumbnail data formats
              let thumbnailUrl = '';
              if (typeof thumb === 'string') {
                thumbnailUrl = thumb.startsWith('http') ? thumb : `http://127.0.0.1:3000${thumb}`;
              } else if (thumb && typeof thumb === 'object') {
                thumbnailUrl = thumb.url?.startsWith('http') ? thumb.url : `http://127.0.0.1:3000${thumb.url || ''}`;
              } else {
                console.warn('Invalid thumbnail data format:', thumb);
                thumbnailUrl = '';
              }

              return {
                id: thumb?._id || thumb?.id || `thumb-${index}`,
                url: thumbnailUrl,
                size: thumb?.size || '128x128',
                format: 'jpg'
              };
            }) || []
          };
        }
        return file;
      });

      console.log('📊 Updated files after sync:', updatedFiles);
      return updatedFiles;
    });

    // If job is completed, refresh processed files to show in history
    if (data.status === 'completed') {
      console.log('🔄 Job completed, refreshing processed files...');
      setTimeout(() => {
        fetchProcessedFiles();
      }, 500);
    }
  }, []);

  // Handle upload completion
  const handleUploadComplete = useCallback((uploadedJobs: any[]) => {
    console.log('🔄 handleUploadComplete called with:', uploadedJobs);

    // Convert job objects to FileUpload objects
    const fileUploads: FileUpload[] = uploadedJobs.map((job: any) => ({
      id: job.jobId || job._id,
      file: {
        name: job.filename || job.originalName || 'Unknown File',
        size: job.fileSize || job.size || 0
      },
      status: job.status || 'uploading',
      progress: 0,
      jobId: job.jobId || job._id,
      thumbnails: []
    }));

    console.log('📁 Converted to FileUpload objects:', fileUploads);

    setFiles(prev => {
      const newFiles = [...prev, ...fileUploads];
      console.log('📊 Updated files state:', newFiles);
      return newFiles;
    });

    setShowUpload(false);
    loadJobs();
    fetchProcessedFiles();
  }, []);

  // Handle retry job
  const handleRetryJob = async (jobId: string) => {
    if (!auth.token) return;

    try {
      const result = await api.jobs.retry(jobId, auth.token);
      if (result.success) {
        toast.success('Job retry initiated');
        loadJobs();
      } else {
        const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to retry job';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Failed to retry job');
    }
  };

  // Handle delete job
  const handleDeleteJob = async (jobId: string) => {
    if (!auth.token) return;

    try {
      const result = await api.jobs.delete(jobId, auth.token);
      if (result.success) {
        toast.success('Job deleted successfully');
        removeJob(jobId);
        setFiles(prev => prev.filter(file => file.jobId !== jobId));
        fetchProcessedFiles();
      } else {
        const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to delete job';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    loadJobs();
    fetchProcessedFiles();
    cleanupCurrentUploads();
    toast.success('Dashboard refreshed successfully!');
  }, [loadJobs, fetchProcessedFiles, cleanupCurrentUploads]);

  // WebSocket-driven updates - no frequent API calls needed

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const downloadThumbnail = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    if (socket) {
      socket.disconnect();
    }
  };

  // Remove file from current uploads
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Force refresh processed files
  const forceRefreshProcessedFiles = useCallback(() => {
    console.log('🔄 Forcing processed files refresh...');
    fetchProcessedFiles();
    toast.success('Processing history refreshed!');
  }, [fetchProcessedFiles]);

  if (!auth.isAuthenticated || !auth.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center text-white" suppressHydrationWarning>
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" suppressHydrationWarning>
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Thumbnail Generator Pro
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <User className="w-4 h-4" />
                <span>Welcome back, {auth.user.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isLoading}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  {isLoading ? (
                    <Loader variant="dots" size="sm" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>

                <Button
                  onClick={() => setShowUpload(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" suppressHydrationWarning>
        {/* Stats */}
        <DashboardStats
          stats={{
            total: jobStats.total,
            completed: jobStats.completed,
            processing: jobStats.processing,
            failed: jobStats.failed
          }}
        />

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Upload Files</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpload(false)}
                    className="text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  token={auth.token || undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="uploads" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border border-white/20">
              <TabsTrigger value="uploads" className="text-white data-[state=active]:bg-white/20">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="history" className="text-white data-[state=active]:bg-white/20">
                <Clock className="h-4 w-4 mr-2" />
                Processing History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="uploads" className="space-y-6">
              {files.length === 0 ? (
                <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                  <CardContent className="text-center py-12">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold text-white mb-2">No files uploaded yet</h3>
                    <p className="text-slate-400 mb-6">Upload your first file to get started</p>
                    <Button
                      onClick={() => setShowUpload(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">
                        Current Uploads ({files.length})
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {files.filter(fileUpload => fileUpload && fileUpload.file).map((fileUpload, index) => (
                        <div
                          key={fileUpload.id || `file-${index}`}
                          className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-xl hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              {getStatusIcon(fileUpload.status)}
                              <div>
                                <p className="font-semibold text-white">{fileUpload.file.name}</p>
                                <p className="text-sm text-slate-300">
                                  {formatFileSize(fileUpload.file.size)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={`transition-all duration-300 ${fileUpload.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                  fileUpload.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                    fileUpload.status === 'uploaded' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                      fileUpload.status === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
                              >
                                {fileUpload.status === 'uploaded' ? `Queued (${index + 1})` : fileUpload.status}
                              </Badge>
                              {fileUpload.status === 'error' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetryJob(fileUpload.jobId!)}
                                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
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
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileUpload.id)}
                                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              >
                                {isDeleting ? (
                                  <Loader variant="dots" size="sm" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {(fileUpload.status === 'uploading' || fileUpload.status === 'processing') && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm text-slate-300">
                                <span>Progress</span>
                                <span>{fileUpload.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${fileUpload.progress}%` }}
                                ></div>
                              </div>
                              <div className="flex items-center justify-center mt-2">
                                <Loader variant="wave" size="sm" className="mr-2" />
                                <span className="text-xs text-slate-400">
                                  {fileUpload.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Thumbnails */}
                          {fileUpload.thumbnails && fileUpload.thumbnails.length > 0 && (
                            <div className="mt-6">
                              <h4 className="text-sm font-medium text-white mb-3">Generated Thumbnails</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {fileUpload.thumbnails.map((thumbnail, thumbIndex) => (
                                  <div key={thumbnail.id || `thumb-${index}-${thumbIndex}`} className="relative group">
                                    <div className="relative overflow-hidden rounded-xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                                      <img
                                        src={thumbnail.url}
                                        alt={`Thumbnail ${thumbnail.size}`}
                                        className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-110"
                                        onError={(e) => {
                                          console.error('Failed to load thumbnail:', thumbnail.url);
                                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik02NCAzMkM0Ny40MyAzMiAzNCA0NS40MyAzNCA2NEMzNCA4Mi41NyA0Ny40MyA5NiA2NCA5NkM4MC41NyA5NiA5NCA4Mi41NyA5NCA2NEM5NCA0NS40MyA4MC41NyAzMiA2NCAzMloiIGZpbGw9IiM2QjcyODAiLz4KPHBhdGggZD0iTTY0IDQ4QzU1LjE2IDQ4IDQ4IDU1LjE2IDQ4IDY0QzQ4IDcyLjg0IDU1LjE2IDgwIDY0IDgwQzcyLjg0IDgwIDgwIDcyLjg0IDgwIDY0QzgwIDU1LjE2IDcyLjg0IDQ4IDY0IDQ4WiIgZmlsbD0iIzMzNDE1NSIvPgo8L3N2Zz4K';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => window.open(thumbnail.url, '_blank')}
                                            className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => downloadThumbnail(thumbnail.url, `${fileUpload.file.name}_${thumbnail.size}.jpg`)}
                                            className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                                          >
                                            <Download className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 text-center">{thumbnail.size}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Show completed status for completed files */}
                          {fileUpload.status === 'completed' && (!fileUpload.thumbnails || fileUpload.thumbnails.length === 0) && (
                            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-400" />
                                <p className="text-sm text-green-400">Processing completed successfully</p>
                              </div>
                            </div>
                          )}

                          {/* Error Message */}
                          {fileUpload.error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <p className="text-sm text-red-400">{fileUpload.error}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="h-5 w-5" />
                    Processing History
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={forceRefreshProcessedFiles}
                      className="ml-auto text-white border-white/20 hover:bg-white/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh History
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {processedFiles.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <h3 className="text-lg font-semibold text-white mb-2">No processing history</h3>
                        <p className="text-slate-400 mb-4">Your processed files will appear here</p>
                        <div className="text-xs text-slate-500">
                          <p>Debug: Job stats show {jobStats.completed} completed jobs</p>
                          <p>Debug: Current files count: {files.length}</p>
                          <p>Debug: Processed files count: {processedFiles.length}</p>
                        </div>
                      </div>
                    ) : (
                      processedFiles.map((file, index) => (
                        <div key={file._id || `processed-${index}`} className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-xl hover:-translate-y-1 transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                                <ImageIcon className="h-5 w-5 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-white">{file.originalName}</p>
                                <p className="text-sm text-slate-300">
                                  {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(file.status)}>
                              {file.status}
                            </Badge>
                          </div>

                          {file.thumbnails && file.thumbnails.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {file.thumbnails.map((thumbnail, thumbIndex) => (
                                <div key={thumbnail._id || `thumb-${index}-${thumbIndex}`} className="relative group">
                                  <div className="relative overflow-hidden rounded-xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                                    <img
                                      src={thumbnail.url}
                                      alt={`Thumbnail ${thumbnail.size}`}
                                      className="w-full h-32 object-cover rounded-lg"
                                      onError={(e) => {
                                        console.error('Failed to load thumbnail:', thumbnail.url);
                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik02NCAzMkM0Ny40MyAzMiAzNCA0NS40MyAzNCA2NEMzNCA4Mi41NyA0Ny40MyA5NiA2NCA5NkM4MC41NyA5NiA5NCA4Mi41NyA5NCA2NEM5NCA0NS40MyA4MC41NyAzMiA2NCAzMloiIGZpbGw9IiM2QjcyODAiLz4KPHBhdGggZD0iTTY0IDQ4QzU1LjE2IDQ4IDQ4IDU1LjE2IDQ4IDY0QzQ4IDcyLjg0IDU1LjE2IDgwIDY0IDgwQzcyLjg0IDgwIDgwIDcyLjg0IDgwIDY0QzgwIDU1LjE2IDcyLjg0IDQ4IDY0IDQ4WiIgZmlsbD0iIzMzNDE1NSIvPgo8L3N2Zz4K';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => window.open(thumbnail.url, '_blank')}
                                          className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          View
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => downloadThumbnail(thumbnail.url, `${file.originalName}_${thumbnail.size}.jpg`)}
                                          className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-2 text-center">{thumbnail.size}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileImage className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                              <p className="text-slate-400">No thumbnails available</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

