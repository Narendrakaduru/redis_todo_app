const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors');
const { getCache, setCache, clearCache } = require('./redis/cache');


const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

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
    <p>View todos: <a href="/todos">/todos</a></p>
  `);
});

// GET /todos
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

// POST /todos
app.post('/todos', (req, res) => {
  const { userId, id, title, completed } = req.body;

  if (!userId || !id || !title || completed === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = 'INSERT INTO todo (userId, id, title, completed) VALUES (?, ?, ?, ?)';
  db.query(query, [userId, id, title, completed], async (err, result) => {
    if (err) {
      console.error('❌ Insert error:', err.message);
      return res.status(500).json({ error: 'Insert failed' });
    }
    await clearCache('todos'); // Invalidate cache
    res.status(201).json({ message: 'Todo created', id });
  });
});

// PUT /todos/:id
app.put('/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  if (title === undefined && completed === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const fields = [];
  const values = [];

  if (title !== undefined) {
    fields.push('title = ?');
    values.push(title);
  }

  if (completed !== undefined) {
    fields.push('completed = ?');
    values.push(completed);
  }

  values.push(id);
  const query = `UPDATE todo SET ${fields.join(', ')} WHERE id = ?`;

  db.query(query, values, async (err, result) => {
    if (err) {
      console.error('❌ Update error:', err.message);
      return res.status(500).json({ error: 'Update failed' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await clearCache('todos');
    res.json({ message: 'Todo updated' });
  });
});

// DELETE /todos/cache
app.delete('/todos/cache', async (req, res) => {
  await clearCache('todos');
  res.send('🧹 Cache cleared');
});

// DELETE /todos/:id
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM todo WHERE id = ?';
  
  db.query(query, [id], async (err, result) => {
    if (err) {
      console.error('❌ Delete error:', err.message);
      return res.status(500).json({ error: 'Delete failed' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await clearCache('todos'); // Invalidate cache
    res.json({ message: 'Todo deleted' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
