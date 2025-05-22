import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for making API requests
 * @param {Function} apiFunction - Function that makes the API request
 * @param {boolean} immediate - Whether to call the API immediately
 * @param {Array} deps - Dependencies for the API call
 * @returns {Object} - API state and handlers
 */
const useApi = (apiFunction, immediate = false, deps = []) => {
  const { getAccessToken, isTokenExpiring, refreshAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Check if component is mounted
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Execute the API call
  const execute = useCallback(async (...args) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if token is about to expire and refresh if needed
      if (isTokenExpiring()) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await refreshAccessToken(refreshToken);
        }
      }
      
      const token = getAccessToken();
      const result = await apiFunction(...args, token);
      
      if (isMounted.current) {
        setData(result.data || result);
        return result.data || result;
      }
    } catch (err) {
      console.error('API error:', err);
      
      if (isMounted.current) {
        setError(err.response?.data?.detail || err.message || 'An error occurred');
      }
      
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [apiFunction, loading, getAccessToken, isTokenExpiring, refreshAccessToken]);

  // Call API immediately if immediate is true
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...deps]);

  return { data, loading, error, execute, setData };
};

export default useApi;

