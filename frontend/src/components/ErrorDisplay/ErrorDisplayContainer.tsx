import React, { useEffect, useState } from 'react';
import { errorHandlingService, AppError } from '../../services/ErrorHandlingService';
import { loadingStateService, LoadingState } from '../../services/LoadingStateService';
import ErrorNotification from './ErrorNotification';
import './ErrorDisplay.css';

const LoadingNotification: React.FC<{ state: LoadingState }> = ({ state }) => {
  return (
    <div className="loading-state">
      <div className="loading-header">
        <span className="loading-message">{state.message}</span>
        {state.cancellable && state.onCancel && (
          <button className="loading-cancel" onClick={state.onCancel}>
            Cancel
          </button>
        )}
      </div>
      <div className="loading-progress">
        <div 
          className={`loading-progress-bar ${state.progress === undefined ? 'loading-progress-indeterminate' : ''}`}
          style={{ 
            width: state.progress !== undefined ? `${state.progress}%` : '30%' 
          }}
        />
      </div>
    </div>
  );
};

const ErrorDisplayContainer: React.FC = () => {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);

  useEffect(() => {
    // Subscribe to error updates
    const unsubscribeErrors = errorHandlingService.subscribe((newErrors) => {
      setErrors(newErrors);
    });

    // Subscribe to loading state updates
    const unsubscribeLoading = loadingStateService.subscribe((newStates) => {
      setLoadingStates(newStates);
    });

    // Initial data load
    setErrors(errorHandlingService.getErrors());
    setLoadingStates(loadingStateService.getLoadingStates());

    return () => {
      unsubscribeErrors();
      unsubscribeLoading();
    };
  }, []);

  const handleDismissError = (errorId: string) => {
    errorHandlingService.dismissError(errorId);
  };

  return (
    <>
      {/* Error Notifications */}
      {errors.length > 0 && (
        <div className="error-notifications-container">
          {errors.slice(0, 5).map((error) => (
            <ErrorNotification
              key={error.id}
              error={error}
              onDismiss={() => handleDismissError(error.id)}
            />
          ))}
        </div>
      )}

      {/* Loading States */}
      {loadingStates.length > 0 && (
        <div className="loading-states-container">
          {loadingStates.map((state) => (
            <LoadingNotification key={state.id} state={state} />
          ))}
        </div>
      )}
    </>
  );
};

export default ErrorDisplayContainer;