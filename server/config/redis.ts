import Redis from 'ioredis';
import { CONFIG } from './config';

// Create Redis connection for BullMQ
export const redisConnection = new Redis(CONFIG.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true
});

// Create separate Redis connection for pub/sub
export const redisPubSub = new Redis(CONFIG.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis (BullMQ)');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error (BullMQ):', err);
});

redisPubSub.on('connect', () => {
  console.log('✅ Connected to Redis (Pub/Sub)');
});

redisPubSub.on('error', (err) => {
  console.error('❌ Redis connection error (Pub/Sub):', err);
});
