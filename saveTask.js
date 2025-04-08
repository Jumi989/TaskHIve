// File: src/server.js

import express from 'express';
import pkg from 'pg';
import cors from 'cors';

const { Client } = pkg;
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "3015",
  database: "taskhive",
});

await client.connect();
console.log("Connected to PostgreSQL!");

// 👉 Get all task pads for a user
app.get('/api/tasks/:userEmail', async (req, res) => {
    const { userEmail } = req.params;
    const { taskPadId } = req.query; // Use taskPadId from the query params

    let query = 'SELECT * FROM tasks WHERE user_email = $1';
    const values = [userEmail];

    // Filter by task_pad_id if provided
    if (taskPadId) {
        query += ' AND task_pad_id = $2';
        values.push(taskPadId);
    }
    query += ' ORDER BY task_item_order';

    try {
        const result = await client.query(query, values);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});


// 👉 Add new task pad
app.post('/api/tasks', async (req, res) => {
    const { userEmail, taskText, taskPadId } = req.body;

    if (!taskPadId) {
        return res.status(400).json({ error: 'Task pad ID is required to create a task' });
    }

    try {
        // Get the next task_item_order for the task_pad_id
        const orderResult = await client.query(
            'SELECT MAX(task_item_order) FROM tasks WHERE task_pad_id = $1',
            [taskPadId]
        );
        const nextOrder = (orderResult.rows[0].max || 0) + 1;

        // Insert the task
        const result = await client.query(
            'INSERT INTO tasks (user_email, task_text, task_pad_id, task_item_order) VALUES ($1, $2, $3, $4) RETURNING *',
            [userEmail, taskText, taskPadId, nextOrder]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: 'Error creating task' });
    }
});


// 👉 Update task pad title
app.put('/api/taskpads/:id', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    const result = await client.query(
      'UPDATE task_pads SET title = $1 WHERE task_pad_id = $2 RETURNING *',
      [title, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task pad not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error updating task pad title' });
  }
});

// 👉 Delete task pad
app.delete('/api/taskpads/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Delete associated tasks
        await client.query('DELETE FROM tasks WHERE task_pad_id = $1', [id]);

        // Delete the task pad itself
        const result = await client.query('DELETE FROM task_pads WHERE task_pad_id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task pad not found' });
        }
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Error deleting task pad' });
    }
});


// 👉 Get all tasks for a user
app.get('/api/tasks/:userEmail', async (req, res) => {
  const { userEmail } = req.params;
  const { taskPadId } = req.query;
  let query = 'SELECT * FROM tasks WHERE user_email = $1';
  const values = [userEmail];
  if (taskPadId) {
    query += ' AND task_pad_id = $2';
    values.push(taskPadId);
  }
  query += ' ORDER BY task_item_order';
  try {
    const result = await client.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// 👉 Add new task
app.post('/api/tasks', async (req, res) => {
  const { userEmail, taskText, taskPadId } = req.body;
  if (!taskPadId) {
    return res.status(400).json({ error: 'taskPadId is required to create a task' });
  }
  try {
    const orderResult = await client.query(
      'SELECT MAX(task_item_order) FROM tasks WHERE task_pad_id = $1',
      [taskPadId]
    );
    const currentMaxOrder = orderResult.rows[0].max || 0;
    const nextOrder = currentMaxOrder + 1;
    const result = await client.query(
      'INSERT INTO tasks (user_email, title, task_text, task_pad_id, task_item_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userEmail, taskText, taskText, taskPadId, nextOrder]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// 👉 Update task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, taskText, is_completed, taskPadId } = req.body;
  const updates = [];
  const values = [];
  let paramIndex = 1;
  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }
  if (taskText !== undefined) {
    updates.push(`task_text = $${paramIndex++}`);
    values.push(taskText);
  }
  if (is_completed !== undefined) {
    updates.push(`is_completed = $${paramIndex++}`);
    values.push(is_completed);
  }
  if (taskPadId !== undefined) {
    updates.push(`task_pad_id = $${paramIndex++}`);
    values.push(taskPadId);
  }
  updates.push(`updated_at = now()`);
  values.push(id);
  const query = `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = $${paramIndex} RETURNING *`;
  try {
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// 👉 Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM tasks WHERE task_id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// Server setup
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.get('/', (req, res) => {
  res.send('TaskHive backend is running 🎉');
});
