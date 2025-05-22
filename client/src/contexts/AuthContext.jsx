import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!accessToken) {
          setLoading(false);
          return;
        }
        
        // Decode the token to get user info
        const decodedToken = jwtDecode(accessToken);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp < currentTime) {
          // Token is expired, handle refresh or logout
          if (refreshToken) {
            refreshAccessToken(refreshToken);
          } else {
            logout();
          }
        } else {
          // Token is valid, set user
          setUser({
            id: decodedToken.user_id || decodedToken.id,
            email: decodedToken.email,
            role: decodedToken.role || getUserRoleFromToken(decodedToken),
            exp: decodedToken.exp
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Authentication failed');
        setLoading(false);
        logout();
      }
    };

    initializeAuth();
  }, []);

  // Helper function to determine user role from token
  const getUserRoleFromToken = (decodedToken) => {
    // Implement logic to determine role based on token claims
    if (decodedToken.is_driver) return 'driver';
    if (decodedToken.is_admin) return 'admin';
    return 'user';
  };

  // Refresh token function
  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/api/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.access);
      
      // Update user state with new token info
      const decodedToken = jwtDecode(data.access);
      setUser({
        id: decodedToken.user_id || decodedToken.id,
        email: decodedToken.email,
        role: decodedToken.role || getUserRoleFromToken(decodedToken),
        exp: decodedToken.exp
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error refreshing token:', err);
      setError('Session expired. Please login again.');
      logout();
    }
  };

  // Login function
  const login = useCallback((accessToken, refreshToken) => {
    try {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      const decodedToken = jwtDecode(accessToken);
      setUser({
        id: decodedToken.user_id || decodedToken.id,
        email: decodedToken.email,
        role: decodedToken.role || getUserRoleFromToken(decodedToken),
        exp: decodedToken.exp
      });
      
      setError(null);
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
      logout();
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!user;
  }, [user]);

  // Get access token
  const getAccessToken = useCallback(() => {
    return localStorage.getItem('accessToken');
  }, []);

  // Check if token is about to expire
  const isTokenExpiring = useCallback(() => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return false;
      
      const decodedToken = jwtDecode(accessToken);
      const currentTime = Date.now() / 1000;
      
      // Check if token will expire in the next 5 minutes
      return decodedToken.exp - currentTime < 300;
    } catch (err) {
      console.error('Error checking token expiration:', err);
      return false;
    }
  }, []);

  // Value to be provided by the context
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    getAccessToken,
    isTokenExpiring,
    refreshAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

