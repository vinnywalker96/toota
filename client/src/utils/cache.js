/**
 * Simple in-memory cache with expiration
 */
class Cache {
  constructor(defaultTTL = 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    return value;
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined if not found or expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} - Whether the key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   * @param {string} key - Cache key
   * @returns {boolean} - Whether the key was deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get all keys in the cache
   * @returns {string[]} - Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get the number of items in the cache
   * @returns {number} - Number of items
   */
  size() {
    return this.cache.size;
  }

  /**
   * Remove all expired items from the cache
   * @returns {number} - Number of items removed
   */
  prune() {
    const now = Date.now();
    let count = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get or set a value in the cache
   * @param {string} key - Cache key
   * @param {Function} factory - Function to create the value if not in cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<*>} - Cached or newly created value
   */
  async getOrSet(key, factory, ttl = this.defaultTTL) {
    const cachedValue = this.get(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    
    return value;
  }
}

// Create singleton instance
const cache = new Cache();

export default cache;

