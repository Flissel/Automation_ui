/**
 * Authentication Service for TRAE Unity AI Platform
 * Replaces Supabase with real backend integration
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

class AuthService {
  private baseUrl = 'http://localhost:8091/api/v1';
  private session: AuthSession | null = null;
  private listeners: ((user: User | null, session: AuthSession | null) => void)[] = [];

  constructor() {
    // Load session from localStorage on initialization
    this.loadSession();
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, create a mock session since auth endpoints don't exist yet
      // This will be replaced with real API calls when backend auth is implemented
      const mockUser: User = {
        id: 'user_' + Date.now(),
        email: credentials.email,
        name: credentials.email.split('@')[0],
        role: 'admin',
        createdAt: new Date().toISOString()
      };

      const mockSession: AuthSession = {
        user: mockUser,
        token: 'mock_token_' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      this.setSession(mockSession);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock sign up - in real implementation, this would call the backend
      const mockUser: User = {
        id: 'user_' + Date.now(),
        email: data.email,
        name: data.name || data.email.split('@')[0],
        role: 'user',
        createdAt: new Date().toISOString()
      };

      const mockSession: AuthSession = {
        user: mockUser,
        token: 'mock_token_' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      this.setSession(mockSession);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign up failed' 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      this.setSession(null);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      };
    }
  }

  /**
   * Get current session
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  /**
   * Get current session (alias for compatibility)
   */
  getCurrentSession(): AuthSession | null {
    return this.getSession();
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.session?.user || null;
  }

  /**
   * Get current user (alias for compatibility)
   */
  getCurrentUser(): User | null {
    return this.getUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.session) return false;
    
    // Check if token is expired
    const expiresAt = new Date(this.session.expiresAt);
    return expiresAt > new Date();
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: AuthSession | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): Record<string, string> {
    if (!this.session?.token) return {};
    return {
      'Authorization': `Bearer ${this.session.token}`
    };
  }

  /**
   * Private method to set session and notify listeners
   */
  private setSession(session: AuthSession | null) {
    this.session = session;
    
    // Save to localStorage
    if (session) {
      localStorage.setItem('auth_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('auth_session');
    }

    // Notify all listeners
    this.listeners.forEach(callback => callback(session?.user || null, session));
  }

  /**
   * Private method to load session from localStorage
   */
  private loadSession() {
    try {
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        const session: AuthSession = JSON.parse(stored);
        
        // Check if session is still valid
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt > new Date()) {
          this.session = session;
        } else {
          // Session expired, remove it
          localStorage.removeItem('auth_session');
        }
      }
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
      localStorage.removeItem('auth_session');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;