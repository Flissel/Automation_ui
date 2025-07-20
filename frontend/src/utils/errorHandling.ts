/**
 * Enhanced Error Handling and Logging Utilities
 * Replaces generic console.error with structured error management
 */

import { toast } from 'react-hot-toast'

// Error Types
export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: Date
  component?: string
  severity: ErrorSeverity
  stack?: string
  userId?: string
  sessionId?: string
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

// Error Categories
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  USER_INPUT = 'USER_INPUT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE'
}

// Error Codes
export const ErrorCodes = {
  // Network Errors
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // API Errors
  API_INVALID_RESPONSE: 'API_INVALID_RESPONSE',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_FORBIDDEN: 'API_FORBIDDEN',
  API_NOT_FOUND: 'API_NOT_FOUND',
  API_SERVER_ERROR: 'API_SERVER_ERROR',
  
  // Validation Errors
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  
  // WebSocket Errors
  WEBSOCKET_CONNECTION_FAILED: 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_MESSAGE_PARSE_ERROR: 'WEBSOCKET_MESSAGE_PARSE_ERROR',
  WEBSOCKET_SEND_FAILED: 'WEBSOCKET_SEND_FAILED',
  
  // Node System Errors
  NODE_EXECUTION_FAILED: 'NODE_EXECUTION_FAILED',
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
  GRAPH_VALIDATION_FAILED: 'GRAPH_VALIDATION_FAILED',
  GRAPH_EXECUTION_TIMEOUT: 'GRAPH_EXECUTION_TIMEOUT',
  
  // File System Errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  
  // Generic Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Enhanced Error Logger with structured logging
 */
export class ErrorLogger {
  private static instance: ErrorLogger
  private errorQueue: AppError[] = []
  private maxQueueSize = 100
  private isProduction = import.meta.env.PROD
  private enableRemoteLogging = import.meta.env.VITE_ENABLE_REMOTE_LOGGING === 'true'
  private remoteEndpoint = import.meta.env.VITE_ERROR_LOGGING_ENDPOINT

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  /**
   * Log an error with structured data
   */
  logError(
    error: Error | string,
    code: ErrorCode = ErrorCodes.UNKNOWN_ERROR,
    context: ErrorContext = {},
    severity: ErrorSeverity = 'medium'
  ): AppError {
    const appError = this.createAppError(error, code, context, severity)
    
    // Add to queue
    this.addToQueue(appError)
    
    // Console logging (always in development, conditional in production)
    if (!this.isProduction || severity === 'critical') {
      this.logToConsole(appError)
    }
    
    // Remote logging (if enabled)
    if (this.enableRemoteLogging && this.remoteEndpoint) {
      this.logToRemote(appError).catch(remoteError => {
        console.warn('Failed to send error to remote logging service:', remoteError)
      })
    }
    
    // Show user notification for certain errors
    this.showUserNotification(appError)
    
    return appError
  }

  /**
   * Create a structured AppError from various input types
   */
  private createAppError(
    error: Error | string,
    code: ErrorCode,
    context: ErrorContext,
    severity: ErrorSeverity
  ): AppError {
    const message = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'object' ? error.stack : undefined
    
    return {
      code,
      message,
      details: {
        originalError: typeof error === 'object' ? error.name : 'StringError',
        ...context.metadata
      },
      timestamp: new Date(),
      component: context.component,
      severity,
      stack,
      userId: context.userId || this.getCurrentUserId(),
      sessionId: context.sessionId || this.getSessionId()
    }
  }

  /**
   * Add error to internal queue for batch processing
   */
  private addToQueue(error: AppError): void {
    this.errorQueue.push(error)
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }
  }

  /**
   * Log to console with proper formatting
   */
  private logToConsole(error: AppError): void {
    const logLevel = this.getConsoleLogLevel(error.severity)
    const logMethod = console[logLevel] || console.error
    
    logMethod(
      `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`,
      {
        timestamp: error.timestamp.toISOString(),
        component: error.component,
        details: error.details,
        stack: error.stack
      }
    )
  }

  /**
   * Send error to remote logging service
   */
  private async logToRemote(error: AppError): Promise<void> {
    if (!this.remoteEndpoint) return
    
    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...error,
          timestamp: error.timestamp.toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (remoteError) {
      // Silently fail remote logging to avoid infinite loops
    }
  }

  /**
   * Show appropriate user notification
   */
  private showUserNotification(error: AppError): void {
    const shouldShowToUser = this.shouldShowErrorToUser(error)
    
    if (!shouldShowToUser) return
    
    const userMessage = this.getUserFriendlyMessage(error)
    
    switch (error.severity) {
      case 'critical':
      case 'high':
        toast.error(userMessage, { duration: 6000 })
        break
      case 'medium':
        toast.error(userMessage, { duration: 4000 })
        break
      case 'low':
        toast(userMessage, { duration: 2000 })
        break
    }
  }

  /**
   * Determine if error should be shown to user
   */
  private shouldShowErrorToUser(error: AppError): boolean {
    // Don't show validation errors (usually handled by forms)
    if (error.code.startsWith('VALIDATION_')) return false
    
    // Don't show network timeouts in development
    if (!this.isProduction && error.code === ErrorCodes.NETWORK_TIMEOUT) return false
    
    // Show critical and high severity errors
    if (error.severity === 'critical' || error.severity === 'high') return true
    
    // Show medium severity errors except for certain codes
    if (error.severity === 'medium') {
      const silentCodes = [
        ErrorCodes.WEBSOCKET_CONNECTION_FAILED,
        ErrorCodes.API_RATE_LIMIT
      ]
      return !silentCodes.includes(error.code as any)
    }
    
    return false
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: AppError): string {
    const messageMap: Record<string, string> = {
      [ErrorCodes.NETWORK_TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorCodes.NETWORK_UNAVAILABLE]: 'Network connection unavailable. Please check your internet connection.',
      [ErrorCodes.API_UNAUTHORIZED]: 'You are not authorized to perform this action.',
      [ErrorCodes.API_FORBIDDEN]: 'Access denied. You do not have permission for this action.',
      [ErrorCodes.API_NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCodes.API_SERVER_ERROR]: 'Server error occurred. Please try again later.',
      [ErrorCodes.NODE_EXECUTION_FAILED]: 'Node execution failed. Please check your configuration.',
      [ErrorCodes.GRAPH_VALIDATION_FAILED]: 'Graph validation failed. Please check your graph structure.',
      [ErrorCodes.FILE_UPLOAD_FAILED]: 'File upload failed. Please try again.',
      [ErrorCodes.WEBSOCKET_CONNECTION_FAILED]: 'Real-time connection lost. Attempting to reconnect...',
    }
    
    return messageMap[error.code] || error.message || 'An unexpected error occurred.'
  }

  /**
   * Get console log level based on error severity
   */
  private getConsoleLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error'
      case 'medium':
        return 'warn'
      case 'low':
        return 'info'
      default:
        return 'log'
    }
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  private getCurrentUserId(): string | undefined {
    // Implement based on your authentication system
    return localStorage.getItem('userId') || undefined
  }

  /**
   * Get current session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('sessionId', sessionId)
    }
    return sessionId
  }

  /**
   * Get recent errors from queue
   */
  getRecentErrors(count = 10): AppError[] {
    return this.errorQueue.slice(-count)
  }

  /**
   * Clear error queue
   */
  clearErrorQueue(): void {
    this.errorQueue = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    bySeverity: Record<ErrorSeverity, number>
    byCode: Record<string, number>
    byComponent: Record<string, number>
  } {
    const stats = {
      total: this.errorQueue.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<ErrorSeverity, number>,
      byCode: {} as Record<string, number>,
      byComponent: {} as Record<string, number>
    }
    
    this.errorQueue.forEach(error => {
      stats.bySeverity[error.severity]++
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1
      if (error.component) {
        stats.byComponent[error.component] = (stats.byComponent[error.component] || 0) + 1
      }
    })
    
    return stats
  }
}

// Convenience functions for common error scenarios
export const errorLogger = ErrorLogger.getInstance()

/**
 * Log a network error
 */
export const logNetworkError = (
  error: Error | string,
  context: ErrorContext = {}
): AppError => {
  return errorLogger.logError(
    error,
    ErrorCodes.NETWORK_ERROR,
    context,
    'high'
  )
}

/**
 * Log an API error
 */
export const logApiError = (
  error: Error | string,
  statusCode?: number,
  context: ErrorContext = {}
): AppError => {
  let code: ErrorCode = ErrorCodes.API_SERVER_ERROR
  let severity: ErrorSeverity = 'medium'
  
  if (statusCode) {
    switch (statusCode) {
      case 401:
        code = ErrorCodes.API_UNAUTHORIZED
        severity = 'high'
        break
      case 403:
        code = ErrorCodes.API_FORBIDDEN
        severity = 'high'
        break
      case 404:
        code = ErrorCodes.API_NOT_FOUND
        severity = 'medium'
        break
      case 429:
        code = ErrorCodes.API_RATE_LIMIT
        severity = 'medium'
        break
      case 500:
      case 502:
      case 503:
      case 504:
        code = ErrorCodes.API_SERVER_ERROR
        severity = 'high'
        break
    }
  }
  
  return errorLogger.logError(error, code, context, severity)
}

/**
 * Log a validation error
 */
export const logValidationError = (
  field: string,
  message: string,
  context: ErrorContext = {}
): AppError => {
  return errorLogger.logError(
    `Validation failed for ${field}: ${message}`,
    ErrorCodes.VALIDATION_INVALID_FORMAT,
    { ...context, metadata: { field, ...context.metadata } },
    'low'
  )
}

/**
 * Log a WebSocket error
 */
export const logWebSocketError = (
  error: Error | string,
  context: ErrorContext = {}
): AppError => {
  return errorLogger.logError(
    error,
    ErrorCodes.WEBSOCKET_CONNECTION_FAILED,
    context,
    'medium'
  )
}

/**
 * Log a node execution error
 */
export const logNodeExecutionError = (
  nodeId: string,
  error: Error | string,
  context: ErrorContext = {}
): AppError => {
  return errorLogger.logError(
    error,
    ErrorCodes.NODE_EXECUTION_FAILED,
    { ...context, metadata: { nodeId, ...context.metadata } },
    'high'
  )
}

/**
 * Create a custom error with proper typing
 */
export const createAppError = (
  message: string,
  code: ErrorCode = ErrorCodes.UNKNOWN_ERROR,
  details?: Record<string, unknown>
): AppError => {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    severity: 'medium'
  }
}

/**
 * Error boundary helper for React components
 */
export const handleComponentError = (
  error: Error,
  errorInfo: { componentStack: string },
  componentName: string
): AppError => {
  return errorLogger.logError(
    error,
    ErrorCodes.SYSTEM,
    {
      component: componentName,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    },
    'high'
  )
}

/**
 * Async error handler for promises
 */
export const handleAsyncError = async <T>(
  promise: Promise<T>,
  context: ErrorContext = {}
): Promise<T | null> => {
  try {
    return await promise
  } catch (error) {
    errorLogger.logError(
      error as Error,
      ErrorCodes.UNKNOWN_ERROR,
      context,
      'medium'
    )
    return null
  }
}

/**
 * Retry wrapper with error logging
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
  context: ErrorContext = {}
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        errorLogger.logError(
          lastError,
          ErrorCodes.UNKNOWN_ERROR,
          { ...context, metadata: { attempts: attempt, ...context.metadata } },
          'high'
        )
        throw lastError
      }
      
      // Log retry attempt
      errorLogger.logError(
        `Attempt ${attempt} failed, retrying...`,
        ErrorCodes.UNKNOWN_ERROR,
        { ...context, metadata: { attempt, maxRetries, ...context.metadata } },
        'low'
      )
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}

export default ErrorLogger