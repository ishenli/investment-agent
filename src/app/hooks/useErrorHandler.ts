import { useState, useCallback } from 'react';

interface ErrorState {
  message: string | null;
  type: string | null;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState>({ message: null, type: null });
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: any, defaultMessage: string = '操作失败') => {
    console.error('Error occurred:', error);
    
    let errorMessage = defaultMessage;
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = 'javascript_error';
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorType = 'string_error';
    } else if (error && typeof error === 'object') {
      if ('message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      if ('type' in error) {
        errorType = (error as { type: string }).type;
      }
    }
    
    setError({ message: errorMessage, type: errorType });
  }, []);

  const clearError = useCallback(() => {
    setError({ message: null, type: null });
  }, []);

  const withLoading = useCallback(async <T,>(asyncFunction: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await asyncFunction();
      return result;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  return {
    error: error.message,
    errorType: error.type,
    isLoading,
    handleError,
    clearError,
    withLoading,
  };
};