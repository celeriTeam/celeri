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

const rankings = async (competition_id: string) => {
  const result = await sql`
    WITH ranked AS (
      SELECT 
        *,
        RANK() OVER (PARTITION BY competition_id ORDER BY steps ASC) AS asc_rank,
        COUNT(*) OVER (PARTITION BY competition_id) AS total_users
      FROM competitions AS comp
      JOIN competition_steps AS s
      ON comp.id = s.competition_id
      WHERE comp.id= ${competition_id}
    )
    SELECT 
      user_id,
      steps,
      (total_users - asc_rank + 1) AS rank
    FROM ranked
    ORDER BY steps desc;
  `;
  /**
   * const competition_data = await sql`
            WITH ranked AS (
                SELECT 
                    *,
                    RANK() OVER (PARTITION BY competition_id ORDER BY steps ASC) AS asc_rank,
                    COUNT(*) OVER (PARTITION BY competition_id) AS total_users
                FROM competitions AS comp
                JOIN competition_steps AS s
                ON comp.id = s.competition_id
            )
            SELECT 
                competition_id,
                start_time,
                end_time,
                is_active,
                user_id,
                steps,
                (total_users - asc_rank + 1) AS rank
            FROM ranked
            WHERE competition_id=${competition_id}
            ORDER BY competition_id, rank;
        `;
   */
  return result;
}

const silentNotif = async (user_id: string, competition_id: string) => {
  const userDoc = await admin.firestore().collection('users').doc(user_id).get();
  if (!userDoc.exists) {
    console.log(`User document not found for user_id: ${user_id}`);
    return;
  }

  try {
    await admin.messaging().send({
      topic: 'allUsers',
      data: {
        type: 'TOGGLE_COMPETITION',
        competitionId: competition_id,
      }
    });
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      // console.log(`Invalid token detected for user ${user_id}`);
    }
  }
}

// POST /add-user
router.post('/add-user', async (req, res) => {
  const { user_id, referral_id } = req.body;
  try {
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }

    const result = await sql`
      INSERT INTO competition_steps (user_id, steps, competition_id, referral) 
      SELECT ${user_id}, 0, ${competition.id}, ${referral_id}
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
    silentNotif(user_id, competition.id);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.log('competition_steps/add-user: ', err.message);
    res.status(500).json({ error: err.message });
  }
})

// POST /update-steps
router.post('/update-steps', async (req, res) => {
  const { user_id, steps, minute } = req.body;
  try {
    // Grab current competition:
    const [competition] = await sql`
      SELECT id FROM competitions 
      WHERE is_active = true 
      LIMIT 1
    `;

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

    silentNotif(user_id, competition.id);
    const currentSteps = existingUser[0].steps;
    const updatedSteps = Math.max(currentSteps, steps);

    let effectiveMinute = minute;
    if (effectiveMinute === undefined || effectiveMinute === null) {
      const diffResult = await sql`
        SELECT EXTRACT(EPOCH FROM (NOW() - ${competition.start_time})) / 60 AS minutes
      `;
      effectiveMinute = Math.floor(diffResult[0].minutes);
    }

    await sql`
      UPDATE competition_steps 
      SET steps = ${updatedSteps},
          time_from_start = ${effectiveMinute}
      WHERE user_id = ${user_id}
      AND competition_id = ${competition.id}
    `;

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.log('competition_steps/update-steps: ', err.message);
    res.status(500).json({ error: err.message });
  }
})

// GET /current-data
router.get('/current-data', async (req, res) => {
  try {
    // Grab current competition:
    const competition = await grabCurrentCompetition();

    if (!competition) {
      return res.status(400).json({ error: 'No active competition' });
    }

    const result = await rankings(competition.id);

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

// GET /data?=competition_id=abc
router.get('/data', async (req, res) => {
  const { competition_id } = req.query;
  try {
    if (!competition_id || typeof competition_id !== 'string') {
      return res.status(400).json({ error: 'Correct Competition ID is required' });
    }

    const result = await rankings(competition_id);

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
      const [competition2] = await sql`
        SELECT * FROM competitions 
        WHERE is_active = true 
        LIMIT 1
      `
      if (competition2) {
        const [result] = await sql`
          SELECT created_at, time_from_start FROM competition_steps
          WHERE user_id=${user_id}
          AND competition_id=${competition2.id}
        `;
        return res.status(400).json({ error: 'Currently awaiting final results', result: result })
      }
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
        (total_users - asc_rank + 1) AS rank,
        time_from_start,
        created_at
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

// GET /has-seen-results?user_id=abc
router.get('/has-seen-results', async (req, res) => {
  const { user_id } = req.query;
  try {
    console.log('hasseenresults: ', user_id);
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'Correct User ID is required' });
    }
    
    const result = await sql`
      SELECT cs.competition_id
      FROM competition_steps cs
      JOIN competitions c ON c.id = cs.competition_id
      WHERE cs.user_id = ${user_id}
        AND c.is_active = false
        AND cs.has_seen_results = false;
    `;

    if (result.length === 0) {
      return res.status(400).json({ error: 'Seen all competitions' });
    }
    
    res.status(200).json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

// POST /has-seen-results
router.post('/has-seen-results', async (req, res) => {
  const { user_id, competition_id } = req.body;
  try {
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'Correct User ID is required' });
    }

    await sql`
      UPDATE competition_steps 
      SET has_seen_results = true
      WHERE user_id = ${user_id}
      AND competition_id = ${competition_id}
    `
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

// GET /referrals?=competition_id=abc
router.get('/referrals', async (req, res) => {
  const { competition_id } = req.query;
  try {
    if (!competition_id || typeof competition_id !== 'string') {
      return res.status(400).json({ error: 'Correct Competition ID is required' });
    }
    const referral_data = await sql`
      WITH referral_counts AS (
        SELECT
          referral AS user_id,
          COUNT(*)::INT AS referral_count
        FROM competition_steps
        WHERE competition_id = ${competition_id}
        AND referral IS NOT NULL
        GROUP BY referral
      ),
      ranked AS (
        SELECT
          *,
          RANK() OVER (ORDER BY referral_count DESC) AS base_rank
        FROM referral_counts
      ),
      custom_ranked AS (
        SELECT
          r.user_id,
          r.referral_count,
          (
            SELECT COUNT(*)
            FROM ranked r2
            WHERE r2.referral_count > r.referral_count
          ) + 1 AS rank
        FROM ranked r
      )
      SELECT rank, user_id, referral_count
      FROM custom_ranked
      ORDER BY rank;
    `;

    res.status(200).json(referral_data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tallying-results
router.get('/tallying-results', async (req, res) => {
  try {
    // if NOW > end_time and is_active=true, then return true
    const competition = await sql`
      SELECT id FROM competitions 
      WHERE is_active = true 
      AND NOW() > end_time
      LIMIT 1
    `;

    const isTallying = competition.length > 0;
    res.status(200).json(isTallying);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  res.send('Competition Steps API is up and running!');
})

export default router