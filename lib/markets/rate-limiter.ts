/**
 * Rate limiter for Finnhub API
 * Limits to 60 requests per minute (1 request per second)
 */

class RateLimiter {
  private queue: Array<{ fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = []
  private processing = false
  private lastRequestTime = 0
  private readonly minInterval = 1100 // 1.1 seconds = 1100ms (slightly more than 1s to be safe)
  private requestCount = 0
  private resetTime = Date.now() + 60000 // Reset counter every minute

  /**
   * Add a request to the queue
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Process the queue respecting rate limits
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Reset counter every minute
      if (Date.now() > this.resetTime) {
        this.requestCount = 0
        this.resetTime = Date.now() + 60000
      }

      // Check if we've hit the limit
      if (this.requestCount >= 60) {
        const waitTime = this.resetTime - Date.now()
        if (waitTime > 0) {
          console.log(`Rate limit reached (60/min). Waiting ${Math.ceil(waitTime / 1000)} seconds...`)
          await this.sleep(waitTime)
          this.requestCount = 0
          this.resetTime = Date.now() + 60000
        }
      }

      // Ensure minimum interval between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest
        await this.sleep(waitTime)
      }

      // Execute the next request
      const request = this.queue.shift()
      if (request) {
        this.lastRequestTime = Date.now()
        this.requestCount++
        
        try {
          const result = await request.fn()
          request.resolve(result)
        } catch (error) {
          request.reject(error)
        }
      }
    }

    this.processing = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      requestCount: this.requestCount,
      resetIn: Math.max(0, this.resetTime - Date.now()),
    }
  }
}

// Singleton instance
export const finnhubRateLimiter = new RateLimiter()

