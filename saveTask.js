// File: src/server.js

import express from 'express';
import pkg from 'pg';
import cors from 'cors'; // For handling Cross-Origin Requests

const { Client } = pkg;
const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for your frontend to connect
app.use(express.json()); // Middleware to parse JSON request bodies

const client = new Client({
    host: "localhost",
    user: "postgres",   // Ensure this matches your PostgreSQL user
    port: 5432,
    password: "3015",   // Check for accuracy
    database: "taskhive" // Ensure the database exists
  });
  

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to PostgreSQL (Backend)!");
    } catch (err) {
        console.error("Backend Database Connection Error:", err.message);
    }
}

connectDB();

// API endpoint to get all tasks for a specific user
app.get('/api/tasks', async (req, res) => {
    const { task_pad_id } = req.query;
  
    if (!task_pad_id) {
      return res.status(400).json({ error: 'task_pad_id is required' });
    }
  
    try {
      const result = await client.query(
        'SELECT * FROM tasks WHERE task_pad_id = $1 ORDER BY task_item_order ASC',
        [task_pad_id]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No tasks found' });
      }
  
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });
  


// API endpoint to create a new task
// API endpoint to save a new task
app.post('/api/tasks', async (req, res) => {
    const {
      task_pad_id,
      title,
      task_text,
      is_completed,
      due_date,
      priority,
      task_item_order
    } = req.body;
  
    if (!task_pad_id || !title || task_item_order === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      const result = await client.query(
        'INSERT INTO tasks (task_pad_id, title, task_text, is_completed, due_date, priority, task_item_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
        [task_pad_id, title, task_text, is_completed, due_date, priority, task_item_order]
      );
  
      res.status(201).json(result.rows[0]); // Return the created task
    } catch (error) {
      console.error('Error saving task:', error);
      res.status(500).json({ error: 'Failed to save task' });
    }
  });
  
// API endpoint to update an existing task
app.put('/api/tasks/:task_id', async (req, res) => {
    const { task_id } = req.params;
    const {
      title,
      task_text,
      is_completed,
      due_date,
      priority,
      task_item_order
    } = req.body;
  
    try {
      const result = await client.query(
        'UPDATE tasks SET title = $1, task_text = $2, is_completed = $3, due_date = $4, priority = $5, task_item_order = $6, updated_at = NOW() WHERE task_id = $7 RETURNING *',
        [title, task_text, is_completed, due_date, priority, task_item_order, task_id]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
  
      res.json(result.rows[0]); // Return the updated task
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });
  


app.delete('/api/task_pads/:task_Pad_id', async (req, res) => {
    const { taskPadId } = req.params;
    try {
        const result = await client.query(
            'DELETE FROM task_pads WHERE task_pad_id = $1',
            [taskPadId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task pad not found' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Error deleting task pad:', error);
        res.status(500).json({ error: 'Failed to delete task pad' });
    }
});


// Implement PUT and DELETE endpoints for updating and deleting tasks as needed

app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
