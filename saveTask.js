// backend/server.js
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

// 👉 Get all tasks for a user
app.get('/api/tasks/:userEmail', async (req, res) => {
    const { userEmail } = req.params;
    try {
        const result = await client.query('SELECT * FROM tasks WHERE user_email = $1', [userEmail]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});


// 👉 Add new task
app.post('/api/tasks', async (req, res) => {
    const { userEmail, title, taskText } = req.body;
    try {
        const result = await client.query(
            'INSERT INTO tasks (user_email, title, task_text) VALUES ($1, $2, $3) RETURNING *',
            [userEmail, title, taskText]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error creating task' });
    }
});

// 👉 Update task
app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, taskText, is_completed } = req.body;

    try {
        const result = await client.query(
            `UPDATE tasks SET title = $1, task_text = $2, is_completed = $3, updated_at = now()
             WHERE task_id = $4 RETURNING *`,
            [title, taskText, is_completed, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error updating task' });
    }
});

// 👉 Delete task
app.delete('/api/taskpads/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await client.query('DELETE FROM tasks WHERE task_id = $1', [id]);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Error deleting task pad' });
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
app.get('/', (req, res) => {
    res.send('TaskHive backend is running 🎉');
  });