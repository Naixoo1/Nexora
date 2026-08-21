import { Redis } from '@upstash/redis';

/**
 * Singleton Upstash Redis client.
 * Gracefully returns null if environment variables are missing or unconfigured.
 */
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token || url.startsWith('your-') || token.startsWith('your-')) {
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (err) {
    console.warn('[Upstash Redis Init Error]: Failed to initialize client, failing open:', err);
    return null;
  }
}

export const redis = createRedisClient();
