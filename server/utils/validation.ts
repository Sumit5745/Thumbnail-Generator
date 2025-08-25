/**
 * Input validation utilities for secure data handling
 */

import { ValidationError } from './errors';
import { CONFIG } from '../config/config';

/**
 * Email validation with comprehensive regex
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * Password strength validation
 */
export const isValidPassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // Optional: Add basic strength requirements for development
  if (CONFIG.isDevelopment && password.length < 8) {
    errors.push('For development, password should be at least 8 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
};

/**
 * Validate file upload parameters
 */
export const validateFileUpload = (file: {
  filename: string;
  mimetype: string;
  size?: number;
}, allowedTypes: string[], maxSize: number): void => {
  if (!file.filename || typeof file.filename !== 'string') {
    throw new ValidationError('Invalid filename');
  }
  
  if (!file.mimetype || typeof file.mimetype !== 'string') {
    throw new ValidationError('Invalid file type');
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError(`File type ${file.mimetype} is not allowed`, {
      allowedTypes,
      receivedType: file.mimetype
    });
  }
  
  if (file.size && file.size > maxSize) {
    throw new ValidationError(`File size ${file.size} exceeds maximum allowed size ${maxSize}`, {
      fileSize: file.size,
      maxSize
    });
  }
  
  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const fileExtension = file.filename.toLowerCase().substring(file.filename.lastIndexOf('.'));
  
  if (dangerousExtensions.includes(fileExtension)) {
    throw new ValidationError(`File extension ${fileExtension} is not allowed for security reasons`);
  }
};

/**
 * Validate MongoDB ObjectId format
 */
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate and sanitize user registration data
 */
export const validateUserRegistration = (data: {
  email?: string;
  password?: string;
  name?: string;
}): { email: string; password: string; name: string } => {
  if (!data.email || typeof data.email !== 'string') {
    throw new ValidationError('Email is required');
  }
  
  if (!isValidEmail(data.email)) {
    throw new ValidationError('Invalid email format');
  }
  
  if (!data.password || typeof data.password !== 'string') {
    throw new ValidationError('Password is required');
  }
  
  const passwordValidation = isValidPassword(data.password);
  if (!passwordValidation.isValid) {
    throw new ValidationError('Password does not meet requirements', {
      errors: passwordValidation.errors
    });
  }
  
  if (!data.name || typeof data.name !== 'string') {
    throw new ValidationError('Name is required');
  }
  
  if (data.name.length < 2 || data.name.length > 50) {
    throw new ValidationError('Name must be between 2 and 50 characters');
  }
  
  return {
    email: data.email.toLowerCase().trim(),
    password: data.password,
    name: sanitizeString(data.name)
  };
};

/**
 * Validate user login data
 */
export const validateUserLogin = (data: {
  email?: string;
  password?: string;
}): { email: string; password: string } => {
  if (!data.email || typeof data.email !== 'string') {
    throw new ValidationError('Email is required');
  }
  
  if (!isValidEmail(data.email)) {
    throw new ValidationError('Invalid email format');
  }
  
  if (!data.password || typeof data.password !== 'string') {
    throw new ValidationError('Password is required');
  }
  
  return {
    email: data.email.toLowerCase().trim(),
    password: data.password
  };
};
