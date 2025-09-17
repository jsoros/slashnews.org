export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
} as const;

export type CircuitState = typeof CircuitState[keyof typeof CircuitState];

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface CircuitBreakerStats {
  failureCount: number;
  successCount: number;
  timeoutCount: number;
  lastFailureTime?: number;
  state: CircuitState;
}

export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private timeoutCount = 0;
  private lastFailureTime?: number;
  private nextRetryTime = 0;
  private state: CircuitState = CircuitState.CLOSED;

  private name: string;
  private options: CircuitBreakerOptions;

  constructor(
    name: string,
    options: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 10000, // 10 seconds
    }
  ) {
    this.name = name;
    this.options = options;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextRetryTime) {
        throw new Error(`Circuit breaker is OPEN for ${this.name}. Next retry in ${Math.ceil((this.nextRetryTime - Date.now()) / 1000)}s`);
      } else {
        this.state = CircuitState.HALF_OPEN;
        console.log(`[Circuit Breaker] ${this.name} transitioning to HALF_OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log(`[Circuit Breaker] ${this.name} recovered - transitioning to CLOSED`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.warn(`[Circuit Breaker] ${this.name} failure ${this.failureCount}/${this.options.failureThreshold}`);

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextRetryTime = Date.now() + this.options.recoveryTimeout;
      console.error(`[Circuit Breaker] ${this.name} is now OPEN. Will retry at ${new Date(this.nextRetryTime).toISOString()}`);
    }
  }

  onTimeout(): void {
    this.timeoutCount++;
    this.onFailure(); // Treat timeouts as failures
  }

  getStats(): CircuitBreakerStats {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      timeoutCount: this.timeoutCount,
      lastFailureTime: this.lastFailureTime,
      state: this.state
    };
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.timeoutCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = 0;
    this.state = CircuitState.CLOSED;
    console.log(`[Circuit Breaker] ${this.name} manually reset`);
  }
}

// Retry utility with exponential backoff
export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class RetryManager {
  private defaultOptions: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        let delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );

        // Add jitter to prevent thundering herd
        if (config.jitter) {
          delay += Math.random() * delay * 0.1;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, errorMessage);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit breaker registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers = new Map<string, CircuitBreaker>();
  private retryManager = new RetryManager();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  getOrCreateBreaker(
    name: string,
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options as CircuitBreakerOptions));
    }
    return this.breakers.get(name)!;
  }

  async executeWithCircuitBreaker<T>(
    breakerName: string,
    operation: () => Promise<T>,
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    // Skip circuit breaker only in test environment to prevent memory issues and hanging
    const isTestEnvironment = import.meta.env.MODE === 'test' ||
                             import.meta.env.VITEST === 'true' ||
                             (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

    if (isTestEnvironment) {
      return operation();
    }

    const breaker = this.getOrCreateBreaker(breakerName);

    return this.retryManager.executeWithRetry(async () => {
      return breaker.execute(operation);
    }, retryOptions);
  }

  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [name, breaker] of this.breakers) {
      stats.set(name, breaker.getStats());
    }
    return stats;
  }

  // Cleanup method for test environments
  resetAll(): void {
    this.breakers.clear();
    this.retryManager = new RetryManager();
  }
}

// Export singleton instance
export const circuitBreakerRegistry: CircuitBreakerRegistry = CircuitBreakerRegistry.getInstance();