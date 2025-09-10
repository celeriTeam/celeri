import { serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";

/*********************************************** GET FUNCTIONS ********************************************/

//for the bet summary
export const getPowerups = async (groupID: string): Promise<Array<Array<string>>> => {
    const groupDocRef = db.collection('groups').doc(groupID);

    try {

        // Get the current date at 12 AM
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set the time to 12 AM
        const startOfDayTimestamp = Timestamp.fromDate(now);

        // Query the "powerups" subcollection where the creation time is after 12 AM of the current day
        const powerupsCollectionRef = groupDocRef.collection('powerups');
        const q = powerupsCollectionRef.where("createdAt", ">=", startOfDayTimestamp);

        const powerupsSnapshot = await q.get();
        // console.log("powerupsSnapshot, ", powerupsSnapshot);
        const powerupsArray: Array<Array<string>> = [];

        powerupsSnapshot.forEach((doc) => {
            // console.log("document in powerupsSnapshot: ", doc);
            const data = doc.data();
            const powerupType = data?.type || ""; // Assuming 'type' is the field for powerup type
            const targetUserID = data?.targetUserID || ""; // Assuming 'targetID' is the field for target ID
            const targetUserName = data?.targetUserName || "";
            const userID = data?.userID || ""; // Assuming 'userID' is the field for user ID
            const duelID = data?.duelID || "";

            // console.log("document type: ", powerupType);

            powerupsArray.push([powerupType, targetUserID, targetUserName, userID, duelID]);
        });

        // console.log("powerupsArray in getPowerups", powerupsArray);

        return powerupsArray;
    } catch (error) {
        console.error("Error fetching powerups:", error);
        return [];
    }

}

/*********************************************** BUY FUNCTIONS ********************************************/


export const buyPowerup = async (groupID: string, userID: string, targetUserID: string, powerup: string, gameType: string, targetUserName?: string,): Promise<boolean> => {
    const groupDocRef = db.collection('groups').doc(groupID);
    console.log("buyPowerup - powerup number: ", powerup);
    let powerupName = "none";
    // match the powerup
    if(powerup == '1'){
        powerupName = "secondWind";
    } else if(powerup == '2'){
        powerupName = "brickWall";
    }

    try {
        return await db.runTransaction(async (transaction) => {
            const groupDoc = await transaction.get(groupDocRef);
            const powerupsCollectionRef = groupDocRef.collection('powerups');

            if (!groupDoc.exists) {
                console.error("Group document does not exist!");
                return false;
            }

            const groupData = groupDoc.data();
            const users = groupData?.users || {};

            // Ensure the user exists in the group
            if (!users[userID]) {
                console.error("User does not exist in the group!");
                return false;
            }

            const userData = users[userID];
            const currentDiamonds = userData?.diamonds || 0;
            const currentSecondWind = userData?.secondWind || 0;
            const duelID = await findDuelID(groupID, targetUserID, gameType);

            console.log("currentDiamonds: " + currentDiamonds);

            // Check if diamonds are greater than 0
            if (currentDiamonds >= 3) {
                // Update the values
                userData.diamonds = currentDiamonds - 3;
                //userData?.secondWind = currentSecondWind + 1;

                // Write the updated data back to Firestore
                transaction.update(groupDocRef, {
                    [`users.${userID}`]: userData
                });

                //add new document to powerup
                const newPowerup = {
                    createdAt: serverTimestamp(),
                    type: powerupName,
                    userID: userID,
                    targetUserID: targetUserID,
                    targetUserName: targetUserName,
                    duelID: duelID
                };
                const newDocRef = powerupsCollectionRef.doc();
                transaction.set(newDocRef, newPowerup);

                return true; // Successfully updated
            } else {
                console.error("Insufficient diamonds!");
                return false; // Not enough diamonds to proceed
            }
        });
    } catch (error) {
        console.error("Transaction failed: ", error);
        return false; // Return false if the transaction fails
    }
};


/*********************************************** HELPER FUNCTIONS ********************************************/

export const findDuelID = async (groupID: string, targetUserID: string, gameType: string): Promise<string | null> => {
    console.log("the groupID is ", groupID);
    console.log("the targetUserID is ", targetUserID);
    const groupDocRef = db.collection('groups').doc(groupID);
    const duelCollectionRef = groupDocRef.collection('duels');

    try {
        // Get the timestamp for 24 hours ago
        const now = new Date();
        let time;
        if(gameType == "weekly" || gameType == 'biweekly'){
            time = Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

        } else {
            time = Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
        }

        // Query for documents where player1 == targetUserID or player2 == targetUserID
        const query1 = duelCollectionRef
            .where("createdAt", ">=", time)
            .where("player1", "==", targetUserID);

            const querySnapshot = await query1.get();
            console.log("Simple Query Results:");
            querySnapshot.forEach((doc) => {
                console.log(doc.id, "=>", doc.data());
            });

        const query2 = duelCollectionRef
            .where("createdAt", ">=", time)
            .where("player2", "==", targetUserID);

        console.log("QUERIES:");
        console.log(query1);
        console.log(query2);

        // Execute both queries
        const [snapshot1, snapshot2] = await Promise.all([query1.get(), query2.get()]);

        // Check results and return the first matching document ID
        if (!snapshot1.empty) {
            return snapshot1.docs[0].id;
        }
        if (!snapshot2.empty) {
            return snapshot2.docs[0].id;
        }

        console.log("No recent duel found involving the target user.");
        return null;
    } catch (error) {
        console.error("Error finding duel:", error);
        return null;
    }
};