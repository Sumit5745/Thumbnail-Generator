/**
 * Production-ready logging utility
 * Provides structured logging with different levels and proper error handling
 */

import { CONFIG } from '../config/config';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = CONFIG.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    
    if (this.isDevelopment) {
      // Pretty format for development
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      const errorStr = error ? `\n${error.stack}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`;
    } else {
      // JSON format for production (better for log aggregation)
      return JSON.stringify({
        timestamp,
        level,
        message,
        context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };

    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
    }
  }

  error(message: string, error?: unknown, context?: Record<string, any>): void {
    // Convert unknown error to Error if possible
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, context, errorObj);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
}

export const logger = new Logger();
