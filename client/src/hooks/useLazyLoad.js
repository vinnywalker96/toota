import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for lazy loading components or data
 * @param {Function} loader - Function that returns a promise resolving to the component or data
 * @param {boolean} immediate - Whether to load immediately or wait for trigger
 * @returns {Object} - Object containing loaded component/data, loading state, error, and load function
 */
const useLazyLoad = (loader, immediate = false) => {
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (loading || loaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await loader();
      setLoaded(result);
      
      return result;
    } catch (err) {
      console.error('Error lazy loading:', err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loader, loading, loaded]);

  useEffect(() => {
    if (immediate) {
      load();
    }
  }, [immediate, load]);

  return { loaded, loading, error, load };
};

export default useLazyLoad;

