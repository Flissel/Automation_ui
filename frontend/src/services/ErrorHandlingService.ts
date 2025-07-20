/**
 * Comprehensive Error Handling Service
 * Provides centralized error management, user-friendly messages, and recovery mechanisms
 */

import { toast } from 'react-hot-toast';

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  EXECUTION = 'execution',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  technicalDetails?: string;
  timestamp: number;
  context?: Record<string, any>;
  recoveryActions?: RecoveryAction[];
  retryable: boolean;
}

export interface RecoveryAction {
  label: string;
  action: () => Promise<void> | void;
  type: 'primary' | 'secondary';
}

class ErrorHandlingService {
  private errors: Map<string, AppError> = new Map();
  private listeners: ((errors: AppError[]) => void)[] = [];

  /**
   * Create and handle a new error
   */
  handleError(error: any, context?: Record<string, any>): AppError {
    const appError = this.createAppError(error, context);
    this.addError(appError);
    this.showUserNotification(appError);
    return appError;
  }

  /**
   * Create an AppError from various error types
   */
  private createAppError(error: any, context?: Record<string, any>): AppError {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        id,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        title: 'Network Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        technicalDetails: error.message,
        timestamp,
        context,
        retryable: true,
        recoveryActions: [
          {
            label: 'Retry Connection',
            action: () => this.retryLastOperation(context),
            type: 'primary'
          },
          {
            label: 'Check Network Status',
            action: () => this.checkNetworkStatus(),
            type: 'secondary'
          }
        ]
      };
    }

    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status;
      return this.createHttpError(id, status, error, context, timestamp);
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return {
        id,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        title: 'Input Validation Error',
        message: this.formatValidationMessage(error.message),
        technicalDetails: error.message,
        timestamp,
        context,
        retryable: false,
        recoveryActions: [
          {
            label: 'Review Input',
            action: () => this.highlightInvalidFields(context),
            type: 'primary'
          }
        ]
      };
    }

    // Handle workflow execution errors
    if (context?.operation === 'workflow_execution') {
      return {
        id,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        title: 'Workflow Execution Failed',
        message: this.formatExecutionMessage(error.message),
        technicalDetails: error.message,
        timestamp,
        context,
        retryable: true,
        recoveryActions: [
          {
            label: 'Retry Workflow',
            action: () => this.retryWorkflowExecution(context),
            type: 'primary'
          },
          {
            label: 'Check Workflow',
            action: () => this.validateWorkflow(context),
            type: 'secondary'
          }
        ]
      };
    }

    // Generic error handling
    return {
      id,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      title: 'Unexpected Error',
      message: this.formatGenericMessage(error.message || 'An unexpected error occurred'),
      technicalDetails: error.stack || error.message,
      timestamp,
      context,
      retryable: false,
      recoveryActions: [
        {
          label: 'Reload Application',
          action: () => window.location.reload(),
          type: 'secondary'
        }
      ]
    };
  }

  /**
   * Create HTTP-specific error
   */
  private createHttpError(id: string, status: number, error: any, context?: Record<string, any>, timestamp?: number): AppError {
    const baseError = {
      id,
      timestamp: timestamp || Date.now(),
      context,
      technicalDetails: error.response?.data?.detail || error.message
    };

    switch (status) {
      case 400:
        return {
          ...baseError,
          category: ErrorCategory.USER_INPUT,
          severity: ErrorSeverity.MEDIUM,
          title: 'Invalid Request',
          message: 'The request contains invalid data. Please check your input and try again.',
          retryable: false,
          recoveryActions: [
            {
              label: 'Review Input',
              action: () => this.highlightInvalidFields(context),
              type: 'primary'
            }
          ]
        };

      case 401:
        return {
          ...baseError,
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          title: 'Authentication Required',
          message: 'You need to log in to perform this action.',
          retryable: false,
          recoveryActions: [
            {
              label: 'Sign In',
              action: () => this.redirectToLogin(),
              type: 'primary'
            }
          ]
        };

      case 403:
        return {
          ...baseError,
          category: ErrorCategory.PERMISSION,
          severity: ErrorSeverity.HIGH,
          title: 'Access Denied',
          message: 'You do not have permission to perform this action.',
          retryable: false
        };

      case 404:
        return {
          ...baseError,
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.MEDIUM,
          title: 'Resource Not Found',
          message: 'The requested resource could not be found. It may have been moved or deleted.',
          retryable: true,
          recoveryActions: [
            {
              label: 'Refresh',
              action: () => this.retryLastOperation(context),
              type: 'primary'
            }
          ]
        };

      case 500:
        return {
          ...baseError,
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.CRITICAL,
          title: 'Server Error',
          message: 'An internal server error occurred. Our team has been notified.',
          retryable: true,
          recoveryActions: [
            {
              label: 'Try Again',
              action: () => this.retryLastOperation(context),
              type: 'primary'
            },
            {
              label: 'Report Issue',
              action: () => this.reportError(baseError as AppError),
              type: 'secondary'
            }
          ]
        };

      default:
        return {
          ...baseError,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          title: `HTTP ${status} Error`,
          message: 'A network error occurred. Please try again.',
          retryable: true,
          recoveryActions: [
            {
              label: 'Retry',
              action: () => this.retryLastOperation(context),
              type: 'primary'
            }
          ]
        };
    }
  }

  /**
   * Show appropriate user notification based on error severity
   */
  private showUserNotification(error: AppError): void {
    const message = `${error.title}: ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.LOW:
        toast(message, { 
          duration: 3000,
          icon: 'ℹ️'
        });
        break;
      case ErrorSeverity.MEDIUM:
        toast.error(message, { 
          duration: 5000 
        });
        break;
      case ErrorSeverity.HIGH:
        toast.error(message, { 
          duration: 8000 
        });
        break;
      case ErrorSeverity.CRITICAL:
        toast.error(message, { 
          duration: 0 // Stay until dismissed
        });
        break;
    }
  }

  /**
   * Format messages for better user experience
   */
  private formatValidationMessage(message: string): string {
    if (message.includes('required')) return 'Please fill in all required fields.';
    if (message.includes('format')) return 'Please check the format of your input.';
    if (message.includes('length')) return 'Input length is outside allowed range.';
    return message;
  }

  private formatExecutionMessage(message: string): string {
    if (message.includes('timeout')) return 'The operation took too long to complete. Please try again.';
    if (message.includes('permission')) return 'Insufficient permissions to execute workflow.';
    if (message.includes('connection')) return 'Unable to connect to automation services.';
    return message;
  }

  private formatGenericMessage(message: string): string {
    // Remove technical jargon and make user-friendly
    return message
      .replace(/\b(undefined|null|TypeError|ReferenceError)\b/g, 'system error')
      .replace(/at .+:\d+:\d+/g, '')
      .trim();
  }

  /**
   * Recovery action implementations
   */
  private async retryLastOperation(context?: Record<string, any>): Promise<void> {
    if (context?.retryFunction && typeof context.retryFunction === 'function') {
      await context.retryFunction();
    }
  }

  private async retryWorkflowExecution(context?: Record<string, any>): Promise<void> {
    if (context?.workflowId && context?.executeFunction) {
      await context.executeFunction(context.workflowId);
    }
  }

  private validateWorkflow(context?: Record<string, any>): void {
    if (context?.validateFunction && typeof context.validateFunction === 'function') {
      context.validateFunction();
    }
  }

  private highlightInvalidFields(context?: Record<string, any>): void {
    // Implementation would highlight invalid form fields
    console.log('Highlighting invalid fields:', context);
  }

  private checkNetworkStatus(): void {
    navigator.onLine
      ? toast.success('Network connection is active')
      : toast.error('No network connection detected');
  }

  private redirectToLogin(): void {
    // Implementation would redirect to login page
    console.log('Redirecting to login page');
  }

  private reportError(error: AppError): void {
    // Implementation would send error report
    console.log('Reporting error:', error);
    toast.success('Error report sent. Thank you!');
  }

  /**
   * Error management
   */
  private addError(error: AppError): void {
    this.errors.set(error.id, error);
    this.notifyListeners();
  }

  public dismissError(errorId: string): void {
    this.errors.delete(errorId);
    this.notifyListeners();
  }

  public clearAllErrors(): void {
    this.errors.clear();
    this.notifyListeners();
  }

  public getErrors(): AppError[] {
    return Array.from(this.errors.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.getErrors().filter(error => error.category === category);
  }

  /**
   * Subscribe to error updates
   */
  public subscribe(listener: (errors: AppError[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const errors = this.getErrors();
    this.listeners.forEach(listener => listener(errors));
  }

  /**
   * Async operation wrapper with error handling
   */
  public async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<{ data?: T; error?: AppError }> {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const appError = this.handleError(error, context);
      return { error: appError };
    }
  }
}

export const errorHandlingService = new ErrorHandlingService();