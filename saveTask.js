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
    const { taskPadId } = req.query; // Optional filter by task pad

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
// backend/server.js

// ... other imports and setup ...

// 👉 Add new task
app.post('/api/tasks', async (req, res) => {
    const { userEmail, taskText, taskPadId } = req.body; // Expecting these from the frontend
    const title = taskText; // Setting the title to be the same as the task text for now

    if (!taskPadId) {
        return res.status(400).json({ error: 'taskPadId is required to create a task' });
    }

    try {
        // 1. Get the current maximum task_item_order for the given task_pad_id
        const orderResult = await client.query(
            'SELECT MAX(task_item_order) FROM tasks WHERE task_pad_id = $1',
            [taskPadId]
        );
        const currentMaxOrder = orderResult.rows[0].max || 0;

        // 2. Determine the next task_item_order
        const nextOrder = currentMaxOrder + 1;

        // 3. Insert the new task with all the required information
        const result = await client.query(
            'INSERT INTO tasks (user_email, title, task_text, task_pad_id, task_item_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userEmail, title, taskText, taskPadId, nextOrder]
        );

        // 4. Send the newly created task data back to the frontend
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error("Error creating task:", err);
        res.status(500).json({ error: 'Error creating task' });
    }
});

// ... other routes ...

// 👉 Update task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, taskText, is_completed, taskPadId } = req.body; // Allow updating taskPadId if needed

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

  updates.push(`updated_at = now()`); // Always update timestamp

  if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id); // Final param for WHERE clause
  const query = `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = $${paramIndex} RETURNING *`;

  try {
      const result = await client.query(query, values);
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Task not found' });
      }
      res.json(result.rows[0]);
  } catch (err) {
      console.error("Error updating task:", err);
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.get('/', (req, res) => {
  res.send('TaskHive backend is running 🎉');
});
