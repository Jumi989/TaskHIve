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
  user: "postgres",
  port: 5432,
  password: "3015",
  database: "taskhive",
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
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// API endpoint to create a new task
app.post('/api/tasks', async (req, res) => {
    const { userEmail, text } = req.body;
    if (!userEmail || !text) {
        return res.status(400).json({ error: 'Missing userEmail or task text' });
    }
    try {
        const result = await client.query(
            'INSERT INTO tasks (user_email, title, task_text) VALUES ($1, $2, $3) RETURNING *',
            [userEmail, text, text] // Assuming title is the same as task_text for simplicity
        );
        res.status(201).json(result.rows[0]); // Send back the newly created task
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Implement PUT and DELETE endpoints for updating and deleting tasks as needed

app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
