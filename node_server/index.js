// require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

const postgres = require('postgres')

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

// POST /add-user
app.post('/add-user', async (req, res) => {
  const { user_id } = req.body
  try {
    const result = await sql`
      INSERT INTO steps_competition (user_id, steps) 
      SELECT ${user_id}, 0
      WHERE NOT EXISTS (
        SELECT 1 FROM steps_competition WHERE user_id = ${user_id}
      )
      RETURNING id
    `

    if (result.length === 0) {
      res.status(400).json({ error: 'User already exists' })
      return
    }

    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /update-steps
app.post('/update-steps', async (req, res) => {
  const { user_id, steps } = req.body
  try {
    const existingUser = await sql`
      SELECT steps FROM steps_competition WHERE user_id = ${user_id}
    `;

    if (existingUser.length === 0) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }

    const currentSteps = existingUser[0].steps;
    const updatedSteps = Math.max(currentSteps, steps);

    await sql`
      UPDATE steps_competition 
      SET steps = ${updatedSteps}
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /data
app.get('/data', async (req, res) => {
  try {
    const result = await sql`SELECT user_id, steps, created_at FROM steps_competition ORDER BY steps DESC`
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /user-info?user_id=abc
app.get('/user-info', async (req, res) => {
  const { user_id } = req.query
  try {
    const result = await sql`SELECT user_id, steps FROM steps_competition ORDER BY steps DESC`
    const rank = result.findIndex(user => user.user_id === user_id)
    const user = result[rank]
    res.status(200).json({
      ...user,
      rank: rank !== -1 ? rank + 1 : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /
app.get('/', (req, res) => {
  res.send('Server is up and running!')
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
