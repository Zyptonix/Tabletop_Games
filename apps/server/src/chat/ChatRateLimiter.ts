export class ChatRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    private readonly maxMessages: number,
    private readonly windowMs: number
  ) {}

  allow(userId: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(userId)?.filter((time) => now - time < this.windowMs) ?? [];
    if (bucket.length >= this.maxMessages) {
      this.buckets.set(userId, bucket);
      return false;
    }

    bucket.push(now);
    this.buckets.set(userId, bucket);
    return true;
  }
}
