import { getFirestore, doc, runTransaction, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";
import { useUser } from '../../app/UserProvider'

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** BUY FUNCTIONS ********************************************/


export const buySecondWind = async (userID: string, groupID: string): Promise<boolean> => {
    const groupDocRef = doc(db, 'groups', groupID);

    try {
        return await runTransaction(db, async (transaction) => {
            const groupDoc = await transaction.get(groupDocRef);

            if (!groupDoc.exists()) {
                console.error("Group document does not exist!");
                return false;
            }

            const groupData = groupDoc.data();
            const users = groupData.users || {};

            // Ensure the user exists in the group
            if (!users[userID]) {
                console.error("User does not exist in the group!");
                return false;
            }

            const userData = users[userID];
            const currentDiamonds = userData.diamond || 0;
            const currentSecondWind = userData.secondWind || 0;

            // Check if diamonds are greater than 0
            if (currentDiamonds > 0) {
                // Update the values
                userData.diamond = currentDiamonds - 1;
                userData.secondWind = currentSecondWind + 1;

                // Write the updated data back to Firestore
                transaction.update(groupDocRef, {
                    [`users.${userID}`]: userData
                });

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
