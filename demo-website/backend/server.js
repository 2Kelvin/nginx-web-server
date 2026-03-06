require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Essential for parsing POST/PUT data

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
}).promise();

// READ ALL
app.get('/api/facts', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM facts");
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// CREATE
app.post('/api/facts', async (req, res) => {
    const { title, detail } = req.body;
    try {
        await pool.query("INSERT INTO facts (title, detail) VALUES (?, ?)", [title, detail]);
        res.status(201).json({ message: "Fact added!" });
    } catch (err) { res.status(500).json(err); }
});

// UPDATE
app.put('/api/facts/:id', async (req, res) => {
    const { title, detail } = req.body;
    try {
        await pool.query("UPDATE facts SET title = ?, detail = ? WHERE id = ?", [title, detail, req.params.id]);
        res.json({ message: "Fact updated!" });
    } catch (err) { res.status(500).json(err); }
});

// DELETE
app.delete('/api/facts/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM facts WHERE id = ?", [req.params.id]);
        res.json({ message: "Fact deleted!" });
    } catch (err) { res.status(500).json(err); }
});

const PORT = process.env.API_PORT || 5000;
app.listen(PORT, () => console.log(`CRUD API running on port ${PORT}`));