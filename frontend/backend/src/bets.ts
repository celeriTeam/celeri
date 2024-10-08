import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();


/*********************************************** RECAP FUNCTIONS ********************************************/

// GET yesterdays duels
export const getYesterdaysDuelsSummary = async (groupID: string): Promise<{ [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            let groupCycleCount = groupDoc.data()?.cycleCount;
            let groupCycleDay = groupDoc.data()?.cycleDay;
            const numberOfPlayers = groupDoc.data()?.order.length;

            if (groupCycleDay === 1 && groupCycleCount === 1) {
                console.log('getYesterdaysDuelsSummary - error: No duels found for yesterday');
                return undefined;
            } else if (groupCycleDay === 1) {
                groupCycleCount -= 1;
                groupCycleDay = numberOfPlayers-1;
            } else {
                groupCycleDay -= 1;
            }

            console.log('Yesterday\'s cycleCount: ', groupCycleCount);
            console.log('Yesterday\'s cycleDay: ', groupCycleDay);
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection, where('cycleCount', '==', groupCycleCount), where('cycleDay', '==', groupCycleDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getYesterdaysDuelsSummary - error: No duels found for today');
                return undefined;
            }
            
            const duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } } = {};
            querySnapshot.forEach(doc => {
                const duelData = doc.data();
                duels[doc.id] = {
                    duelID: doc.id,
                    player1: duelData.player1,
                    player2: duelData.player2,
                    bets: duelData.bets || {
                        userID: '',
                        wager: 0,
                        betOnUserID: ''
                    },
                    winner: duelData.winner,
                    playerOneSteps: duelData.playerOneSteps,
                    playerTwoSteps: duelData.playerTwoSteps
                };
            });
            console.log("getYesterdaysDuelsSummary - response: ", duels);
            return duels;
        } else{
            console.error("getYesterdaysDuelsSummary - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getYesterdaysDuelsSummary - Error fetching user document: ", error);
         return undefined;
    }
}

/*********************************************** GET FUNCTIONS ********************************************/

// GET todays duels
export const getTodaysDuelsSummary = async (groupID: string): Promise<{ [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const groupCycleCount = groupDoc.data()?.cycleCount;
            const groupCycleDay = groupDoc.data()?.cycleDay;
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection, where('cycleCount', '==', groupCycleCount), where('cycleDay', '==', groupCycleDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('No duels found for today');
                return undefined;
            }
            
            const duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } } = {};
            querySnapshot.forEach(doc => {
                const duelData = doc.data();
                duels[doc.id] = {
                    duelID: doc.id,
                    player1: duelData.player1,
                    player2: duelData.player2,
                    bets: duelData.bets || {
                        userID: '',
                        wager: 0,
                        betOnUserID: ''
                    }
                };
            });
            console.log("getTodaysDuelsSummary - response: ", duels);
            return duels;
        } else{
            console.error("getTodaysDuelsSummary - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getTodaysDuelsSummary - Error fetching user document: ", error);
         return undefined;
    }
}

// GET duels not bet on yet by user
export const getUnbetDuels = async (groupID: string, userID: string): Promise<{ [key: string]: { duelID: string, player1: string, player2: string } }> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const groupCycleCount = groupDoc.data()?.cycleCount;
            const groupCycleDay = groupDoc.data()?.cycleDay;
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection, where('cycleCount', '==', groupCycleCount), where('cycleDay', '==', groupCycleDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('No duels found for today');
                return {};
            }
            
            const duels: { [key: string]: { duelID: string, player1: string, player2: string } } = {};
            querySnapshot.forEach(doc => {
                const duelData = doc.data();
                const bets = duelData.bets || [];
                
                // Check if the user has already placed a bet
                const hasBet = bets.some((bet: { userID: string; wager: number; betOnUserID: string }) => bet.userID === userID);

                // Use only the duels that have not been bet on yet by user
                if (!hasBet) {
                    duels[doc.id] = {
                        duelID: doc.id,
                        player1: duelData.player1,
                        player2: duelData.player2,
                    };
                }
            });
            console.log("getUnbetDuels - response: ", duels);
            return duels;
        } else{
            console.error("getUnbetDuels - error: No such document!");
            return {};
        }
    } catch (error) {
         console.error("getUnbetDuels - Error fetching user document: ", error);
         return {};
    }
}

// Check if user has finished betting
export const checkFinishedBetting = async (groupID: string, userID: string): Promise<boolean> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const finishedBetting = groupDoc.data()?.finishedBetting || [];
            console.log("checkFinishedBetting - response: ", finishedBetting.includes(userID));
            return finishedBetting.includes(userID);
        } else{
            console.error("checkFinishedBetting - error: No such document!");
            return false;
        }
    } catch (error) {
         console.error("checkFinishedBetting - Error fetching user document: ", error);
         return false;
    }
}

// Check if user has finished recap
export const checkFinishedRecap = async (groupID: string, userID: string): Promise<boolean> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const finishedRecap = groupDoc.data()?.finishedRecap || [];
            console.log("checkFinishedRecap - response: ", finishedRecap.includes(userID));
            return finishedRecap.includes(userID);
        } else{
            console.error("checkFinishedRecap - error: No such document!");
            return false;
        }
    } catch (error) {
         console.error("checkFinishedRecap - Error fetching user document: ", error);
         return false;
    }
}

/*********************************************** CREATE FUNCTIONS ********************************************/

//CREATE bet
export const createBet = async (userID: string, groupID: string, duelID: string, wager: number, betOnUserID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const duelDocRef = doc(groupDocRef, 'duels', duelID);
        // We create a new bet structure with [userID, wager, betOnUserID]
        const newBet = {
            userID,
            wager,
            betOnUserID
        };
        
        // Use arrayUnion to add the new bet to the "bets" array
        await updateDoc(duelDocRef, {
            bets: arrayUnion(newBet),
        });
        console.log(`Bet placed by user ${userID} on ${betOnUserID} with a wager of ${wager}`);
        return undefined;
    } catch (error) {
        console.error("createBet - Error creating bet: ", error);
        return undefined;
    }
}


/*********************************************** ADD FUNCTIONS ********************************************/

// ADD user to finishedBetting
export const addToFinishedBetting = async (groupID: string, userID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        await updateDoc(groupDocRef, {
            finishedBetting: arrayUnion(userID),
        });
        console.log(`User ${userID} has finished betting`);
        return undefined;
    } catch (error) {
        console.error("addToFinishedBetting - Error adding user to finishedBetting: ", error);
        return undefined;
    }
}

// ADD user to finishedRecap
export const addToFinishedRecap = async (groupID: string, userID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        await updateDoc(groupDocRef, {
            finishedRecap: arrayUnion(userID),
        });
        console.log(`User ${userID} has finished recap`);
        return undefined;
    } catch (error) {
        console.error("addToFinishedRecap - Error adding user to finishedRecap: ", error);
        return undefined;
    }
}