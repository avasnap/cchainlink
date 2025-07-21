/**
 * Centralized Error Handling Middleware
 * Handles all errors in a consistent format across the API
 */

import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Custom error class for API-specific errors
 */
export class ApiError extends Error implements AppError {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Centralized error handler middleware
 * Must be registered as the last middleware in the Express app
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set default error values
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  // Log error for debugging (in production, use proper logging service)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode} ${code}: ${message}`);
  
  // In development, include stack trace
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Async wrapper to catch promise rejections in route handlers
 * Use this to wrap async route handlers so errors are properly caught
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found handler
 * Should be registered before the error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(`Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};