/**
 * Creates a memoized version of a function
 * @param {Function} fn - Function to memoize
 * @param {Function} keyFn - Optional function to generate cache key
 * @returns {Function} - Memoized function
 */
export function memoize(fn, keyFn = JSON.stringify) {
  const cache = new Map();
  
  return function(...args) {
    const key = keyFn(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Creates a memoized version of an async function
 * @param {Function} asyncFn - Async function to memoize
 * @param {Function} keyFn - Optional function to generate cache key
 * @returns {Function} - Memoized async function
 */
export function memoizeAsync(asyncFn, keyFn = JSON.stringify) {
  const cache = new Map();
  
  return async function(...args) {
    const key = keyFn(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = await asyncFn.apply(this, args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Creates a memoized version of a function with a time-based cache expiration
 * @param {Function} fn - Function to memoize
 * @param {number} ttl - Time to live in milliseconds
 * @param {Function} keyFn - Optional function to generate cache key
 * @returns {Function} - Memoized function with expiration
 */
export function memoizeWithExpiration(fn, ttl = 60000, keyFn = JSON.stringify) {
  const cache = new Map();
  const expirations = new Map();
  
  return function(...args) {
    const key = keyFn(args);
    const now = Date.now();
    
    if (cache.has(key)) {
      const expiration = expirations.get(key);
      
      if (now < expiration) {
        return cache.get(key);
      }
      
      // Clear expired cache entry
      cache.delete(key);
      expirations.delete(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    expirations.set(key, now + ttl);
    
    return result;
  };
}

export default memoize;

