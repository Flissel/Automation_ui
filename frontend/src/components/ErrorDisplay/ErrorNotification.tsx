import React, { useEffect, useState } from 'react';
import { errorHandlingService, AppError } from '../../services/ErrorHandlingService';
import './ErrorDisplay.css';

interface ErrorNotificationProps {
  error: AppError;
  onDismiss: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ error, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleRetry = (action: any) => {
    if (action && action.action) {
      action.action();
    }
    handleDismiss();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'MEDIUM':
        return '#eab308';
      case 'LOW':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  return (
    <div 
      className={`error-notification ${isVisible ? 'visible' : ''}`}
      style={{
        borderLeft: `4px solid ${getSeverityColor(error.severity)}`
      }}
    >
      <div className="error-header">
        <div className="error-icon">
          {getSeverityIcon(error.severity)}
        </div>
        <div className="error-title">
          <span className="error-category">{error.category}</span>
          <span className="error-severity" style={{ color: getSeverityColor(error.severity) }}>
            {error.severity}
          </span>
        </div>
        <button className="error-close" onClick={handleDismiss}>
          ×
        </button>
      </div>

      <div className="error-content">
        <div className="error-message">
          {error.message}
        </div>
        
        {error.technicalDetails && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <div className="error-details-content">
              {error.technicalDetails}
            </div>
          </details>
        )}
      </div>

      <div className="error-actions">
        {error.recoveryActions && error.recoveryActions.length > 0 && (
          <>
            {error.recoveryActions.map((action, index) => (
              <button
                key={index}
                className={`error-action-btn ${action.type}`}
                onClick={() => handleRetry(action)}
              >
                {action.type === 'primary' ? '🔄' : '⚙️'} {action.label}
              </button>
            ))}
          </>
        )}
        <button className="error-dismiss-btn" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>

      <div className="error-timestamp">
        {new Date(error.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ErrorNotification;