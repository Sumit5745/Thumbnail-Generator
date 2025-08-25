import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { api } from '@/lib/api';

// User and Authentication State
export interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Persistent auth state using localStorage
export const authAtom = atomWithStorage<AuthState>('auth', {
  user: null,
  token: null,
  isAuthenticated: false
});

// Derived atoms for easier access
export const userAtom = atom(
  (get) => get(authAtom).user,
  (get, set, user: User | null) => {
    const auth = get(authAtom);
    set(authAtom, { ...auth, user, isAuthenticated: !!user });
  }
);

export const tokenAtom = atom(
  (get) => get(authAtom).token,
  (get, set, token: string | null) => {
    const auth = get(authAtom);
    set(authAtom, { ...auth, token });
  }
);

export const isAuthenticatedAtom = atom(
  (get) => get(authAtom).isAuthenticated
);

// Job and File State
export interface JobData {
  _id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: string;
  thumbnails?: Array<{
    _id: string;
    url: string;
    filename: string;
    size: string;
  }>;
  file: {
    _id: string;
    originalName: string;
    filename: string;
    type: 'image' | 'video';
    size: number;
  };
}

export const jobsAtom = atom<JobData[]>([]);

// Upload State
export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  uploadedFiles: string[];
  uploadError: string | null;
}

export const uploadStateAtom = atom<UploadState>({
  isUploading: false,
  uploadProgress: 0,
  uploadedFiles: [],
  uploadError: null
});

// Real-time updates state
export const socketConnectedAtom = atom<boolean>(false);

// UI State
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

// Dashboard filters and sorting
export interface DashboardFilters {
  status: 'all' | 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  fileType: 'all' | 'image' | 'video';
  sortBy: 'createdAt' | 'status' | 'filename';
  sortOrder: 'asc' | 'desc';
}

export const dashboardFiltersAtom = atom<DashboardFilters>({
  status: 'all',
  fileType: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

// Filtered and sorted jobs atom
export const filteredJobsAtom = atom((get) => {
  const jobs = get(jobsAtom);
  const filters = get(dashboardFiltersAtom);

  let filtered = jobs;

  // Filter by status
  if (filters.status !== 'all') {
    filtered = filtered.filter(job => job.status === filters.status);
  }

  // Filter by file type
  if (filters.fileType !== 'all') {
    filtered = filtered.filter(job => job.file.type === filters.fileType);
  }

  // Sort
  filtered.sort((a, b) => {
    let aValue: any, bValue: any;

    switch (filters.sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'filename':
        aValue = a.file.originalName.toLowerCase();
        bValue = b.file.originalName.toLowerCase();
        break;
      default:
        return 0;
    }

    if (filters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return filtered;
});

// Statistics atoms
export const jobStatsAtom = atom((get) => {
  const jobs = get(jobsAtom);
  
  const stats = {
    total: jobs.length,
    pending: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  jobs.forEach(job => {
    stats[job.status]++;
  });

  return stats;
});

// Actions (write-only atoms)
export const loginActionAtom = atom(
  null,
  (get, set, { user, token }: { user: User; token: string }) => {
    set(authAtom, {
      user,
      token,
      isAuthenticated: true
    });
  }
);

export const registerActionAtom = atom(
  null,
  async (get, set, { name, email, password }: { name: string; email: string; password: string }) => {
    const response = await api.auth.register({ name, email, password });
    if (response.success && response.data) {
      set(authAtom, {
        user: {
          ...response.data.user,
          createdAt: response.data.user.createdAt.toString(),
          updatedAt: response.data.user.updatedAt.toString()
        },
        token: response.data.token,
        isAuthenticated: true
      });
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  }
);

export const logoutActionAtom = atom(
  null,
  (get, set) => {
    set(authAtom, {
      user: null,
      token: null,
      isAuthenticated: false
    });
    set(jobsAtom, []);
    set(uploadStateAtom, {
      isUploading: false,
      uploadProgress: 0,
      uploadedFiles: [],
      uploadError: null
    });
  }
);

export const updateJobActionAtom = atom(
  null,
  (get, set, updatedJob: Partial<JobData> & { _id: string }) => {
    const jobs = get(jobsAtom);
    const updatedJobs = jobs.map(job => 
      job._id === updatedJob._id 
        ? { ...job, ...updatedJob }
        : job
    );
    set(jobsAtom, updatedJobs);
  }
);

export const addJobsActionAtom = atom(
  null,
  (get, set, newJobs: JobData[]) => {
    const existingJobs = get(jobsAtom);
    const jobIds = new Set(existingJobs.map(job => job._id));
    const uniqueNewJobs = newJobs.filter(job => !jobIds.has(job._id));
    set(jobsAtom, [...existingJobs, ...uniqueNewJobs]);
  }
);

export const removeJobActionAtom = atom(
  null,
  (get, set, jobId: string) => {
    const jobs = get(jobsAtom);
    const filteredJobs = jobs.filter(job => job._id !== jobId);
    set(jobsAtom, filteredJobs);
  }
);

export const setUploadStateActionAtom = atom(
  null,
  (get, set, uploadState: Partial<UploadState>) => {
    const currentState = get(uploadStateAtom);
    set(uploadStateAtom, { ...currentState, ...uploadState });
  }
);

export const setErrorActionAtom = atom(
  null,
  (get, set, error: string | null) => {
    set(errorAtom, error);
  }
);

export const setLoadingActionAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(isLoadingAtom, loading);
  }
);
