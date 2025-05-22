/**
 * Utility for optimizing images
 */

/**
 * Resize an image to the specified dimensions
 * @param {File|Blob} file - Image file or blob
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {string} format - Output format (jpeg, png, webp)
 * @param {number} quality - Output quality (0-1)
 * @returns {Promise<Blob>} - Resized image blob
 */
export const resizeImage = (file, maxWidth = 800, maxHeight = 600, format = 'jpeg', quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // Create file reader
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      // Create image element
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, `image/${format}`, quality);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * Convert an image to a base64 data URL
 * @param {File|Blob} file - Image file or blob
 * @returns {Promise<string>} - Base64 data URL
 */
export const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      resolve(reader.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to convert image to base64'));
    };
  });
};

/**
 * Convert a base64 data URL to a blob
 * @param {string} base64 - Base64 data URL
 * @returns {Blob} - Blob object
 */
export const base64ToBlob = (base64) => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
};

/**
 * Get image dimensions
 * @param {File|Blob|string} image - Image file, blob, or URL
 * @returns {Promise<{width: number, height: number}>} - Image dimensions
 */
export const getImageDimensions = (image) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    if (typeof image === 'string') {
      // Image URL
      img.src = image;
    } else {
      // File or Blob
      img.src = URL.createObjectURL(image);
    }
    
    img.onload = () => {
      const dimensions = {
        width: img.width,
        height: img.height
      };
      
      if (typeof image !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      
      resolve(dimensions);
    };
    
    img.onerror = () => {
      if (typeof image !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      
      reject(new Error('Failed to load image'));
    };
  });
};

export default {
  resizeImage,
  imageToBase64,
  base64ToBlob,
  getImageDimensions
};

