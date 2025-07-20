/**
 * Loading State Service
 * Centralized management of loading states across the application
 */

export interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
  timestamp: number;
}

class LoadingStateService {
  private loadingStates: Map<string, LoadingState> = new Map();
  private listeners: ((states: LoadingState[]) => void)[] = [];

  /**
   * Start a loading operation
   */
  startLoading(
    id: string,
    message: string,
    options?: {
      progress?: number;
      cancellable?: boolean;
      onCancel?: () => void;
    }
  ): void {
    const loadingState: LoadingState = {
      id,
      message,
      progress: options?.progress,
      cancellable: options?.cancellable || false,
      onCancel: options?.onCancel,
      timestamp: Date.now()
    };

    this.loadingStates.set(id, loadingState);
    this.notifyListeners();
  }

  /**
   * Update loading progress
   */
  updateProgress(id: string, progress: number, message?: string): void {
    const state = this.loadingStates.get(id);
    if (state) {
      state.progress = progress;
      if (message) {
        state.message = message;
      }
      this.loadingStates.set(id, state);
      this.notifyListeners();
    }
  }

  /**
   * Stop a loading operation
   */
  stopLoading(id: string): void {
    this.loadingStates.delete(id);
    this.notifyListeners();
  }

  /**
   * Stop all loading operations
   */
  stopAllLoading(): void {
    this.loadingStates.clear();
    this.notifyListeners();
  }

  /**
   * Check if a specific operation is loading
   */
  isLoading(id: string): boolean {
    return this.loadingStates.has(id);
  }

  /**
   * Check if any operation is loading
   */
  isAnyLoading(): boolean {
    return this.loadingStates.size > 0;
  }

  /**
   * Get all current loading states
   */
  getLoadingStates(): LoadingState[] {
    return Array.from(this.loadingStates.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Subscribe to loading state changes
   */
  subscribe(listener: (states: LoadingState[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const states = this.getLoadingStates();
    this.listeners.forEach(listener => listener(states));
  }

  /**
   * Async operation wrapper with loading state
   */
  async withLoading<T>(
    id: string,
    message: string,
    operation: () => Promise<T>,
    options?: {
      cancellable?: boolean;
      onCancel?: () => void;
      progressCallback?: (progress: number, message?: string) => void;
    }
  ): Promise<T> {
    this.startLoading(id, message, options);

    try {
      const result = await operation();
      this.stopLoading(id);
      return result;
    } catch (error) {
      this.stopLoading(id);
      throw error;
    }
  }
}

export const loadingStateService = new LoadingStateService();