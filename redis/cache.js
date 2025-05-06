const client = require('./client');

// Get from cache
async function getCache(key) {
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

// Set cache with TTL (default: 30s)
async function setCache(key, value, ttl = 30) {
  await client.set(key, JSON.stringify(value), 'EX', ttl);
}

// Clear cache
async function clearCache(key) {
  await client.del(key);
}

module.exports = {
  getCache,
  setCache,
  clearCache,
};