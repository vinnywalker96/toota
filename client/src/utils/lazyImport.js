import React, { lazy, Suspense } from 'react';

/**
 * Creates a lazy-loaded component with a loading fallback
 * @param {Function} importFunc - Dynamic import function
 * @param {string} componentName - Name of the component to import
 * @param {React.ReactNode} fallback - Fallback component to show while loading
 * @returns {React.LazyExoticComponent} - Lazy-loaded component
 */
export const lazyImport = (importFunc, componentName = null, fallback = null) => {
  const LazyComponent = lazy(async () => {
    const module = await importFunc();
    return componentName ? { default: module[componentName] } : module;
  });

  return (props) => (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

export default lazyImport;

