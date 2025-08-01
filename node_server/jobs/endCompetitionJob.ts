import sql from '../db/sql.js';

export const runEndCompetitionJob = async () => {
    try {
        const expiredCompetitions = await sql`
            SELECT id FROM competitions 
            WHERE is_active = true AND end_time < NOW()
        `;

        if (expiredCompetitions.length === 0) return;

        console.log('Ending competitions:', expiredCompetitions.map(c => c.id));

        const ids = expiredCompetitions.map(c => c.id);

        await sql`
            UPDATE competitions 
            SET is_active = false 
            WHERE id = ANY(${ids})
        `;

        // notif to each user
        // change user competition boolean in firebase
    } catch (err) {
        console.error('Error ending competitions:', err);
    }
};
