import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models';
import { UserRegistrationData, UserLoginData, AuthResponse, ApiResponse } from '../../src/types';
import { CONFIG } from '../config/config';
import { logger } from '../utils/logger';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  createErrorResponse
} from '../utils/errors';
import {
  validateUserRegistration,
  validateUserLogin
} from '../utils/validation';
import { createAuthRateLimit } from '../middleware/auth';

interface AuthRequest extends FastifyRequest {
  body: UserRegistrationData | UserLoginData;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Rate limiting for auth endpoints - increased for testing
  const authRateLimit = createAuthRateLimit(50, 15 * 60 * 1000); // 50 attempts per 15 minutes

  // Register endpoint with comprehensive validation and security
  fastify.post<{ Body: UserRegistrationData }>('/register', {
    preHandler: authRateLimit
  }, async (request, reply) => {
    try {
      // Validate and sanitize input data
      const validatedData = validateUserRegistration(request.body);
      const { email, password, name } = validatedData;

      logger.info('User registration attempt', {
        email,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn('Registration attempt with existing email', { email });
        throw new ConflictError('User with this email already exists');
      }

      // Create new user (password hashing is handled in the User model)
      const user = new User({ email, password, name });
      await user.save();

      // Generate JWT token
      const userDoc = user as any;
      const token = fastify.jwt.sign(
        { userId: userDoc._id, email: userDoc.email },
        { expiresIn: '7d' }
      );

      // Set cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const response: AuthResponse = {
        user: {
          _id: userDoc._id.toString(),
          email: userDoc.email,
          name: userDoc.name,
          createdAt: userDoc.createdAt,
          updatedAt: userDoc.updatedAt
        },
        token
      };

      logger.info('User registered successfully', {
        userId: userDoc._id,
        email: userDoc.email
      });

      return reply.status(201).send({
        success: true,
        data: response,
        message: 'User registered successfully'
      });

    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        const errorResponse = createErrorResponse(error);
        return reply.status(error.statusCode).send(errorResponse);
      }

      logger.error('Unexpected registration error', error as Error, {
        email: request.body?.email,
        ip: request.ip
      });

      const genericError = new ValidationError('Registration failed');
      const errorResponse = createErrorResponse(genericError);
      return reply.status(500).send(errorResponse);
    }
  });

  // Login endpoint with enhanced security
  fastify.post<{ Body: UserLoginData }>('/login', {
    preHandler: authRateLimit
  }, async (request, reply) => {
    try {
      // Validate and sanitize input data
      const validatedData = validateUserLogin(request.body);
      const { email, password } = validatedData;

      logger.info('User login attempt', {
        email,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        logger.warn('Login attempt with non-existent email', { email });
        throw new AuthenticationError('Invalid email or password');
      }

      // Check password
      const userDoc = user as any;
      const isValidPassword = await userDoc.comparePassword(password);
      if (!isValidPassword) {
        logger.warn('Login attempt with invalid password', {
          email,
          userId: userDoc._id
        });
        throw new AuthenticationError('Invalid email or password');
      }

      // Generate JWT token
      const token = fastify.jwt.sign(
        { userId: userDoc._id, email: userDoc.email },
        { expiresIn: '7d' }
      );

      // Set secure cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const response: AuthResponse = {
        user: {
          _id: userDoc._id.toString(),
          email: userDoc.email,
          name: userDoc.name,
          createdAt: userDoc.createdAt,
          updatedAt: userDoc.updatedAt
        },
        token
      };

      logger.info('User logged in successfully', {
        userId: userDoc._id,
        email: userDoc.email
      });

      return reply.send({
        success: true,
        data: response,
        message: 'Login successful'
      });

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        const errorResponse = createErrorResponse(error);
        return reply.status(error.statusCode).send(errorResponse);
      }

      logger.error('Unexpected login error', error as Error, {
        email: request.body?.email,
        ip: request.ip
      });

      const genericError = new AuthenticationError('Login failed');
      const errorResponse = createErrorResponse(genericError);
      return reply.status(500).send(errorResponse);
    }
  });

  // Logout endpoint
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('token');
    return reply.send({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // Get current user endpoint
  fastify.get('/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({
          success: false,
          error: 'Unauthorized'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string };
      const user = await User.findById(userId);
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      return reply.send({
        success: true,
        data: { user }
      });

    } catch (error) {
      fastify.log.error('Get user error: %s', (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}
