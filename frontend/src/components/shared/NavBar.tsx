import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { getNavItemsForRole } from '../../utils/permissions';
import { UserRole } from '../../types';
import { authService } from '../../services/api';

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [navItems, setNavItems] = useState<Array<{ path: string; label: string }>>([]);
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Get user role from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = user.role as UserRole;
        setNavItems(getNavItemsForRole(role));
        setUserName(user.name || user.email.split('@')[0]);
        setUserRole(role);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    authService.removeToken();
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-dark-surface via-gray-800/50 to-dark-surface border-b border-dark-border/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center space-x-8 h-20">
          {/* Logo Only - Bigger */}
          <Link 
            to="/dashboard" 
            className="flex items-center hover:scale-105 transition-transform duration-300"
          >
            <img 
              src="/logo_dealflow.png" 
              alt="DealFlow360 Logo" 
              className="h-16 w-auto"
              onError={(e) => {
                // Fallback to text if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </Link>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    relative px-4 py-2 rounded-md text-sm font-medium 
                    transition-all duration-300
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30'
                        : 'text-dark-muted hover:text-dark-text hover:bg-gradient-to-r hover:from-dark-border/50 hover:to-gray-700/50'
                    }
                  `}
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-purple-600"></div>
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* User menu with logout */}
          <div className="ml-auto relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dark-border/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold group-hover:scale-110 group-hover:shadow-glow-primary transition-all duration-300">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-dark-text">{userName}</div>
                <div className="text-xs text-dark-muted capitalize">{userRole.toLowerCase()}</div>
              </div>
              <svg 
                className={`w-4 h-4 text-dark-muted transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-dark-surface border border-dark-border shadow-xl shadow-black/50 animate-fade-in z-50">
                <div className="p-3 border-b border-dark-border">
                  <div className="text-sm font-medium text-dark-text">{userName}</div>
                  <div className="text-xs text-dark-muted capitalize">{userRole.toLowerCase()}</div>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
