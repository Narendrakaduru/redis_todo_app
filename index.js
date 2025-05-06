const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();
const { getCache, setCache, clearCache } = require('./redis/cache');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL');
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <h2>✅ Todo API is running</h2>
    <p>Access it here: <a href="/todos">/todos</a></p>
  `);
});

// /todos route with Redis cache
app.get('/todos', async (req, res) => {
  try {
    const cached = await getCache('todos');
    if (cached) {
      console.log('📦 Served from Redis');
      return res.json(cached);
    }

    db.query('SELECT * FROM todo', async (err, results) => {
      if (err) {
        console.error('❌ MySQL query error:', err.message);
        return res.status(500).json({ error: 'Database query failed' });
      }

      await setCache('todos', results);
      console.log('💾 Cached to Redis');
      res.json(results);
    });
  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Optional: clear Redis cache manually
app.delete('/todos/cache', async (req, res) => {
  await clearCache('todos');
  res.send('🧹 Cache cleared');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
