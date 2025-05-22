import { toast } from 'react-toastify';

/**
 * Error types for categorizing errors
 */
export const ErrorTypes = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  SERVER: 'server',
  NOT_FOUND: 'not_found',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

/**
 * Determines the type of error based on the error object
 * @param {Error|Object} error - Error object
 * @returns {string} - Error type
 */
export const getErrorType = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;
  
  // Network errors
  if (error.message === 'Network Error' || !navigator.onLine) {
    return ErrorTypes.NETWORK;
  }
  
  // Axios error with response
  if (error.response) {
    const { status } = error.response;
    
    // Authentication errors
    if (status === 401 || status === 403) {
      return ErrorTypes.AUTH;
    }
    
    // Validation errors
    if (status === 400 || status === 422) {
      return ErrorTypes.VALIDATION;
    }
    
    // Not found errors
    if (status === 404) {
      return ErrorTypes.NOT_FOUND;
    }
    
    // Permission errors
    if (status === 403) {
      return ErrorTypes.PERMISSION;
    }
    
    // Server errors
    if (status >= 500) {
      return ErrorTypes.SERVER;
    }
  }
  
  return ErrorTypes.UNKNOWN;
};

/**
 * Gets a user-friendly error message based on the error object
 * @param {Error|Object} error - Error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  // Get error type
  const errorType = getErrorType(error);
  
  // Return appropriate message based on error type
  switch (errorType) {
    case ErrorTypes.NETWORK:
      return 'Network error. Please check your internet connection and try again.';
    
    case ErrorTypes.AUTH:
      return 'Authentication error. Please log in again.';
    
    case ErrorTypes.VALIDATION:
      // Try to extract validation error messages
      if (error.response?.data?.detail) {
        return error.response.data.detail;
      }
      if (error.response?.data?.message) {
        return error.response.data.message;
      }
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          return errors.join('. ');
        }
        if (typeof errors === 'object') {
          return Object.values(errors).flat().join('. ');
        }
      }
      return 'Validation error. Please check your input and try again.';
    
    case ErrorTypes.NOT_FOUND:
      return 'The requested resource was not found.';
    
    case ErrorTypes.PERMISSION:
      return 'You do not have permission to perform this action.';
    
    case ErrorTypes.SERVER:
      return 'Server error. Please try again later.';
    
    case ErrorTypes.UNKNOWN:
    default:
      return error.message || 'An unknown error occurred';
  }
};

/**
 * Handles an error by logging it and optionally showing a toast notification
 * @param {Error|Object} error - Error object
 * @param {boolean} showToast - Whether to show a toast notification
 * @returns {string} - Error message
 */
export const handleError = (error, showToast = true) => {
  // Get error message
  const errorMessage = getErrorMessage(error);
  
  // Log error
  console.error('Error:', error);
  
  // Show toast notification if requested
  if (showToast) {
    toast.error(errorMessage);
  }
  
  return errorMessage;
};

export default handleError;

