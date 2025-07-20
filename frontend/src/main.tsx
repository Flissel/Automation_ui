import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { errorLogger, ErrorCodes } from './utils/errorHandling'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: 1,
    },
  },
})

// Error boundary for development
if (import.meta.env.DEV) {
  // Enable React DevTools safely
  if (typeof window !== 'undefined') {
    try {
      if (!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
          value: {},
          writable: true,
          configurable: true
        })
      }
    } catch (error) {
      // Silently ignore if React DevTools hook cannot be set
      // This can happen when the property is read-only
    }
  }
}

// Global error handling with structured logging
window.addEventListener('error', (event) => {
  errorLogger.logError(
    event.error || new Error(event.message),
    ErrorCodes.UNHANDLED_ERROR,
    {
      component: 'Global',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    },
    'high'
  )
})

window.addEventListener('unhandledrejection', (event) => {
  errorLogger.logError(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    ErrorCodes.UNHANDLED_PROMISE_REJECTION,
    { component: 'Global' },
    'high'
  )
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
)