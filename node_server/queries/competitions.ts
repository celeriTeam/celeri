import express from 'express'
import sql from '../db/sql.js'

const admin = require('../firebaseAdmin')  


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

        const [result] = await sql`
            INSERT INTO competitions (start_time, end_time)
            VALUES (${now.toISOString()}, ${oneHourLater.toISOString()})
            RETURNING *
        `;

        // Enable "Join Game" through a silent notif
        await admin.messaging().send({
        topic: 'allUsers',
        data: {
            type:          'COMPETITION_STARTED',
            competitionId: result.id.toString(),
        }
        })

        res.status(200).json({ success: true, competition: result });
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

// GET /all-competitions
router.get('/all-competitions', async (req, res) => {
    try {
        const competitions = await sql`
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
            ORDER BY competition_id, rank;
        `;

        res.status(200).json(competitions);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
})

router.get('/', (req, res) => {
    res.send('Competitions API is up and running!')
})

export default router