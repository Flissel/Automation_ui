/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DESCRIPTION: string
  readonly VITE_DEV_MODE: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_WEBSOCKET: string
  readonly VITE_ENABLE_AUTOSAVE: string
  readonly VITE_ENABLE_COLLABORATION: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_DEFAULT_THEME: string
  readonly VITE_ENABLE_DARK_MODE: string
  readonly VITE_ANIMATION_DURATION: string
  readonly VITE_MAX_NODES: string
  readonly VITE_MAX_EDGES: string
  readonly VITE_EXECUTION_TIMEOUT: string
  readonly VITE_AUTOSAVE_INTERVAL: string
  readonly VITE_ENABLE_CSP: string
  readonly VITE_SECURE_COOKIES: string
  readonly VITE_ENABLE_HOT_RELOAD: string
  readonly VITE_ENABLE_DEV_TOOLS: string
  readonly VITE_SHOW_GRID: string
  readonly VITE_SHOW_DEBUG_INFO: string
  readonly VITE_WEBSOCKET_RECONNECT_INTERVAL: string
  readonly VITE_CORS_ENABLED: string
  readonly VITE_MOCK_API: string
  readonly VITE_ENABLE_STORYBOOK: string
  readonly VITE_ENABLE_TESTING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// React DevTools global hook
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any
  }
}