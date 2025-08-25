'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useDropzone } from 'react-dropzone';
import {
  jobsAtom,
  filteredJobsAtom,
  jobStatsAtom,
  dashboardFiltersAtom,
  updateJobActionAtom,
  removeJobActionAtom,
  addJobsActionAtom,
  userAtom,
  tokenAtom,
  logoutActionAtom,
  JobData
} from '@/store/atoms';
import { FileUpload } from '@/components/upload/FileUpload';
import { JobCard } from './JobCard';
import { DashboardStats } from './DashboardStats';
import { DashboardFilters } from './DashboardFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  RefreshCw,
  Upload,
  LogOut,
  Sparkles,
  Zap,
  Star,
  Wand2,
  Rocket,
  Palette,
  Image as ImageIcon,
  Play,
  Settings,
  BarChart3,
  TrendingUp,
  Layers,
  Cpu,
  Gauge,
  Download,
  Eye,
  Trash2,
  FileImage,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Crown,
  Gem,
  Flame,
  Bolt,
  Image
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api, getSocketUrl } from '@/lib/api';



// File upload interfaces
interface FileUpload {
  id: string;
  jobId?: string; // Add jobId to track the backend job
  file: File;
  progress: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';
  thumbnails?: Array<{
    id: string;
    url: string;
    size: string;
    format: string;
  }>;
  error?: string;
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
    format: string;
  }>;
  status: string;
  createdAt: string;
}

export function Dashboard() {
  const [jobs, setJobs] = useAtom(jobsAtom);
  const [filteredJobs] = useAtom(filteredJobsAtom);
  const [jobStats] = useAtom(jobStatsAtom);
  const [filters, setFilters] = useAtom(dashboardFiltersAtom);
  const [, updateJob] = useAtom(updateJobActionAtom);
  const [, removeJob] = useAtom(removeJobActionAtom);
  const [, addJobs] = useAtom(addJobsActionAtom);
  const [user] = useAtom(userAtom);
  const [token] = useAtom(tokenAtom);
  const [, logout] = useAtom(logoutActionAtom);

  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);

  // Fetch processed files on component mount
  useEffect(() => {
    if (user) {
      fetchProcessedFiles();
    }
  }, [user]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token || !user || socket) return; // Prevent multiple connections

    console.log('🔌 Initializing Socket.IO connection...');
    const socketInstance = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
      socketInstance.emit('join-room', user._id);
    });

    // Handle file upload progress
    socketInstance.on('job-progress', (data: any) => {
      console.log('📊 Received job-progress:', data);
      setFiles(prev => prev.map(file =>
        file.jobId === data.jobId
          ? { ...file, progress: data.progress, status: 'processing' }
          : file
      ));
    });

    // Handle job active (when processing starts)
    socketInstance.on('job-active', (data: any) => {
      console.log('🔄 Received job-active:', data);
      setFiles(prev => prev.map(file =>
        file.jobId === data.jobId
          ? { ...file, status: 'processing', progress: 0 }
          : file
      ));
    });

    // Handle job completion
    socketInstance.on('job-completed', (data: any) => {
      console.log('✅ Received job-completed:', data);
      setFiles(prev => prev.map(file =>
        file.jobId === data.jobId
          ? { ...file, status: 'completed', thumbnails: data.thumbnails }
          : file
      ));

      // Update job state
      updateJob({
        _id: data.jobId,
        status: 'completed',
        progress: 100,
        thumbnails: data.thumbnails
      });

      // Refresh processed files list
      fetchProcessedFiles();
      toast.success('✨ Thumbnails generated successfully!');
    });

    // Handle job failure
    socketInstance.on('job-failed', (data: any) => {
      console.log('❌ Received job-failed:', data);
      setFiles(prev => prev.map(file =>
        file.jobId === data.jobId
          ? { ...file, status: 'error', error: data.error || 'Processing failed' }
          : file
      ));

      updateJob({
        _id: data.jobId,
        status: 'failed',
        progress: 0,
        error: data.error
      });

      toast.error(`❌ Failed to process file: ${data.error}`);
    });

    socketInstance.on('job-status-update', (data) => {
      if (data.jobId !== 'connection') {
        updateJob({
          _id: data.jobId,
          status: data.status,
          progress: data.progress,
          error: data.error
        });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO');
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [token, user]); // Removed updateJob from dependencies

  const fetchProcessedFiles = async () => {
    if (!token) return;
    try {
      const response = await api.jobs.getAll(token);
      if (response.success && response.data) {
        // Transform the jobs data to match ProcessedFile interface
        const processedFiles: ProcessedFile[] = response.data.jobs.map(job => ({
          _id: job.file.id,
          originalName: job.file.filename,
          fileSize: job.file.size,
          fileType: job.file.mimetype || 'application/octet-stream',
          status: job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'error' : 'processing',
          createdAt: typeof job.createdAt === 'string' ? job.createdAt : new Date().toISOString(),
          thumbnails: job.thumbnails?.map(thumb => ({
            _id: thumb.id,
            url: thumb.url,
            size: thumb.size || 'medium',
            format: 'image/jpeg'
          })) || []
        }));
        setProcessedFiles(processedFiles);
      }
    } catch (error) {
      console.error('Failed to fetch processed files:', error);
    }
  };

  // Load initial jobs
  useEffect(() => {
    if (user && token) {
      loadJobs();
    }
  }, [user, token]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const result = await api.jobs.getAll(token || undefined);
      if (result.success && result.data) {
        setJobs(result.data.jobs as any);
      } else {
        toast.error('Failed to load jobs');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (uploadedJobs: any[]) => {
    console.log('📤 Upload completed, received jobs:', uploadedJobs);

    // Convert uploaded jobs to JobData format
    const newJobs: JobData[] = uploadedJobs.map(job => ({
      _id: job.jobId,
      status: (job.status === 'queued' ? 'queued' : 'pending') as JobData['status'],
      progress: 0,
      createdAt: new Date().toISOString(),
      file: {
        _id: job.fileId,
        originalName: job.filename,
        filename: job.filename,
        type: 'image' as const, // This should come from the API
        size: 0 // This should come from the API
      }
    }));

    console.log('📋 Adding jobs to state:', newJobs);
    addJobs(newJobs);
    setShowUpload(false);

    // Refresh jobs to get complete data
    setTimeout(() => loadJobs(), 1000);
  };

  // File upload with drag and drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please log in to upload files');
      return;
    }

    setIsLoading(true);

    const newFiles: FileUpload[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);

    try {
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Calculate total size for progress display
      const totalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

      const response = await api.upload.multiple(formData, (progress) => {
        // Update progress for all new files
        setFiles(prev => prev.map(file =>
          newFiles.some(nf => nf.id === file.id)
            ? { ...file, progress, status: 'uploading' as const }
            : file
        ));
      });

      if (response.success) {
        // Update files with server response - keep original ID but add jobId for tracking
        setFiles(prev => prev.map((file, index) => ({
          ...file,
          jobId: response.data?.jobs[index]?.jobId,
          status: 'uploaded' as const,
          progress: 100
        })));

        toast.success(`🚀 Files uploaded successfully! (${totalSizeMB}MB) Processing thumbnails...`);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);

      // Mark all new files as error
      setFiles(prev => prev.map(file =>
        newFiles.some(nf => nf.id === file.id)
          ? { ...file, status: 'error' as const, error: error.message || 'Upload failed' }
          : file
      ));

      // Better error messages
      if (error.message?.includes('timeout')) {
        toast.error(`❌ Upload timed out. Please try with smaller files or check your connection.`);
      } else if (error.message?.includes('cancelled')) {
        toast.error(`❌ Upload was cancelled. Please try again.`);
      } else {
        toast.error(`❌ Upload failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    },
    multiple: true,
    disabled: isLoading
  });

  // Helper functions
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
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
    } catch (error) {
      toast.error('Failed to download thumbnail');
    }
  };

  const getStatusIcon = (status: FileUpload['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const result = await api.jobs.retry(jobId, token || undefined);
      if (result.success) {
        updateJob({ _id: jobId, status: 'pending', progress: 0, error: undefined });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error retrying job:', error);
      throw error;
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const result = await api.jobs.delete(jobId, token || undefined);
      if (result.success) {
        removeJob(jobId);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Enhanced Professional Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/10 to-blue-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/5 to-purple-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Professional Header */}
      <header className="relative z-10 glass border-b border-white/30 shadow-professional">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-700 via-blue-600 to-indigo-700 rounded-xl shadow-lg animate-glow">
                  <Image className="h-6 w-6 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-700 via-blue-600 to-indigo-700 opacity-20 animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  Thumbnail Generator Pro
                </h1>
                <p className="text-slate-600 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={loadJobs}
                disabled={isLoading}
                className="glass hover:bg-white/80 transition-all duration-300 shadow-professional-hover"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowUpload(!showUpload)}
                className="btn-primary"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="glass hover:bg-red-50/70 hover:border-red-200/50 hover:text-red-600 transition-all duration-300 shadow-professional-hover"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Hero Section */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 animate-ping"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold gradient-text">
              Professional Thumbnail Generator Pro
            </h2>
          </div>
          <p className="text-xl text-slate-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Transform your content with high-quality thumbnails using advanced AI processing technology.
            Create stunning visuals that captivate your audience and boost engagement.
          </p>

          {/* Enhanced Professional Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-professional p-6 hover:-translate-y-2 transition-all duration-500">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl mx-auto mb-4 shadow-lg">
                <BarChart3 className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold gradient-text mb-2">{jobStats.total}</h3>
              <p className="text-slate-600 font-medium">Total Files Processed</p>
            </div>

            <div className="card-professional p-6 hover:-translate-y-2 transition-all duration-500">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl mx-auto mb-4 shadow-lg">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold gradient-text mb-2">{jobStats.completed}</h3>
              <p className="text-slate-600 font-medium">Successfully Completed</p>
            </div>

            <div className="card-professional p-6 hover:-translate-y-2 transition-all duration-500">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl mx-auto mb-4 shadow-lg">
                <Clock className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-3xl font-bold gradient-text mb-2">{jobStats.processing}</h3>
              <p className="text-slate-600 font-medium">Currently Processing</p>
            </div>

            <div className="card-professional p-6 hover:-translate-y-2 transition-all duration-500">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl mx-auto mb-4 shadow-lg">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold gradient-text mb-2">{jobStats.failed}</h3>
              <p className="text-slate-600 font-medium">Failed Attempts</p>
            </div>
          </div>
        </div>

        {/* Professional Upload Section */}
        <div className="mb-12">
          <Tabs defaultValue="upload" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 card-professional rounded-2xl p-2">
              <TabsTrigger
                value="upload"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold"
              >
                <Clock className="h-4 w-4 mr-2" />
                Processing History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-8">
              {/* Professional Drag & Drop Upload Area */}
              <div className="card-professional overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg animate-glow">
                        <Wand2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 opacity-20 animate-ping"></div>
                    </div>
                    <h3 className="text-3xl font-bold gradient-text">
                      Upload Your Files
                    </h3>
                  </div>

                  <div
                    {...getRootProps()}
                    className={`
                      relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-500 transform hover:scale-[1.02]
                      ${isDragActive
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-2xl shadow-blue-500/20'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/50'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-8">
                      <div className={`p-8 rounded-3xl transition-all duration-500 ${isDragActive
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl shadow-blue-500/25 scale-110'
                        : 'bg-gradient-to-br from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200'
                        }`}>
                        <Upload className={`h-16 w-16 transition-all duration-500 ${isDragActive ? 'text-white animate-bounce' : 'text-blue-600'
                          }`} />
                      </div>
                      <div>
                        <p className="text-3xl font-bold gradient-text mb-3">
                          {isDragActive ? '🎯 Drop files here!' : '🚀 Drag & drop files here'}
                        </p>
                        <p className="text-slate-600 text-xl mb-6">
                          or click to browse your professional files
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
                          <Badge variant="outline" className="bg-white/50 border-blue-200 px-4 py-2">
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Images: JPEG, PNG, GIF, WebP
                          </Badge>
                          <Badge variant="outline" className="bg-white/50 border-purple-200 px-4 py-2">
                            <Play className="h-4 w-4 mr-2" />
                            Videos: MP4, AVI, MOV, WebM
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Upload Progress Section */}
              {files.length > 0 && (
                <div className="card-professional overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="relative">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl shadow-lg animate-glow">
                          <Gauge className="h-6 w-6 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 opacity-20 animate-ping"></div>
                      </div>
                      <h3 className="text-3xl font-bold gradient-text">
                        Upload Progress
                      </h3>
                    </div>

                    <div className="space-y-6">
                      {files.map((fileUpload) => (
                        <div key={fileUpload.id} className="card-professional p-6 hover:-translate-y-1 transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              {getStatusIcon(fileUpload.status)}
                              <div>
                                <p className="font-semibold text-slate-800">{fileUpload.file.name}</p>
                                <p className="text-sm text-slate-600">
                                  {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={`${fileUpload.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                  fileUpload.status === 'processing' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                    fileUpload.status === 'uploaded' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                      fileUpload.status === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
                                        'bg-blue-100 text-blue-800 border-blue-200'
                                  }`}
                              >
                                {fileUpload.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileUpload.id)}
                                disabled={fileUpload.status === 'processing'}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {(fileUpload.status === 'uploading' || fileUpload.status === 'processing') && (
                            <div className="mb-4">
                              <Progress value={fileUpload.progress} className="h-3 bg-slate-200" />
                              <p className="text-sm text-slate-600 mt-2">
                                {fileUpload.status === 'uploading' ? 'Uploading' : 'Processing'}: {fileUpload.progress}% complete
                              </p>
                            </div>
                          )}

                          {fileUpload.status === 'error' && fileUpload.error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                              <p className="text-sm text-red-600">{fileUpload.error}</p>
                            </div>
                          )}

                          {fileUpload.status === 'completed' && fileUpload.thumbnails && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                              {fileUpload.thumbnails.map((thumbnail) => (
                                <div key={thumbnail.id} className="relative group">
                                  <div className="relative overflow-hidden rounded-xl border-2 border-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                                    <img
                                      src={thumbnail.url}
                                      alt={`Thumbnail ${thumbnail.size}`}
                                      className="w-full h-32 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-3">
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => window.open(thumbnail.url, '_blank')}
                                          className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => downloadThumbnail(
                                            thumbnail.url,
                                            `thumbnail-${thumbnail.size}.${thumbnail.format}`
                                          )}
                                          className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-center mt-2 text-slate-600 font-medium">
                                    {thumbnail.size}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-8">
              <div className="card-professional overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl shadow-lg animate-glow">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 opacity-20 animate-ping"></div>
                    </div>
                    <h3 className="text-3xl font-bold gradient-text">
                      Processing History
                    </h3>
                  </div>

                  {processedFiles.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="relative mb-8">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl shadow-lg">
                          <FileImage className="h-12 w-12 text-slate-400" />
                        </div>
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 opacity-20 animate-ping"></div>
                      </div>
                      <h4 className="text-2xl font-bold gradient-text mb-3">No files processed yet</h4>
                      <p className="text-slate-600 mb-8 text-lg">Upload some files to see your professional thumbnail generation history</p>
                      <Button
                        onClick={() => setShowUpload(true)}
                        className="btn-primary"
                      >
                        <Rocket className="h-4 w-4 mr-2" />
                        Start Creating Professional Thumbnails
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {processedFiles.map((file) => (
                        <div key={file._id} className="card-professional p-6 hover:-translate-y-1 transition-all duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg animate-glow">
                                  {file.fileType && file.fileType.startsWith('image/') ? (
                                    <FileImage className="h-6 w-6 text-white" />
                                  ) : (
                                    <Video className="h-6 w-6 text-white" />
                                  )}
                                </div>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 animate-ping"></div>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-lg">{file.originalName}</p>
                                <p className="text-slate-600">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {' '}
                                  {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(file.status)} shadow-sm`}>
                              {file.status}
                            </Badge>
                          </div>

                          {file.thumbnails && file.thumbnails.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {file.thumbnails.map((thumbnail) => (
                                <div key={thumbnail._id} className="relative group">
                                  <div className="relative overflow-hidden rounded-xl border-2 border-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                                    <img
                                      src={thumbnail.url}
                                      alt={`Thumbnail ${thumbnail.size}`}
                                      className="w-full h-32 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-3">
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => window.open(thumbnail.url, '_blank')}
                                          className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => downloadThumbnail(
                                            thumbnail.url,
                                            `thumbnail-${thumbnail.size}.${thumbnail.format}`
                                          )}
                                          className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-center mt-2 text-slate-600 font-medium">
                                    {thumbnail.size}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
