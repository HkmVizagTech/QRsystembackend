const IORedis = require('ioredis');

// Connect to Redis. In production on GCP, point this to MemoryStore or Serverless Redis (Upstash)
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    console.warn('[REDIS] Connection Warning:', err.message);
});

module.exports = connection;
