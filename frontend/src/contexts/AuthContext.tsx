import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api';
import { UserRole } from '../types';

interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  // Role-based permission helpers
  canCreateQuotation: () => boolean;
  canEditQuotation: () => boolean;
  canManageFulfillment: () => boolean;
  canViewPlatformStats: () => boolean;
  canManageUsers: () => boolean;
  canApproveQuotations: () => boolean;
  canManageProducts: () => boolean;
  canRespondToCustomer: () => boolean;
  canExportPDF: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-login: Check if user is already logged in on mount
    const initAuth = async () => {
      const token = authService.getToken();
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Try to parse stored user first (faster)
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // Optionally verify token in background
          fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).then(response => {
            if (!response.ok) {
              // Token is invalid or expired, clear it
              authService.removeToken();
              localStorage.removeItem('user');
              setUser(null);
            }
          }).catch(error => {
            console.error('Token verification failed:', error);
            // Don't clear immediately, let user continue
          });
        } catch (error) {
          console.error('Failed to parse user data:', error);
          // Clear invalid data
          authService.removeToken();
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      authService.setToken(response.token);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.removeToken();
    setUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Role-based permission helpers
  const canCreateQuotation = (): boolean => {
    return hasRole(['REP', 'MANAGER', 'ADMIN']);
  };

  const canEditQuotation = (): boolean => {
    return hasRole(['REP', 'MANAGER', 'ADMIN']);
  };

  const canManageFulfillment = (): boolean => {
    return hasRole(['FINANCE', 'ADMIN']);
  };

  const canViewPlatformStats = (): boolean => {
    return hasRole(['MANAGER', 'ADMIN']);
  };

  const canManageUsers = (): boolean => {
    return hasRole(['ADMIN']);
  };

  const canApproveQuotations = (): boolean => {
    return hasRole(['MANAGER', 'FINANCE', 'ADMIN']);
  };

  const canManageProducts = (): boolean => {
    return hasRole(['MANAGER', 'ADMIN']);
  };

  const canRespondToCustomer = (): boolean => {
    return hasRole(['REP', 'MANAGER', 'ADMIN']);
  };

  const canExportPDF = (): boolean => {
    return hasRole(['REP', 'MANAGER', 'FINANCE', 'ADMIN']);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      hasRole,
      canCreateQuotation,
      canEditQuotation,
      canManageFulfillment,
      canViewPlatformStats,
      canManageUsers,
      canApproveQuotations,
      canManageProducts,
      canRespondToCustomer,
      canExportPDF,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
