export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  getWaitTime(tokens: number = 1): number {
    this.refill();
    
    if (this.tokens >= tokens) {
      return 0;
    }
    
    const tokensNeeded = tokens - this.tokens;
    return (tokensNeeded / this.refillRate) * 1000; // milliseconds
  }
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();

  constructor(
    private defaultCapacity: number = 100,
    private defaultRefillRate: number = 10 // tokens per second
  ) {}

  async checkLimit(key: string, tokens: number = 1): Promise<void> {
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = new TokenBucket(this.defaultCapacity, this.defaultRefillRate);
      this.buckets.set(key, bucket);
    }

    if (!bucket.consume(tokens)) {
      const waitTime = bucket.getWaitTime(tokens);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime)}ms before retrying.`);
    }
  }

  getStatus(key: string): { available: number; waitTime: number } {
    const bucket = this.buckets.get(key);
    
    if (!bucket) {
      return { available: this.defaultCapacity, waitTime: 0 };
    }

    return {
      available: bucket.getAvailableTokens(),
      waitTime: bucket.getWaitTime(1)
    };
  }
}
