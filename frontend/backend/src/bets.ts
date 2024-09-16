import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
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
export const createBet = async (userID: string, groupID: string, duelID: string, wager: number, betOnUserID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const duelDocRef = doc(groupDocRef, 'duels', duelID);
        // We create a new bet structure with [userID, wager, betOnUserID]
        const newBet = [userID, wager, betOnUserID];
        
        // Use arrayUnion to add the new bet to the "bets" array
        await updateDoc(duelDocRef, {
            bets: arrayUnion(newBet),
        });
        console.log(`Bet placed by user ${userID} with a wager of ${wager}`);
        return undefined;
    } catch (error) {
        console.error("createBet - Error creating bet: ", error);
        return undefined;
    }
}


/*********************************************** ADD FUNCTIONS ********************************************/

