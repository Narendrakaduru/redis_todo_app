const { Redis } = require('ioredis');
require('dotenv').config();

const client = new Redis(process.env.REDIS_URL);

client.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

module.exports = client;