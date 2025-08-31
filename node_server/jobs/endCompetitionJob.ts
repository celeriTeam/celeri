import admin from "firebase-admin";
import sql from '../db/sql.js';

const referalWinner = async (competition_id: string): Promise<string | null> => {
    const result = await sql`
        WITH referral_counts AS (
            SELECT
                referral,
                COUNT(*) AS count
            FROM competition_steps
            WHERE competition_id = ${competition_id}
            AND referral IS NOT NULL
            GROUP BY referral
        ),
        ranked_referrals AS (
            SELECT
                referral,
                count,
                RANK() OVER (ORDER BY count DESC) AS rank
            FROM referral_counts
        )
        SELECT
            CASE
                WHEN COUNT(*) = 1 THEN MAX(referral)
                ELSE NULL
            END AS most_frequent_referral
        FROM ranked_referrals
        WHERE rank = 1;
    `
    return result[0]?.most_frequent_referral ?? null;
};

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
        // set winners
        const userList = await sql`
            SELECT * FROM competition_steps
            WHERE competition_id = ${competitionId}
            ORDER BY steps desc
        `
        const firstPlaceUserId = userList.length > 0 ? userList[0].user_id : null;

        const medianIndex = Math.floor(userList.length / 2);
        const medianUserId = userList.length > 0 ? userList[medianIndex].user_id : null;

        const referralUserId = await referalWinner(competitionId.toString());
        await sql`
            UPDATE competitions 
            SET is_active = false,
            first_place_winner=${firstPlaceUserId},
            median_winner=${medianUserId},
            referral_winner=${referralUserId}
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
            await userRef.update({ 
                inCompetition: false,
                referral: null,
            });

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
                        // console.log(`Invalid token detected for user ${user_id}`);
                    }
                }
            }
        }
        
        // Enable "Join Game" through a silent notif
        await admin.messaging().send({
            topic: 'allUsers',
            data: {
                type: 'TOGGLE_COMPETITION',
                competitionId: competitionId.toString(),
            }
        });
    } catch (err) {
        console.error('Error ending competition by ID:', err);
    }
};