import admin from "firebase-admin";
import sql from '../db/sql.js'

export const runStepSyncJob = async () => {
    try {
        const [competition] = await sql`
            SELECT id FROM competitions 
            WHERE is_active = true 
            AND NOW() BETWEEN start_time AND end_time
            LIMIT 1
        `;

        if (!competition) return;

        const users = await sql`
            SELECT user_id FROM competition_steps 
            WHERE competition_id = ${competition.id}
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

            for (const token of tokens) {
                const silentMessage = {
                    token,
                    data: {
                        type: "silent",
                        action: "fetchSteps"
                    }
                };

                try {
                    await admin.messaging().send(silentMessage);
                } catch (error: any) {
                    if (error.code === 'messaging/registration-token-not-registered') {
                        console.log(`Invalid token detected for user ${user_id}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error during step sync:', err);
    }
};
