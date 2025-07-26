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

// POST /start-competition
router.post('/start-competition', async (req, res) => {
  try {
    const competition = await grabCurrentCompetition();

    if (competition) {
      return res.status(400).json({ error: 'A competition is already active' });
    }

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const result = await sql`
      INSERT INTO competitions (start_time, end_time)
      VALUES (${now.toISOString()}, ${oneHourLater.toISOString()})
      RETURNING *
    `;

    res.status(200).json({ success: true, competition: result[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /current-competition
router.get('/current-competition', async (req, res) => {
  try {
    const [competition] = await sql`
      SELECT * FROM competitions 
      WHERE is_active = true 
      AND NOW() BETWEEN start_time AND end_time
      LIMIT 1
    `;

    if (!competition) {
      return res.status(200).json({ error: 'No active competition found' });
    }

    res.status(200).json(competition);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

router.get('/', (req, res) => {
  res.send('Competitions API is up and running!')
})

export default router