// Enhanced type definitions for API responses and error handling

// Base error types
export interface APIError {
  name: string;
  message: string;
  status?: number;
  code?: string;
  retryable: boolean;
}

export function createAPIError(
  message: string,
  status?: number,
  code?: string,
  retryable: boolean = false
): APIError {
  return {
    name: 'APIError',
    message,
    status,
    code,
    retryable
  };
}

export function createNetworkError(message: string): APIError {
  return createAPIError(message, undefined, 'NETWORK_ERROR', true);
}

export function createTimeoutError(message: string): APIError {
  return createAPIError(message, 408, 'TIMEOUT', true);
}

export function createValidationError(message: string, field?: string): APIError & { field?: string } {
  return {
    ...createAPIError(message, 400, 'VALIDATION_ERROR', false),
    field
  };
}

export function createCircuitBreakerError(message: string, nextRetryTime?: number): APIError & { nextRetryTime?: number } {
  return {
    ...createAPIError(message, 503, 'CIRCUIT_BREAKER_OPEN', false),
    nextRetryTime
  };
}

// API Response wrapper types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: APIError;
  timestamp: number;
  requestId?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

// Enhanced HackerNews types with strict validation
export interface HackerNewsItemBase {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by?: string;
  time: number;
  deleted?: boolean;
  dead?: boolean;
}

export interface HackerNewsStory extends HackerNewsItemBase {
  type: 'story';
  title: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
}

export interface HackerNewsComment extends HackerNewsItemBase {
  type: 'comment';
  text: string;
  parent: number;
  kids?: number[];
}

export interface HackerNewsJob extends HackerNewsItemBase {
  type: 'job';
  title: string;
  url?: string;
  text?: string;
}

export interface HackerNewsPoll extends HackerNewsItemBase {
  type: 'poll';
  title: string;
  text?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  parts?: number[];
}

export interface HackerNewsPollOption extends HackerNewsItemBase {
  type: 'pollopt';
  text: string;
  score?: number;
  poll: number;
}

// Union type for all HackerNews items
export type HackerNewsItem = 
  | HackerNewsStory 
  | HackerNewsComment 
  | HackerNewsJob 
  | HackerNewsPoll 
  | HackerNewsPollOption;

// Type guards for runtime validation
export function isStory(item: HackerNewsItem): item is HackerNewsStory {
  return item.type === 'story';
}

export function isComment(item: HackerNewsItem): item is HackerNewsComment {
  return item.type === 'comment';
}

export function isJob(item: HackerNewsItem): item is HackerNewsJob {
  return item.type === 'job';
}

export function isPoll(item: HackerNewsItem): item is HackerNewsPoll {
  return item.type === 'poll';
}

export function isPollOption(item: HackerNewsItem): item is HackerNewsPollOption {
  return item.type === 'pollopt';
}

// Validation functions
export function validateStoryId(id: unknown): number {
  if (typeof id !== 'number' || id <= 0 || !Number.isInteger(id)) {
    throw createValidationError('Story ID must be a positive integer', 'id');
  }
  return id;
}

export function validateUrl(url: unknown): string {
  if (typeof url !== 'string' || url.trim() === '') {
    throw createValidationError('URL must be a non-empty string', 'url');
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw createValidationError('URL must use HTTP or HTTPS protocol', 'url');
    }
    return url;
  } catch {
    throw createValidationError('URL must be valid', 'url');
  }
}

export function validateHackerNewsItem(item: unknown): HackerNewsItem {
  if (!item || typeof item !== 'object') {
    throw createValidationError('Item must be an object');
  }

  const obj = item as Record<string, unknown>;

  // Validate required fields
  if (typeof obj.id !== 'number' || obj.id <= 0) {
    throw createValidationError('Item must have a valid ID');
  }

  if (!['story', 'comment', 'job', 'poll', 'pollopt'].includes(obj.type as string)) {
    throw createValidationError('Item must have a valid type');
  }

  if (typeof obj.time !== 'number' || obj.time <= 0) {
    throw createValidationError('Item must have a valid timestamp');
  }

  // Type-specific validation
  const type = obj.type as string;
  
  if (type === 'story' && typeof obj.title !== 'string') {
    throw createValidationError('Story must have a title');
  }

  if (type === 'comment' && (typeof obj.text !== 'string' || typeof obj.parent !== 'number')) {
    throw createValidationError('Comment must have text and parent');
  }

  return obj as unknown as HackerNewsItem;
}

// Enhanced error handler
export function handleAPIError(error: unknown): APIError {
  if (error && typeof error === 'object' && 'name' in error && error.name === 'APIError') {
    return error as APIError;
  }

  if (error instanceof Error) {
    // Handle specific axios errors
    if ('code' in error) {
      const axiosError = error as Error & { code?: string };
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return createTimeoutError(`Request timeout: ${error.message}`);
      }
      
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        return createNetworkError(`Network error: ${error.message}`);
      }
    }

    // Handle HTTP errors
    if ('response' in error) {
      const httpError = error as Error & { response?: { status?: number; statusText?: string } };
      const status = httpError.response?.status;
      const statusText = httpError.response?.statusText || 'Unknown error';
      
      return createAPIError(
        `HTTP ${status}: ${statusText}`,
        status || 0,
        `HTTP_${status || 0}`,
        (status || 0) >= 500 || status === 429 // Server errors and rate limits are retryable
      );
    }

    return createAPIError(error.message);
  }

  return createAPIError('Unknown error occurred');
}

// Result type for better error handling
export type Result<T, E = APIError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function createSuccessResult<T>(data: T): Result<T> {
  return { success: true, data };
}

export function createErrorResult<T>(error: APIError): Result<T> {
  return { success: false, error };
}

// Async result wrapper
export async function wrapAsyncResult<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return createSuccessResult(data);
  } catch (error) {
    return createErrorResult(handleAPIError(error));
  }
}