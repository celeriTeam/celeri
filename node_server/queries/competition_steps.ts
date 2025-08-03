import express from 'express'
import sql from '../db/sql.js'
import admin from 'firebase-admin';

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
  const { user_id } = req.body;
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
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

// POST /update-steps
router.post('/update-steps', async (req, res) => {
  const { user_id, steps } = req.body;
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
    res.status(500).json({ error: err.message });
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
      WITH ranked AS (
        SELECT 
          *,
          RANK() OVER (PARTITION BY competition_id ORDER BY steps ASC) AS asc_rank,
          COUNT(*) OVER (PARTITION BY competition_id) AS total_users
        FROM competitions AS comp
        JOIN competition_steps AS s
        ON comp.id = s.competition_id
        WHERE comp.id= ${competition.id}
      )
      SELECT 
        user_id,
        steps,
        (total_users - asc_rank + 1) AS rank
      FROM ranked
      ORDER BY steps desc;
    `;

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

// GET /user-info?user_id=abc
router.get('/user-info', async (req, res) => {
  const { user_id } = req.query;
  try {
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'Correct User ID is required' });
    }
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }
    const result = await sql`
      WITH ranked AS (
        SELECT 
          *,
          RANK() OVER (PARTITION BY competition_id ORDER BY steps ASC) AS asc_rank,
          COUNT(*) OVER (PARTITION BY competition_id) AS total_users
        FROM competitions AS comp
        JOIN competition_steps AS s
        ON comp.id = s.competition_id
        WHERE comp.id = ${competition.id}
      )
      SELECT 
        user_id,
        steps,
        (total_users - asc_rank + 1) AS rank
      FROM ranked
      WHERE user_id = ${user_id};
    `;

    if (result.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    res.status(200).json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

router.get('/', (req, res) => {
  res.send('Competition Steps API is up and running!');
})

export default router