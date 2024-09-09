import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** GET FUNCTIONS ********************************************/

/*********************************************** CREATE FUNCTIONS ********************************************/

//createBet
export const createBet = async (userID: string, groupID: string, duelID: string, wager: number): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const duelDocRef = doc(groupDocRef, 'duels', duelID);
        await updateDoc(duelDocRef, {
            [`bets.${userID}`]: wager, // The userID is used as the key, and wager as the value
        });

        console.log(`Bet placed by user ${userID} with a wager of ${wager}`);
        return undefined;
    } catch (error) {
        console.error("createBet - Error creating bet: ", error);
        return undefined;
    }
}


/*********************************************** ADD FUNCTIONS ********************************************/

