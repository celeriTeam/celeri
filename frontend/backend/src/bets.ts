import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** GET FUNCTIONS ********************************************/
export const getDailyDuels = async (groupID: string): Promise<{ [key: string]: { player1: string, player2: string } } | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const cycleDuels = groupDoc.data()?.cycleDuels;
            const cycleDay = groupDoc.data()?.cycleDay;
            const dailyDuel = cycleDuels[cycleDay - 1];
            console.log("getDailyDuels - response: ", dailyDuel);
            return dailyDuel;
        } else{
            console.error("getDailyDuels - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getDailyDuels - Error fetching user document: ", error);
         return undefined;
    }
}

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

