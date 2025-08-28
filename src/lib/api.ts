/**
 * API Configuration and HTTP Client
 *
 * This file centralizes all API calls and configuration.
 * No hardcoded URLs anywhere in the application.
 */

import { toast } from 'sonner';

// API Response Types
import { ApiResponse, AuthResponse, UploadResponse, UserJobsResponse } from '@/types';

const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  SOCKET_URL: 'http://localhost:3000',
  TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 300000,
};



class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout?: number
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const requestTimeout = timeout || API_CONFIG.TIMEOUT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, requestTimeout);

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    };



    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        return response as unknown as ApiResponse<T>;
      }

      const data = await response.json();
      if (!response.ok) {
        // Better error handling for authentication and other errors
        let errorMessage = `HTTP ${response.status}`;
        
        if (data.error?.message) {
          errorMessage = data.error.message;
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : 'Request failed';
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).data = data;
        throw error;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${requestTimeout}ms`);
      }
      throw error;
    }
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseURL}${cleanEndpoint}`;
  }

  // Auth endpoints
  auth = {
    login: async (credentials: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> => {
      return this.request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },

    register: async (userData: { email: string; password: string; name: string }): Promise<ApiResponse<AuthResponse>> => {
      return this.request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    logout: async (): Promise<ApiResponse> => {
      return this.request('/api/auth/logout', {
        method: 'POST',
      });
    },

    verify: async (): Promise<ApiResponse<AuthResponse>> => {
      return this.request<AuthResponse>('/api/auth/verify');
    },

    getMe: async (token: string): Promise<ApiResponse<AuthResponse>> => {
      return this.request<AuthResponse>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
  };

  // Upload endpoints
  upload = {
    single: async (file: File, token?: string, onProgress?: (progress: number) => void): Promise<ApiResponse<UploadResponse>> => {
      const formData = new FormData();
      formData.append('file', file);

      return this.uploadWithProgress('/api/upload/file', formData, token, onProgress);
    },

    multiple: async (files: FormData, token?: string, onProgress?: (progress: number) => void): Promise<ApiResponse<UploadResponse>> => {
      return this.uploadWithProgress('/api/upload/files/multiple', files, token, onProgress);
    },
  };

  // Jobs endpoints
  jobs = {
    getAll: async (token?: string): Promise<ApiResponse<UserJobsResponse>> => {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return this.request<UserJobsResponse>('/api/thumbnails/jobs', { headers });
    },

    getById: async (jobId: string, token?: string): Promise<ApiResponse<any>> => {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return this.request(`/api/thumbnails/jobs/${jobId}`, { headers });
    },

    delete: async (jobId: string, token?: string): Promise<ApiResponse> => {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return this.request(`/api/thumbnails/jobs/${jobId}`, {
        method: 'DELETE',
      headers,
    });
    },

    retry: async (jobId: string, token?: string): Promise<ApiResponse> => {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return this.request(`/api/thumbnails/jobs/${jobId}/retry`, {
        method: 'POST',
        headers,
      });
    },
  };

  private uploadWithProgress(
    endpoint: string,
    formData: FormData,
    token?: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadResponse>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = this.buildUrl(endpoint);

        xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error(`Upload timeout after ${API_CONFIG.UPLOAD_TIMEOUT}ms`));
      });

      xhr.open('POST', url);
      xhr.timeout = API_CONFIG.UPLOAD_TIMEOUT;
      
      // Add Authorization header if token is provided
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  }
}

export const api = new ApiClient();

export function getSocketUrl(): string {
  return API_CONFIG.SOCKET_URL;
}

export const API_CONFIG_EXPORT = {
  baseUrl: API_CONFIG.BASE_URL,
  socketUrl: API_CONFIG.SOCKET_URL,
  timeout: API_CONFIG.TIMEOUT,
  uploadTimeout: API_CONFIG.UPLOAD_TIMEOUT,
};
