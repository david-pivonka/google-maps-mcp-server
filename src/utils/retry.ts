export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    jitter = true,
    retryCondition = (error) => {
      // Retry on 5xx errors, 429 (rate limit), and network errors
      if (error.response) {
        const status = error.response.status;
        return status >= 500 || status === 429;
      }
      // Retry on network errors
      return error.code === 'ECONNREFUSED' || 
             error.code === 'ENOTFOUND' || 
             error.code === 'ETIMEDOUT';
    }
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryCondition(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      // Check for Retry-After header
      if ((error as any).response?.headers?.['retry-after']) {
        const retryAfter = parseInt((error as any).response.headers['retry-after']);
        if (!isNaN(retryAfter)) {
          delay = Math.max(delay, retryAfter * 1000);
        }
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
