/**
 * Production-ready authentication middleware
 * Handles JWT verification with proper error handling and security measures
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticationError, createErrorResponse } from '../utils/errors';
import { logger } from '../utils/logger';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

// Extend the JWT user type to include our custom properties
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthenticatedUser;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

/**
 * Authentication middleware that supports both cookie and header-based JWT
 */
export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Try cookie authentication first (more secure for web apps)
    try {
      await request.jwtVerify();
      return; // Success - user is now available in request.user
    } catch (cookieError) {
      // Cookie auth failed, try Authorization header
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('No valid authentication token provided');
      }
      
      const token = authHeader.substring(7);
      
      if (!token) {
        throw new AuthenticationError('Empty authentication token');
      }
      
      try {
        const decoded = request.server.jwt.verify(token) as AuthenticatedUser;
        
        // Manually set the user on the request object
        request.user = {
          userId: decoded.userId,
          email: decoded.email
        };
        
        logger.debug('Authentication successful via Bearer token', {
          userId: decoded.userId,
          email: decoded.email
        });
        
      } catch (tokenError) {
        logger.warn('JWT token verification failed', {
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
          hasAuthHeader: !!authHeader,
          tokenLength: token.length
        });
        
        throw new AuthenticationError('Invalid authentication token');
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      const errorResponse = createErrorResponse(error);
      return reply.status(error.statusCode).send(errorResponse);
    }
    
    // Unexpected error
    logger.error('Unexpected error in authentication middleware', error as Error);
    const unexpectedError = new AuthenticationError('Authentication failed');
    const errorResponse = createErrorResponse(unexpectedError);
    return reply.status(500).send(errorResponse);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalAuthenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    await authenticate(request, reply);
  } catch (error) {
    // Silently continue without authentication
    logger.debug('Optional authentication failed, continuing without auth');
  }
};

/**
 * Rate limiting helper for authentication endpoints
 */
export const createAuthRateLimit = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const clientIp = request.ip;
    const now = Date.now();
    
    // Clean up expired entries
    for (const [ip, data] of attempts.entries()) {
      if (now > data.resetTime) {
        attempts.delete(ip);
      }
    }
    
    const clientAttempts = attempts.get(clientIp);
    
    if (!clientAttempts) {
      attempts.set(clientIp, { count: 1, resetTime: now + windowMs });
      return done();
    }
    
    if (clientAttempts.count >= maxAttempts) {
      logger.warn('Rate limit exceeded for authentication', {
        clientIp,
        attempts: clientAttempts.count,
        maxAttempts
      });
      
      return reply.status(429).send({
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          statusCode: 429,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    clientAttempts.count++;
    done();
  };
};
