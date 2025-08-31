import admin from "firebase-admin";
import { handleExpired1v1s } from "./handleExpired1v1s.js";



async function getUserFcmTokens(userID: string): Promise<string[]> {
    const db = admin.firestore();
    const snap = await db.collection("users").doc(userID).get();
    const data = snap.data();
    return data?.fcmTokens || [];
}

export async function runSyncStepScheduler() {
    const db = admin.firestore();
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    await handleExpired1v1s(db, now);

    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
        const user = userDoc.data();
        const userID = userDoc.id;

        if (!user.lastLogin || user.lastLogin.toDate() < sixtyDaysAgo) continue;

        const isIn1v1 = user.isIn1v1;

        let lastAppOpen: Date | null = null;
        if (user.lastLogin && typeof user.lastLogin.toDate === "function") {
            lastAppOpen = user.lastLogin.toDate();
        }
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (lastAppOpen && lastAppOpen > fiveMinutesAgo) {
            continue;
        }

        let syncIntervalMs: number | null = null;

        if (isIn1v1) {
            syncIntervalMs = 1 * 60 * 60 * 1000; // 1 hour
        } else {
            let isInActiveGroup = false;
            if (user.groups && user.groups.length > 0) {
                const groupChecks = await Promise.all(
                    user.groups.map(async (groupID: string) => {
                        const groupSnap = await db.collection("groups").doc(groupID).get();
                        return groupSnap.exists && groupSnap.data()?.isGameActive;
                    })
                );
                isInActiveGroup = groupChecks.includes(true);
            }
            if (!isInActiveGroup) continue;
            syncIntervalMs = 4 * 60 * 60 * 1000;
        }

        const nextSyncTime = new Date(now.getTime() + syncIntervalMs);

        const existingJobSnap = await db.collection("syncQueue").doc(userID).get();

        if (
            !existingJobSnap.exists ||
            existingJobSnap.data()?.scheduledTime.toDate() > nextSyncTime
        ) {
            await db.collection("syncQueue").doc(userID).set({
                userID,
                scheduledTime: nextSyncTime,
                processed: false,
            });
        }
    }

    const dueJobsSnap = await db
        .collection("syncQueue")
        .where("processed", "==", false)
        .where("scheduledTime", "<=", now)
        .get();

    for (const jobDoc of dueJobsSnap.docs) {
        const job = jobDoc.data();
        const tokens = await getUserFcmTokens(job.userID);

        for (const token of tokens) {
            const message = {
                token,
                data: { type: "silent", action: "fetchSteps" },
            };

            try {
                await admin.messaging().send(message);
                await jobDoc.ref.delete();
                console.log(`Sent sync for user ${job.userID}`);
            } catch (err) {
                console.error(`Failed to send sync for ${job.userID}:`, err);
            }
        }
    }
};