import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";
import { useUser } from '../../app/UserProvider'

const db = getFirestore(app);
const storage = getStorage();


/*********************************************** RECAP FUNCTIONS ********************************************/

// GET yesterdays duels
export const getYesterdaysDuelsSummary = async (groupID: string): Promise<{ [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number, createdAt: Timestamp } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            let groupCycleCount = groupDoc.data()?.cycleCount;
            let groupCycleDay = groupDoc.data()?.cycleDay;
            const numberOfPlayers = groupDoc.data()?.previousPlayersInGame;

            if (groupCycleDay === 1 && groupCycleCount === 1) {
                // console.log('getYesterdaysDuelsSummary - error: No duels found for yesterday');
                return undefined;
            } else if (groupCycleDay === 1) {
                // console.log('getYesterdayDuelSummary - groupCycleDay === 1');
                // console.log(groupCycleCount);
                // console.log(groupCycleDay);
                groupCycleCount -= 1;
                groupCycleDay = numberOfPlayers-1;
                // console.log(groupCycleCount);
                // console.log(groupCycleDay);
            } else {
                groupCycleDay -= 1;
            }

            // console.log('Yesterday\'s cycleCount: ', groupCycleCount);
            // console.log('Yesterday\'s cycleDay: ', groupCycleDay);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStart = Timestamp.fromDate(yesterday);
            const yesterdayEnd = Timestamp.fromDate(today);

            // console.log('getYesterdayDuelsSummary - Checkpoint Zero');
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('cycleCount', '==', groupCycleCount),
                where('cycleDay', '==', groupCycleDay),
                where('createdAt', '>=', yesterdayStart),
                where('createdAt', '<', yesterdayEnd));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // console.log('getYesterdaysDuelsSummary - error: No duels found for today');
                return undefined;
            }
            // console.log('getYesterdayDuelsSummary - Checkpoint One');
            
            const duels: { [key: string]: { duelID: string, player1: string, player2: string, createdAt: Timestamp, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } } = {};
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
                    playerTwoSteps: duelData.playerTwoSteps,
                    createdAt: duelData.createdAt,
                };
            });
            // console.log('getYesterdayDuelsSummary - Checkpoint Two');
            //console.log("getYesterdaysDuelsSummary - response: ", duels);
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

// GET yesterdays duels
export const getLastWeekDuelsSummary = async (groupID: string): Promise<{ [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number, createdAt: Timestamp } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            let groupCycleCount = groupDoc.data()?.cycleCount;
            let groupCycleWeek = groupDoc.data()?.cycleWeek;
            let resetDay = groupDoc.data().resetDay; 
            const numberOfPlayers = groupDoc.data()?.previousPlayersInGame;

            if (groupCycleWeek === 1 && groupCycleCount === 1) {
                // console.log('getLastWeekDuelsSummary - error: No duels found for last week');
                return undefined;
            } else if (groupCycleWeek === 1) {
                // console.log('getLastWeekDuelSummary - groupCycleWeek === 1');
                // console.log(groupCycleCount);
                // console.log(groupCycleWeek);
                groupCycleCount -= 1;
                groupCycleWeek = numberOfPlayers-1;
                // console.log(groupCycleCount);
                // console.log(groupCycleWeek);
            } else {
                groupCycleWeek -= 1;
            }

            // console.log('Last week\'s cycleCount: ', groupCycleCount);
            // console.log('Last week\'s cycleDay: ', groupCycleWeek);

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of the day

            // Calculate the most recent reset day
            let mostRecentReset = new Date(today);
            mostRecentReset.setDate(today.getDate() - ((today.getDay() - resetDay + 7) % 7));

            // Calculate the reset day 7 days prior
            const previousReset = new Date(mostRecentReset);
            previousReset.setDate(mostRecentReset.getDate() - 7);

            // Convert to timestamps or use as needed
            const startDay = Timestamp.fromDate(previousReset);
            const endDay = Timestamp.fromDate(mostRecentReset);

            // console.log('Start Day:', startDay.toDate());
            // console.log('End Day:', endDay.toDate());

            // console.log('getYesterdayDuelsSummary - Checkpoint Zero');
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('cycleCount', '==', groupCycleCount),
                where('cycleWeek', '==', groupCycleWeek),
                where('createdAt', '>=', startDay),
                where('createdAt', '<', endDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // console.log('getYesterdaysDuelsSummary - error: No duels found for today');
                return undefined;
            }
            // console.log('getYesterdayDuelsSummary - Checkpoint One');
            
            const duels: { [key: string]: { duelID: string, player1: string, player2: string, createdAt: Timestamp, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } } = {};
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
                    playerTwoSteps: duelData.playerTwoSteps,
                    createdAt: duelData.createdAt,
                };
            });
            // console.log('getYesterdayDuelsSummary - Checkpoint Two');
            //console.log("getYesterdaysDuelsSummary - response: ", duels);
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

// GET more weekly duels
export const getMoreWeeklyDuelsSummary = async (groupID: string, weeksAgo: number): Promise<{ [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number, createdAt: Timestamp } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if(groupDoc.exists()){
            // find the parameters of the given day
            // Start of the day 7 days ago
            let endOfWeek = new Date();
            endOfWeek.setHours(0, 0, 0, 0);
            endOfWeek.setDate(endOfWeek.getDate() - (weeksAgo * 7));

            // Start of the day 14 days ago
            let startOfWeek = new Date();
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - ((weeksAgo + 1) * 7));

            // Convert to Firestore Timestamps
            const weekStart = Timestamp.fromDate(startOfWeek);
            const weekEnd = Timestamp.fromDate(endOfWeek);

            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('createdAt', '>=', weekStart),
                where('createdAt', '<', weekEnd));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getMoreDuelsSummary - error: No duels found for today');
                return undefined;
            }
            // console.log('getMoreDuelsSummary - Checkpoint One');
                
            const duels: { [key: string]: { duelID: string, player1: string, player2: string, createdAt: Timestamp, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } } = {};
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
                    playerTwoSteps: duelData.playerTwoSteps,
                    createdAt: duelData.createdAt,
                };
            });
            // console.log('getMoreDuelsSummary - Checkpoint Two');
            // console.log("getMoresDuelsSummary - response: ", duels);
            return duels;
        } else{
            console.error("getMoreDuelsSummary - error: No such document!");
            return undefined;
        }


    } catch (error) {
        console.error("getMoreDuelsSummary - Error fetching user document: ", error);
        return undefined;
    }
}

// GET more duels
export const getMoreDuelsSummary = async (groupID: string, daysAgo: number): Promise<{ [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number, createdAt: Timestamp } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if(groupDoc.exists()){
            // find the parameters of the given day
            // Create a Date object for the current date and set it to the start of today
            let dayStartTemp = new Date();
            dayStartTemp.setHours(0, 0, 0, 0);
            dayStartTemp.setDate(dayStartTemp.getDate() - daysAgo);

            // Create a new Date object for the end of the same day
            let dayEndTemp = new Date(dayStartTemp);
            dayEndTemp.setHours(23, 59, 59, 999);

            // Convert to Firestore Timestamps
            const dayStart = Timestamp.fromDate(dayStartTemp);
            const dayEnd = Timestamp.fromDate(dayEndTemp);

        // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('createdAt', '>=', dayStart),
                where('createdAt', '<', dayEnd));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getMoreDuelsSummary - error: No duels found for today');
                return undefined;
            }
            // console.log('getMoreDuelsSummary - Checkpoint One');
                
            const duels: { [key: string]: { duelID: string, player1: string, player2: string, createdAt: Timestamp, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } } = {};
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
                    playerTwoSteps: duelData.playerTwoSteps,
                    createdAt: duelData.createdAt,
                };
            });
            // console.log('getMoreDuelsSummary - Checkpoint Two');
            // console.log("getMoresDuelsSummary - response: ", duels);
            return duels;
        } else{
            console.error("getMoreDuelsSummary - error: No such document!");
            return undefined;
        }


    } catch (error) {
        console.error("getMoreDuelsSummary - Error fetching user document: ", error);
        return undefined;
    }
}

// GET last weeks prop bets
export const getLastWeekPropBets = async (groupID: string, userID: string): Promise<{ [key: string]: { duelID: string, userID: string, betOnUserID: string, steps: number, averageStepCount: number, overUnder: string, win: boolean, createdAt: Timestamp } } | undefined> => {
    // get the createdAt timestamp of the latest duel in duel history
    // return all prop bets that were made after that timestamp (or on the same day)
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if(groupDoc.exists()){
            const groupData = groupDoc.data();
            const resetDay = groupData.resetDay;
            const players = Object.keys(groupData.users || {});

            // Initialize prop bets map with duel IDs as keys and 0 as default values
            const propBets: { [key: string]: { duelID: string, userID: string, betOnUserID: string, steps: number, averageStepCount: number, overUnder: string, win: boolean, createdAt: Timestamp } } = {};

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of the day

            // Calculate the most recent reset day
            let mostRecentReset = new Date(today);
            mostRecentReset.setDate(today.getDate() - ((today.getDay() - resetDay + 7) % 7));

            // Calculate the reset day 7 days prior
            const previousReset = new Date(mostRecentReset);
            previousReset.setDate(mostRecentReset.getDate() - 7);

            // Convert to timestamps or use as needed
            const startDay = Timestamp.fromDate(previousReset);
            const endDay = Timestamp.fromDate(today);

            // console.log('Start Day:', startDay.toDate());
            // console.log('End Day:', endDay.toDate());

            // console.log('getYesterdayDuelsSummary - Checkpoint Zero');

            // Get snapshot of duels for today
            // console.log('my userid:', userID);
            const propBetsCollection = collection(groupDocRef, 'propBets');
            const q = query(propBetsCollection,
                where("userID", "==", userID),
                where('createdAt', '>=', startDay),
                where('createdAt', '<', endDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // console.log('getLastWeekPropBets - error: No prop bets found for today');
                return undefined;
            }

            querySnapshot.forEach(doc => {
                const propBetData = doc.data();
                propBets[doc.id] = {
                    duelID: doc.id,
                    userID: propBetData.userID,
                    betOnUserID: propBetData.betOnUserID,
                    steps: propBetData.steps,
                    averageStepCount: propBetData.averageStepCount,
                    overUnder: propBetData.overUnder,
                    win: propBetData.win,
                    createdAt: propBetData.createdAt,
                };
            });
            // console.log("getLastWeekPropBets - response: ", propBets);
            return propBets;
        } else{
            console.error("getLastWeekPropBets - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getLastWeekPropBets - Error fetching user document: ", error);
        return undefined;
    }
}

// GET more prop bets
export const getMorePropBets = async (groupID: string, userID: string, weeksAgo: number): Promise<{ [key: string]: { duelID: string, userID: string, betOnUserID: string, steps: number, averageStepCount: number, overUnder: string, win: boolean, createdAt: Timestamp } } | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if(groupDoc.exists()){
            // find the parameters of the given day
            // Start of the day 7 days ago
            let endOfWeek = new Date();
            endOfWeek.setHours(0, 0, 0, 0);
            endOfWeek.setDate(endOfWeek.getDate() - (weeksAgo * 7));

            // Start of the day 14 days ago
            let startOfWeek = new Date();
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - ((weeksAgo + 1) * 7));

            // Convert to Firestore Timestamps
            const weekStart = Timestamp.fromDate(startOfWeek);
            const weekEnd = Timestamp.fromDate(endOfWeek);

            // Get snapshot of duels for today
            const propBetsCollection = collection(groupDocRef, 'propBets');
            const q = query(propBetsCollection,
                where("userID", "==", userID),
                where('createdAt', '>=', weekStart),
                where('createdAt', '<', weekEnd));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getMorePropBets - error: No duels found for today');
                return undefined;
            }
                
            const propBets: { [key: string]: { duelID: string, userID: string, betOnUserID: string, steps: number, averageStepCount: number, overUnder: string, win: boolean, createdAt: Timestamp } } = {};
            querySnapshot.forEach(doc => {
                const propBetData = doc.data();
                propBets[doc.id] = {
                    duelID: doc.id,
                    userID: propBetData.userID,
                    betOnUserID: propBetData.betOnUserID,
                    steps: propBetData.steps,
                    averageStepCount: propBetData.averageStepCount,
                    overUnder: propBetData.overUnder,
                    win: propBetData.win,
                    createdAt: propBetData.createdAt,
                };
            });
            // console.log("getMorePropBets - response: ", propBets);
            return propBets;
        } else{
            console.error("getMorePropBets - error: No such document!");
            return undefined;
        }


    } catch (error) {
        console.error("getMorePropBets - Error fetching user document: ", error);
        return undefined;
    }
}

export const getRacesSummary = async (groupID: string, weeksAgo: number, groups: Record<string, any>): Promise<{ races: Record<string, { gain: number; username: string; profilePic: string; weeksAgo: number; steps: number }>} | undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);

        if(groupDoc.exists()){

            // grab the reset day 
            const resetDay = groupDoc.data().resetDay; 
            const players = Object.keys(groupDoc.data().users || {});

            // console.log("CHECKPOINT ONE");

            // initialize the record
            const races = players.reduce((acc, userID) => {
                const username =  groups[groupID]?.users[userID]?.username;
                const profilePic =  groups[groupID]?.users[userID]?.profilePic;
                acc[userID] = {
                  gain: 0,
                  username: username || '',
                  profilePic: profilePic || '',
                  weeksAgo: weeksAgo,
                  steps: 0,
                };
                return acc;
            }, {} as Record<string, { gain: number; username: string; profilePic: string; weeksAgo: number; steps: number }>);
        

            // console.log("CHECKPOINT 2");
            // the end of the query 

            // now find the time parameters based on the weeksAgo
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of the day

            let desiredReset = new Date(today);
            desiredReset.setDate(
                today.getDate() - ((today.getDay() - resetDay + 7) % 7) - ((weeksAgo-1) * 7)
            );

            const endReset = new Date(desiredReset);
            endReset.setDate(desiredReset.getDate() + 7);

            const startDay = Timestamp.fromDate(desiredReset);
            const endDay = Timestamp.fromDate(endReset);

            // console.log('Start Day:', startDay.toDate());
            // console.log('End Day:', endDay.toDate());


            // Get snapshot of duels for today
            const racesCollection = collection(groupDocRef, 'races');
            const q = query(racesCollection,
                where('createdAt', '>=', startDay),
                where('createdAt', '<', endDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getRacesSummary - error: No races found for this past week');
                return undefined;
            }
            // console.log("CHECKPOINT THREE");

            querySnapshot.forEach((doc) => {
                //should only be one document
                const raceData = doc.data();
                const gains = new Map<string, number>(Object.entries(raceData.gains || {}));
                // console.log("CHECKPOINT FOUR");

                gains.forEach((amountGained, userID) => {
                    races[userID].gain += amountGained;
                    races[userID].steps = raceData.steps[userID];
                });
            });
            return { races };
            
        }
    } catch (error) {
        console.error("getRacesSummary - Error fetching user document: ", error);
        return undefined;
    }
}

// GET weekly gains
// GET gains
export const getWeeklyGainsSummary = async (groupID: string, weeksAgo: number, groups: Record<string, any>): Promise<{ gains: Record<string, { gain: number; username: string; profilePic: string; weeksAgo: number }>} | undefined> => {
    try {
        

        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        // console.log('getGainsSummary - Checkpoint one');
        if(groupDoc.exists()){
            const groupData = groupDoc.data();
            const resetDay = groupDoc.data().resetDay; 
            // Extract user IDs from the users map
            const players = Object.keys(groupData.users || {});

            // Initialize gains map with user IDs as keys and 0 as default values
            const gains = players.reduce((acc, userID) => {
                const username =  groups[groupID]?.users[userID]?.username;
                const profilePic =  groups[groupID]?.users[userID]?.profilePic;
                acc[userID] = {
                  gain: 0,
                  username: username || '',
                  profilePic: profilePic || '',
                  weeksAgo: weeksAgo,
                };
                return acc;
              }, {} as Record<string, { gain: number; username: string; profilePic: string; weeksAgo: number }>);
        
            // console.log("getGainsSummary", gains);

            // find the parameters of the given week

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of the day
            // console.log(weeksAgo, "weeksAgo!!");

            // Calculate the most recent reset day
            let desiredReset = new Date(today);
            desiredReset.setDate(
                today.getDate() - ((today.getDay() - resetDay + 7) % 7) - ((weeksAgo-1) * 7)
            );

            // Calculate the reset day 7 days prior
            const previousReset = new Date(desiredReset);
            previousReset.setDate(desiredReset.getDate() - 7);

            // Convert to timestamps or use as needed
            const startDay = Timestamp.fromDate(previousReset);
            const endDay = Timestamp.fromDate(desiredReset);

            // console.log('Start Day:', startDay.toDate());
            // console.log('End Day:', endDay.toDate());


            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('createdAt', '>=', startDay),
                where('createdAt', '<', endDay));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getGainsSummary - error: No duels found for this past week');
                return undefined;
            }

            // console.log('getGainsSummary - Checkpoint Two');
            // Process each duel and update gains
            querySnapshot.forEach((doc) => {
                const duelData = doc.data();
                const duel: Duel = {
                    winner: duelData.winner,
                    bets: duelData.bets || []
                };

                duel.bets.forEach((bet) => {
                    const userID = bet.userID;
                    const earnings = calculateEarnings(userID, duel);
          
                    // Ensure userID exists in gains; initialize if missing
                    if (!gains[userID]) {
                      const userInfo = groupData.users[userID] || {};
                      gains[userID] = {
                        gain: 0,
                        username: userInfo.username || '',
                        profilePic: userInfo.profilePic || '',
                        weeksAgo: 0,
                      };
                    }
          
                    // Update the gain for the user
                    gains[userID].gain += earnings;
                  });
            });
            // console.log('getGainsSummary - Checkpoint Three', gains);
            return { gains };

        } else{
            console.error("getGainsSummary - error: No such document!");
            return undefined;
        }

    } catch (error) {
        console.error("getGainsSummary - Error fetching user document: ", error);
        return undefined;
    }
}

// GET gains
export const getGainsSummary = async (groupID: string, daysAgo: number, groups: Record<string, any>): Promise<{ gains: Record<string, { gain: number; username: string; profilePic: string; daysAgo: number }>} | undefined> => {
    try {
        

        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        // console.log('getGainsSummary - Checkpoint one');
        if(groupDoc.exists()){
            const groupData = groupDoc.data();
            // Extract user IDs from the users map
            const players = Object.keys(groupData.users || {});

            // Find out if weekly or daily
            const gameType = groupData.gameType || "daily";

            // Initialize gains map with user IDs as keys and 0 as default values
            const gains = players.reduce((acc, userID) => {
                const username =  groups[groupID]?.users[userID]?.username;
                const profilePic =  groups[groupID]?.users[userID]?.profilePic;
                acc[userID] = {
                  gain: 0,
                  username: username || '',
                  profilePic: profilePic || '',
                  daysAgo: daysAgo,
                };
                return acc;
              }, {} as Record<string, { gain: number; username: string; profilePic: string; daysAgo: number }>);
        
            // console.log("getGainsSummary", gains);

            // find the parameters of the given day

            // Create a Date object for the current date and set it to the start of today
            let dayStartTemp = new Date();
            dayStartTemp.setHours(0, 0, 0, 0);
            dayStartTemp.setDate(dayStartTemp.getDate() - daysAgo);

            // Create a new Date object for the end of the same day
            let dayEndTemp = new Date(dayStartTemp);
            dayEndTemp.setHours(23, 59, 59, 999);

            // Convert to Firestore Timestamps
            const dayStart = Timestamp.fromDate(dayStartTemp);
            const dayEnd = Timestamp.fromDate(dayEndTemp);

            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('createdAt', '>=', dayStart),
                where('createdAt', '<', dayEnd));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('getGainsSummary - error: No duels found for today');
                return undefined;
            }

            // console.log('getGainsSummary - Checkpoint Two');
            // Process each duel and update gains
            querySnapshot.forEach((doc) => {
                const duelData = doc.data();
                const duel: Duel = {
                    winner: duelData.winner,
                    bets: duelData.bets || []
                };

                duel.bets.forEach((bet) => {
                    const userID = bet.userID;
                    const earnings = calculateEarnings(userID, duel);
          
                    // Ensure userID exists in gains; initialize if missing
                    if (!gains[userID]) {
                      const userInfo = groupData.users[userID] || {};
                      gains[userID] = {
                        gain: 0,
                        username: userInfo.username || '',
                        profilePic: userInfo.profilePic || '',
                        daysAgo: 0,
                      };
                    }
          
                    // Update the gain for the user
                    gains[userID].gain += earnings;
                  });
            });
            // console.log('getGainsSummary - Checkpoint Three', gains);
            return { gains };

        } else{
            console.error("getGainsSummary - error: No such document!");
            return undefined;
        }

    } catch (error) {
        console.error("getGainsSummary - Error fetching user document: ", error);
        return undefined;
    }
}

// HELPER FUNCTION

interface Bet {
    userID: string;
    wager: number;
    betOnUserID: string;
}

interface Duel {
    winner: string;
    bets: Bet[];
}

const calculateEarnings = (userID: string, duel: Duel) => {
    const userBet = duel.bets.find((betItem: Bet) => betItem.userID === userID);

    // No bet
    if (!userBet) return 0;

    // If draw
    if (duel.winner == "draw") return 0;

    // User lost bet
    if (userBet.betOnUserID !== duel.winner) {
        console.log("bet test: ", userID, -userBet.wager);
        return -userBet.wager;
    }

    // User won bet
    let totalWagers = 0;
    let totalWagersOnWinner = 0;
    duel.bets.forEach((betItem: Bet) => {
        totalWagers += betItem.wager;
        if (betItem.betOnUserID === duel.winner) {
            totalWagersOnWinner += betItem.wager;
        }
    });

    let percentage = 0.0;
    let amountWon = 0.0; 

    // if they are the winner and there were no bets on them, they get 100%
    if(userID == duel.winner && totalWagersOnWinner == 0){
        percentage = 1.0;
        amountWon = totalWagers;
        console.log("bet test, totalWagersOnWiner == 0: ", userID, amountWon);
        return Math.floor(amountWon);
    } else if (userID == duel.winner){
        percentage = 0.5;
        amountWon = percentage * (totalWagers - totalWagersOnWinner)
        console.log("bet test, userID == duel.winner: ", userID, amountWon);
        return Math.floor(amountWon);
    } else {

        percentage = (userBet.wager / totalWagersOnWinner) / 2;
        amountWon = percentage * (totalWagers - totalWagersOnWinner);
        console.log("bet test: ", userID, amountWon);
        return Math.floor(amountWon);
        //return Math.floor(amountWon - userBet.wager);
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
            const groupCycleWeek = groupDoc.data()?.cycleWeek;
            const gameType = groupDoc.data()?.gameType;
            const groupCycle = (gameType === 'weekly' || gameType === 'biweekly') ? groupCycleWeek : groupCycleDay;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const todayStart = Timestamp.fromDate(today);
            const todayEnd = Timestamp.fromDate(tomorrow);
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const q = query(duelsCollection,
                where('cycleCount', '==', groupCycleCount),
                where((gameType === 'weekly' || gameType === 'biweekly') ? 'cycleWeek' : 'cycleDay', '==', groupCycle),
                where('createdAt', '>=', todayStart),
                where('createdAt', '<', todayEnd)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // console.log('getTodaysDuelsSummary - No duels found for today');
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
            // console.log("getTodaysDuelsSummary - response: ", duels);
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
            const gameType = groupDoc.data()?.gameType;
            const groupCurrentCycle = (gameType === 'weekly' || gameType === 'biweekly') ? groupDoc.data()?.cycleWeek : groupDoc.data()?.cycleDay;
            
            // Get snapshot of duels for today
            const duelsCollection = collection(groupDocRef, 'duels');
            const cycleBlank = (gameType === 'weekly' || gameType === 'biweekly') ? 'cycleWeek' : 'cycleDay';
            const q = query(duelsCollection, where('cycleCount', '==', groupCycleCount), where(cycleBlank, '==', groupCurrentCycle));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // console.log('getUnbetDuels - No duels found for today for group: ', groupID);
                return {};
            }

            // console.log('duels found for group ', groupID,)
            
            const duels: { [key: string]: { duelID: string, player1: string, player2: string } } = {};
            querySnapshot.forEach(doc => {
                // console.log("we are here in", groupID)
                const duelData = doc.data();
                // console.log(duelData);
                const bets = duelData.bets || [];
                
                // Check if the user has already placed a bet
                const hasBet = bets.some((bet: { userID: string; wager: number; betOnUserID: string }) => bet.userID === userID);
                // console.log("hasBet, ", hasBet);
                // Use only the duels that have not been bet on yet by user
                if (!hasBet) {
                    duels[doc.id] = {
                        duelID: doc.id,
                        player1: duelData.player1,
                        player2: duelData.player2,
                    };
                }
            });
            // console.log("getUnbetDuels - response: ", duels);
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
            //console.log("checkFinishedBetting - response: ", finishedBetting.includes(userID));
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
            // console.log("checkFinishedRecap - response: ", finishedRecap.includes(userID));
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

// Check if user has finished tutorial
export const checkFinishedTutorial = async (groupID: string, userID: string): Promise<boolean> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const finishedTutorial = groupDoc.data()?.finishedTutorial || [];
            // console.log("checkFinishedTutorial - response: ", finishedTutorial.includes(userID));
            return finishedTutorial.includes(userID);
        } else{
            console.error("checkFinishedTutorial - error: No such document!");
            return false;
        }
    } catch (error) {
         console.error("checkFinishedTutorial - Error fetching user document: ", error);
         return false;
    }
}

// Check if user has finished prop betting
export const checkFinishedPropBet = async (groupID: string, userID: string): Promise<boolean> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const finishedPropBet = groupDoc.data()?.finishedPropBet || [];
            // console.log("checkFinishedPropBet - response: ", finishedPropBet.includes(userID));
            return finishedPropBet.includes(userID);
        } else{
            console.error("checkFinishedPropBet - error: No such document!");
            return false;
        }
    } catch (error) {
         console.error("checkFinishedPropBet - Error fetching user document: ", error);
         return false;
    }
}

/*********************************************** CREATE FUNCTIONS ********************************************/

//CREATE bet
export const createBet = async (groupID: string, userID: string, duelID: string, wager: number, betOnUserID: string): Promise<undefined> => {
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

// ADD user to finishedTutorial
export const addToFinishedTutorial = async (groupID: string, userID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        await updateDoc(groupDocRef, {
            finishedTutorial: arrayUnion(userID),
        });
        console.log(`User ${userID} has finished recap`);
        return undefined;
    } catch (error) {
        console.error("addToFinishedTutorial - Error adding user to finishedTutorial: ", error);
        return undefined;
    }
}

// ADD user to finishedPropBet
export const addToFinishedPropBet = async (groupID: string, userID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        await updateDoc(groupDocRef, {
            finishedPropBet: arrayUnion(userID),
        });
        console.log(`User ${userID} has finished prop bet`);
        return undefined;
    } catch (error) {
        console.error("addToFinishedPropBet - Error adding user to finishedPropBet: ", error);
        return undefined;
    }
}