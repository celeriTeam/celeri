import express from 'express'
import sql from '../db/sql.js'

const router = express.Router()

const grabCurrentCompetition = async () => {
  const [competition] = await sql`
    SELECT id FROM competitions 
    WHERE is_active = true 
    AND NOW() BETWEEN start_time AND end_time
    LIMIT 1
  `;
  return competition;
}

// POST /add-user
router.post('/add-user', async (req, res) => {
  const { user_id } = req.body
  try {
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }

    const result = await sql`
      INSERT INTO competition_steps (user_id, steps, competition_id) 
      SELECT ${user_id}, 0, ${competition.id}
      WHERE NOT EXISTS (
        SELECT 1 FROM competition_steps 
        WHERE user_id = ${user_id}
        AND competition_id = ${competition.id}
      )
      RETURNING id
    `;

    if (result.length === 0) {
      return res.status(400).json({ error: 'User already exists' })
    }
    res.status(200).json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /update-steps
router.post('/update-steps', async (req, res) => {
  const { user_id, steps } = req.body
  try {
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }

    const existingUser = await sql`
      SELECT steps 
      FROM competition_steps 
      WHERE user_id = ${user_id}
      AND competition_id = ${competition.id}
    `;

    if (existingUser.length === 0) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }

    const currentSteps = existingUser[0].steps;
    const updatedSteps = Math.max(currentSteps, steps);

    await sql`
      UPDATE competition_steps 
      SET steps = ${updatedSteps}
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /data
router.get('/data', async (req, res) => {
  try {
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }

    const result = await sql`
      SELECT user_id, steps, created_at 
      FROM competition_steps 
      WHERE competition_id = ${competition.id}
      ORDER BY steps DESC
    `;

    res.status(200).json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /user-info?user_id=abc
router.get('/user-info', async (req, res) => {
  const { user_id } = req.query
  try {
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }
    const result = await sql`
      SELECT user_id, steps 
      FROM competition_steps 
      WHERE competition_id = ${competition.id}
    `;

    const rank = result.findIndex(user => user.user_id === user_id)
    const user = result[rank]
    res.status(200).json({
      ...user,
      rank: rank !== -1 ? rank + 1 : null,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', (req, res) => {
  res.send('Competition Steps API is up and running!')
})

export default router