require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

export default sql

// POST /add-user
app.post('/add-user', async (req, res) => {
  const { user_id } = req.body
  try {
    await sql`INSERT INTO steps_competition (user_id, steps) VALUES (${user_id}, 0) ON CONFLICT (user_id) DO NOTHING`
    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /data
app.get('/data', async (req, res) => {
  try {
    const result = await sql.query('SELECT user_id, steps FROM steps_competition ORDER BY steps DESC')
    res.status(200).json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /user-info?user_id=abc
app.get('/user-info', async (req, res) => {
  const { user_id } = req.query
  try {
    const result = await sql.query('SELECT user_id, steps FROM steps_competition ORDER BY steps DESC')
    const rank = result.rows.findIndex(row => row.user_id === user_id)
    const user = result.rows[rank]
    res.status(200).json({
      ...user,
      rank: rank !== -1 ? rank + 1 : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
