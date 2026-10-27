interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const failedAttempts = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = failedAttempts.get(key);

  if (!record) {
    return { allowed: true };
  }

  // Check if currently locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Reset if window has elapsed
  if (now - record.firstAttemptAt > WINDOW_MS) {
    failedAttempts.delete(key);
    return { allowed: true };
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_MS / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const record = failedAttempts.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    failedAttempts.set(key, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

export function resetLoginRateLimit(key: string): void {
  failedAttempts.delete(key);
}

// Clean up stale entries every 10 minutes
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of failedAttempts.entries()) {
      if (
        (!record.lockedUntil || record.lockedUntil <= now) &&
        now - record.firstAttemptAt > WINDOW_MS
      ) {
        failedAttempts.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
}
