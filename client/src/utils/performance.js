/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
  constructor() {
    this.measures = {};
    this.isEnabled = process.env.NODE_ENV !== 'production';
  }

  /**
   * Start measuring performance for a given label
   * @param {string} label - Label for the measurement
   */
  start(label) {
    if (!this.isEnabled) return;
    
    if (!this.measures[label]) {
      this.measures[label] = {};
    }
    
    this.measures[label].startTime = performance.now();
  }

  /**
   * End measuring performance for a given label
   * @param {string} label - Label for the measurement
   * @param {boolean} log - Whether to log the result
   * @returns {number} - Duration in milliseconds
   */
  end(label, log = true) {
    if (!this.isEnabled) return 0;
    
    if (!this.measures[label] || !this.measures[label].startTime) {
      console.warn(`No start time found for measure: ${label}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - this.measures[label].startTime;
    
    this.measures[label].endTime = endTime;
    this.measures[label].duration = duration;
    
    if (log) {
      console.log(`Performance [${label}]: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Measure the execution time of a function
   * @param {Function} fn - Function to measure
   * @param {string} label - Label for the measurement
   * @param {boolean} log - Whether to log the result
   * @returns {*} - Result of the function
   */
  measure(fn, label, log = true) {
    if (!this.isEnabled) return fn();
    
    this.start(label);
    const result = fn();
    this.end(label, log);
    
    return result;
  }

  /**
   * Measure the execution time of an async function
   * @param {Function} asyncFn - Async function to measure
   * @param {string} label - Label for the measurement
   * @param {boolean} log - Whether to log the result
   * @returns {Promise<*>} - Result of the async function
   */
  async measureAsync(asyncFn, label, log = true) {
    if (!this.isEnabled) return await asyncFn();
    
    this.start(label);
    const result = await asyncFn();
    this.end(label, log);
    
    return result;
  }

  /**
   * Get all measurements
   * @returns {Object} - All measurements
   */
  getAllMeasures() {
    return this.measures;
  }

  /**
   * Clear all measurements
   */
  clearMeasures() {
    this.measures = {};
  }

  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

