import admin from "firebase-admin";

export const handleExpired1v1s = async (db: FirebaseFirestore.Firestore, now: Date) => {
    const expiredDuelsSnap = await db
        .collection("1v1s")
        .where("endTime", "<=", now)
        .where("processed", "==", false)
        .get();

    for (const duelDoc of expiredDuelsSnap.docs) {
        const duel = duelDoc.data();
        const duelID = duelDoc.id;
        const { participants = [] } = duel;
        const [uid1, uid2] = participants;

        // 1. Mark both users as not in 1v1
        await Promise.all([
            db.collection("users").doc(uid1).update({ isIn1v1: false }),
            db.collection("users").doc(uid2).update({ isIn1v1: false }),
        ]);

        // 2. Fetch user tokens
        const [snap1, snap2] = await Promise.all([
            db.collection("users").doc(uid1).get(),
            db.collection("users").doc(uid2).get(),
        ]);
        const user1 = snap1.data();
        const user2 = snap2.data();

        if (!user1 || !user2) {
            return;
        }

        const tokens1 = user1.tokens || [];
        const tokens2 = user2.tokens || [];
        const name1 = user1.username || "your opponent";
        const name2 = user2.username || "your opponent";

        // silent notifs
        for (const token of [...tokens1, ...tokens2]) {
            const fetchStepsMessage = {
                token: token,
                data: {
                    type: "silent",
                    action: "fetchSteps",
                },
            };

            const toggle1v1Message = {
                token: token,
                data: {
                    type: 'TOGGLE_1V1',
                    current1v1Id: duelID,
                },
            };

            try {
                await admin.messaging().send(fetchStepsMessage);
                await admin.messaging().send(toggle1v1Message);
            } catch (error) {
                console.error("Error sending notification:", error);
            }
        };

        // user1 tokens:
        for (const token of tokens1) {
            const notif1 = {
                token: token,
                notification: {
                    title: `1v1 with ${name2} ended`,
                    body: "See the results!",
                },
            };
            try {
                const response = await admin.messaging().send(notif1);
                console.log("Notification sent successfully:", response);
            } catch (error) {
                console.error("Error sending notification:", error);
            }
        }

        // user2 tokens:
        for (const token of tokens2) {
            const notif2 = {
                token: token,
                notification: {
                    title: `1v1 with ${name1} ended`,
                    body: "See the results!",
                },
            };
            try {
                const response = await admin.messaging().send(notif2);
                console.log("Notification sent successfully:", response);
            } catch (error) {
                console.error("Error sending notification:", error);
            }
        }

        // 5. Mark duel as processed
        await duelDoc.ref.update({ processed: true });

        // 6. Add new sync job to syncQueue for both users
        const nowTime = new Date();
        await Promise.all([
            db.collection("syncQueue").doc(uid1).set({
                userID: uid1,
                scheduledTime: nowTime,
                processed: false,
            }),
            db.collection("syncQueue").doc(uid2).set({
                userID: uid2,
                scheduledTime: nowTime,
                processed: false,
            }),
        ]);

        console.log(`Processed expired 1v1: ${duelID}`);
    }
};