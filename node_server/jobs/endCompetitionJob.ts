import admin from "firebase-admin";
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

        for (const id of ids) {
            await endCompetitionById(id);
        }
    } catch (err) {
        console.error('Error ending competitions:', err);
    }
};

export const endCompetitionById = async (competitionId: number) => {
    try {
        await sql`
            UPDATE competitions 
            SET is_active = false 
            WHERE id = ${competitionId}
        `;

        // notif to each user
        const users = await sql`
            SELECT user_id FROM competition_steps 
            WHERE competition_id = ${competitionId}
        `;
        console.log('Users in competition:', users);

        for (const { user_id } of users) {
            // Fetch Firebase tokens for user
            const userDoc = await admin.firestore().collection('users').doc(user_id).get();
            if (!userDoc.exists) {
                console.log(`User document not found for user_id: ${user_id}`);
                continue; // Skip to the next user
            }
            const tokens = userDoc.data()?.tokens || [];

            // Update user comp status in firebase
            const userRef = admin.firestore().collection('users').doc(user_id);
            await userRef.update({ inCompetition: false });

            // Send notifs
            for (const token of tokens) {
                const silentMessage = {
                    token,
                    data: {
                        type: "silent",
                        action: "fetchSteps"
                    }
                };

                const endNotification = {
                    notification: {
                        title: "Step Competition Ended",
                        body: "The weekly step competition has concluded. Check the final results!"
                    },
                    token: token,
                };

                try {
                    await admin.messaging().send(silentMessage);
                    await admin.messaging().send(endNotification);
                } catch (error: any) {
                    if (error.code === 'messaging/registration-token-not-registered') {
                        console.log(`Invalid token detected for user ${user_id}`);
                    }
                }
            }
        }
        // change user competition boolean in firebase
    } catch (err) {
        console.error('Error ending competition by ID:', err);
    }
};