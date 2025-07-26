import { cert, initializeApp } from 'firebase-admin/app'
import admin from "firebase-admin";
import sql from './db/sql.js'
import { readFileSync } from 'fs';

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
console.log('Firebase Admin: ', JSON.parse(readFileSync(serviceAccount!, 'utf8')).project_id);
const serviceAccountKey = JSON.parse(readFileSync(serviceAccount!, 'utf8'));
initializeApp({
    credential: cert(serviceAccountKey)
});

const checkAndSyncSteps = async () => {
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

// Run every minute
checkAndSyncSteps();
setInterval(checkAndSyncSteps, 60 * 1000);