import express from 'express'
import admin from 'firebase-admin';
import sql from '../db/sql.js'
import { endCompetitionById } from '../jobs/endCompetitionJob.js';

const router = express.Router()

const grabCurrentCompetition = async () => {
    const [competition] = await sql`
        SELECT * FROM competitions 
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
                type: 'TOGGLE_COMPETITION',
                competitionId: result.id.toString(),
            }
        });

        res.status(200).json({ success: true, competition: result });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
})

// GET /current-competition
router.get('/current-competition', async (req, res) => {
    try {
        console.log('Fetching current competition..., inside competitions.ts');
        const competition = await grabCurrentCompetition();

        if (!competition) {
            return res.status(400).json({ error: 'No active competition found' });
        }

        res.status(200).json(competition);
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
        const competition_data = await sql`
            SELECT 
                id,
                start_time,
                end_time,
                is_active,
                first_place_winner,
                median_winner,
                referral_winner
            FROM competitions
            WHERE id=${competition_id}
            LIMIT 1;
        `;

        res.status(200).json(competition_data);
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


// POST /end-competition
router.post('/end-competition', async (req, res) => {
    const { competition_id } = req.body;
    try {
        await sql`
            UPDATE competitions 
            SET is_active = false 
            WHERE id = ${competition_id}
        `;

        res.status(200).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
})

// POST /end-current-competition
router.post('/end-current-competition', async (req, res) => {
    try {
        console.log('Ending current competition..., inside competitions.ts');
        const competition = await grabCurrentCompetition();

        if (!competition) {
            return res.status(400).json({ error: 'No active competition to end' });
        };

        await endCompetitionById(competition.id);
        
        res.status(200).json({ success: true, endedCompetitionId: competition.id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
})

// POST /send-waiting-message
router.post('/send-waiting-message', async (req, res) => {
    const { message } = req.body;
    try {
        // 1. Create a new competition document with waitingMessage using admin.firestore()
        const competitionDoc = await admin.firestore()
            .collection('competitions')
            .add({
                waitingMessage: message,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        // 2. Send a silent notification with the message
        await admin.messaging().send({
            topic: 'allUsers',
            data: {
                type: 'WAITING_MESSAGE',
                message: message,
            }
        });

        res.status(200).json({ success: true, docId: competitionDoc.id, message });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', (req, res) => {
    res.send('Competitions API is up and running!');
})

export default router