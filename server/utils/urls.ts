/**
 * URL Utilities for Thumbnail Generation System
 * 
 * This module provides utilities for building consistent URLs across the application,
 * ensuring proper configuration-based URL generation for different environments.
 */

import { CONFIG } from '../config/config';

/**
 * Build a full URL for static assets (thumbnails, uploads, etc.)
 * @param relativePath - The relative path starting with /
 * @returns Full URL with proper base URL
 */
export function buildAssetUrl(relativePath: string): string {
  // Ensure the path starts with /
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  // Use the API base URL for serving static assets
  const fullUrl = `${CONFIG.API_BASE_URL}${cleanPath}`;
  
  console.log('🔗 Building asset URL:', {
    relativePath,
    cleanPath,
    baseUrl: CONFIG.API_BASE_URL,
    fullUrl
  });
  
  return fullUrl;
}

/**
 * Build a thumbnail URL from a relative path
 * @param thumbnailPath - The relative thumbnail path (e.g., "/uploads/thumbnails/thumb_123.jpg")
 * @returns Full thumbnail URL
 */
export function buildThumbnailUrl(thumbnailPath: string): string {
  return buildAssetUrl(thumbnailPath);
}

/**
 * Transform thumbnail data for frontend consumption
 * @param thumbnails - Array of thumbnail URLs or thumbnail objects
 * @param jobId - Job ID for generating unique thumbnail IDs
 * @returns Array of thumbnail objects with proper structure for frontend
 */
export function transformThumbnailsForFrontend(
  thumbnails: any[], 
  jobId: string
): Array<{
  id: string;
  url: string;
  size: string;
  format: string;
}> {
  return thumbnails.map((thumbnail, index) => {
    // Handle both string URLs and thumbnail objects
    const thumbnailUrl = typeof thumbnail === 'string' ? thumbnail : thumbnail.url;
    const thumbnailSize = typeof thumbnail === 'object' ? thumbnail.size : `${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`;
    const thumbnailId = typeof thumbnail === 'object' && thumbnail._id 
      ? thumbnail._id 
      : `thumb_${jobId}_${index}`;

    return {
      id: thumbnailId,
      url: buildThumbnailUrl(thumbnailUrl),
      size: thumbnailSize,
      format: 'jpg'
    };
  });
}

/**
 * Get the base URL for the API server
 * @returns API base URL
 */
export function getApiBaseUrl(): string {
  return CONFIG.API_BASE_URL;
}

/**
 * Get the frontend URL
 * @returns Frontend base URL
 */
export function getFrontendUrl(): string {
  return CONFIG.FRONTEND_URL;
}

/**
 * Validate if a URL is properly formatted
 * @param url - URL to validate
 * @returns boolean indicating if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
