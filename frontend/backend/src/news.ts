import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";
import { getSteps, getWeeklySteps } from "./users";


const db = getFirestore(app);
const storage = getStorage();


/** recordSetter
 * 
 * For each group the user is in, check within [10k, 25k, 50k, 100k] if:
 * 1. The user's weekly steps is the greatest in the group
 * 2. The user's weekly steps surpassed a record in the record list
 * 3. All other players in the group have not surpassed the record
 * 4. The user's previous weekly steps is less than the record
 */
const recordSetter = async (userID: string, prevSteps: number, prevAverageSteps: number[]) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists() && userDoc.data().groups) {
            const groups = userDoc.data().groups;
            for (const groupID of groups) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                if (groupDoc.exists() && groupDoc.data().order) {

                    const newsCollectionRef = collection(db, 'groups', groupID, 'news');
                    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
                    
                    const existingNewsQuery = query(
                        newsCollectionRef,
                        where('type', '==', 'recordSetter'),
                        where('userID', '==', userID),
                        where('createdAt', '>=', fiveMinutesAgo)
                    );

                    const existingNewsSnapshot = await getDocs(existingNewsQuery);
                    
                    if (!existingNewsSnapshot.empty) {
                        // console.log("Duplicate recordSetter news detected within 5 minutes - skipping");
                        continue;
                    }

                    const members = groupDoc.data().order; // user IDs
                    const resetDay = groupDoc.data().resetDay;
                    const isGameActive = groupDoc.data().isGameActive;
                    const steps: { [key: string]: number } = {};
                    const record = [10000, 25000, 50000, 100000];

                    if (!isGameActive) {
                        continue;
                    }
                    for (const member of members) {
                        steps[member] = await getWeeklySteps(groupID, member);
                    }
                    // Sort steps in descending order
                    const sortedSteps = Object.keys(steps).sort((a, b) => steps[b] - steps[a]);
                    
                    // Check if user is first
                    const userIndex = sortedSteps.indexOf(userID);
                    if (userIndex !== 0) {
                        continue;
                    }

                    // Check if user surpassed a record
                    let recordIndex = -1;
                    for (let i = 0; i < record.length; i++) {
                        if (steps[userID] >= record[i]) {
                            recordIndex = i;
                        }
                    }
                    if (recordIndex === -1) { // User did not surpass any record
                        continue;
                    }

                    // Check if all other players have not surpassed the record
                    if (sortedSteps.slice(1).some((member) => steps[member] >= record[recordIndex])) {
                        continue;
                    }

                    // Check if user's previous weekly steps is less than the record
                    const prevWeeklySteps = calculatePrevWeeklySteps(prevSteps, prevAverageSteps, resetDay);
                    if (prevWeeklySteps >= record[recordIndex]) {
                        continue;
                    }

                    // Update group's record
                    console.log("recordSetter - User surpassed a record in group: ", groupID);
                    const newNews = {
                        type: 'recordSetter',
                        createdAt: Timestamp.now(),
                        priority0: members,
                        userID: userID,
                        record: record[recordIndex],
                    };

                    // add to 'news' collection in group:
                    // const groupDocRef = doc(db, 'groups', groupID);
                    // const newsCollectionRef = collection(groupDocRef, 'news');
                    await addDoc(newsCollectionRef, newNews);
                } else {
                    console.error("recordSetter - error: No such document!");
                    return undefined;
                }
            }
        } else {
            console.error("recordSetter - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("recordSetter - Error fetching user document:", error);
        return undefined;
    }
}

/** racePullAheadTopThree
 * 
 * For each group the user is in, check if:
 * 1. The user is in the top 3 of the group
 * 2. The user's previous weekly steps is less than the 2nd or 3rd place
 */
const racePullAheadTopThree = async (userID: string, prevSteps: number, prevAverageSteps: number[]) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists() && userDoc.data().groups) {
            const groups = userDoc.data().groups;
            for (const groupID of groups) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                if (groupDoc.exists() && groupDoc.data().order) {

                    const newsCollectionRef = collection(db, 'groups', groupID, 'news');
                    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
                    
                    const existingNewsQuery = query(
                        newsCollectionRef,
                        where('type', '==', 'racePullAheadTopThree'),
                        where('userID', '==', userID),
                        where('createdAt', '>=', fiveMinutesAgo)
                    );

                    const existingNewsSnapshot = await getDocs(existingNewsQuery);
                    
                    if (!existingNewsSnapshot.empty) {
                        // console.log("Duplicate recordSetter news detected within 5 minutes - skipping");
                        continue;
                    }

                    const members = groupDoc.data().order; // user IDs
                    const resetDay = groupDoc.data().resetDay;
                    const isGameActive = groupDoc.data().isGameActive;
                    const steps: { [key: string]: number } = {};

                    if (!isGameActive) {
                        continue;
                    }
                    for (const member of members) {
                        steps[member] = await getWeeklySteps(groupID, member);
                    }
                    // Sort steps in descending order
                    const sortedSteps = Object.keys(steps).sort((a, b) => steps[b] - steps[a]);
                    
                    // Check if user is in top 3
                    const userIndex = sortedSteps.indexOf(userID);
                    if (userIndex > 2) {
                        continue;
                    }

                    // Check if user's previous weekly steps is less than 2nd or 3rd place
                    const prevWeeklySteps = calculatePrevWeeklySteps(prevSteps, prevAverageSteps, resetDay);
                    if (prevWeeklySteps >= steps[sortedSteps[userIndex + 1]]) {
                        continue;
                    }

                    // Update group's record
                    console.log("racePullAheadTopThree - User is in top 3 in group: ", groupID);
                    const newNews = {
                        type: 'racePullAheadTopThree',
                        createdAt: Timestamp.now(),
                        priority1: members,
                        userID: userID,
                        place: userIndex + 1,
                    };
                    // add to 'news' collection in group:
                    // const groupDocRef = doc(db, 'groups', groupID);
                    // const newsCollection = collection(groupDocRef, 'news');
                    await addDoc(newsCollectionRef, newNews);
                } else {
                }
            }
        } else {
            console.error("racePullAheadTopThree - error: No such document!");
            return undefined;
        }

    } catch (error) {
        console.error("racePullAheadTopThree - Error fetching user document:", error);
        return undefined;
    }
}


/** headToHeadPullAhead
 * 
 * For each group the user is in, check if:
 * 1. The user is in a head-to-head challenge
 * 2. The user is winning their head-to-head
 * 3. The user's previous weekly steps is less than the opponent's
 */
const headToHeadPullAhead = async (userID: string, prevSteps: number, prevAverageSteps: number[]) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists() && userDoc.data().groups) {
            const groups = userDoc.data().groups;
            for (const groupID of groups) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                if (groupDoc.exists() && groupDoc.data().order) {

                    const newsCollectionRef = collection(db, 'groups', groupID, 'news');
                    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
                    
                    const existingNewsQuery = query(
                        newsCollectionRef,
                        where('type', '==', 'headToHeadPullAhead'),
                        where('userID', '==', userID),
                        where('createdAt', '>=', fiveMinutesAgo)
                    );

                    const existingNewsSnapshot = await getDocs(existingNewsQuery);
                    
                    if (!existingNewsSnapshot.empty) {
                        // console.log("Duplicate recordSetter news detected within 5 minutes - skipping");
                        continue;
                    }

                    const members = groupDoc.data().order; // user IDs
                    const gameType = groupDoc.data().gameType;
                    const groupCycleCount = groupDoc.data()?.cycleCount;
                    const groupCurrentCycle = gameType === 'daily' ? groupDoc.data()?.cycleDay : groupDoc.data()?.cycleWeek;
                    const resetDay = groupDoc.data().resetDay;
                    const isGameActive = groupDoc.data().isGameActive;
                    
                    if (!isGameActive) {
                        continue;
                    }

                    // Check if user is in a head-to-head challenge
                    const groupDocRef = doc(db, 'groups', groupID);
                    const duelsCollection = collection(groupDocRef, 'duels');
                    const cycleBlank = gameType === 'daily' ? 'cycleDay' : 'cycleWeek';
                    const q1 = query(duelsCollection, 
                        where('cycleCount', '==', groupCycleCount), 
                        where(cycleBlank, '==', groupCurrentCycle),
                        where('player1', '==', userID)
                    );
                    
                    const q2 = query(duelsCollection, 
                        where('cycleCount', '==', groupCycleCount), 
                        where(cycleBlank, '==', groupCurrentCycle),
                        where('player2', '==', userID)
                    );
                    
                    // Execute both queries and combine results
                    const snapshot1 = await getDocs(q1);
                    const snapshot2 = await getDocs(q2);
                    let duelPlayer = '';
                    
                    // Combine results (avoiding duplicates if necessary)
                    const results: any = [];
                    snapshot1.forEach(doc => {
                        duelPlayer = 'player1';
                        results.push(doc.data());
                    });
                    snapshot2.forEach(doc => {
                        duelPlayer = 'player2';
                        results.push(doc.data());
                    });

                    if (results.length === 0) {
                        continue;
                    }

                    // Check if user is winning their head-to-head
                    const duel = results[0];
                    const opponentID = duel[duelPlayer === 'player1' ? 'player2' : 'player1'];
                    const userSteps = await getWeeklySteps(groupID, userID);
                    const opponentSteps = await getWeeklySteps(groupID, opponentID);
                    if (userSteps <= opponentSteps) {
                        continue;
                    }

                    // Check if user's previous weekly steps is less than the opponent's
                    const prevWeeklySteps = calculatePrevWeeklySteps(prevSteps, prevAverageSteps, resetDay);
                    if (prevWeeklySteps >= opponentSteps) {
                        continue;
                    }

                    // Update group's record
                    console.log("headToHeadPullAhead - User is winning head-to-head in group: ", groupID);
                    const betters: string[] = [];
                    for (const bet of duel.bets) {
                        if (bet.betOnUserID === userID && bet.userID !== userID) {
                            betters.push(bet.userID);
                        }
                    }

                    const nonBetters = members.filter((member: string) => !betters.includes(member) && member !== userID && member !== opponentID);

                    const newNews = {
                        type: 'headToHeadPullAhead',
                        createdAt: Timestamp.now(),
                        priority1: [userID, opponentID],
                        priority2: betters,
                        priority3: nonBetters,
                        userID: userID,
                        opponentID: opponentID,
                    };
                    // add to 'news' collection in group:
                    // const newsCollection = collection(groupDocRef, 'news');
                    await addDoc(newsCollectionRef, newNews);
                } else {
                }
            }
        } else {
            console.error("headToHeadPullAhead - error: No such document!");
            return undefined;
        }

    } catch (error) {
        console.error("headToHeadPullAhead - Error fetching user document:", error);
        return undefined;
    }
}

/** racePullAheadOfYou
 * 
 * For each group the user is in, check if:
 * The user's previous weekly steps is less than the person behind them
 */
const racePullAheadOfYou = async (userID: string, prevSteps: number, prevAverageSteps: number[]) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists() && userDoc.data().groups) {
            const groups = userDoc.data().groups;
            for (const groupID of groups) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                if (groupDoc.exists() && groupDoc.data().order) {

                    const newsCollectionRef = collection(db, 'groups', groupID, 'news');
                    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
                    
                    const existingNewsQuery = query(
                        newsCollectionRef,
                        where('type', '==', 'racePullAheadOfYou'),
                        where('userID', '==', userID),
                        where('createdAt', '>=', fiveMinutesAgo)
                    );

                    const existingNewsSnapshot = await getDocs(existingNewsQuery);
                    
                    if (!existingNewsSnapshot.empty) {
                        // console.log("Duplicate recordSetter news detected within 5 minutes - skipping");
                        continue;
                    }

                    const members = groupDoc.data().order; // user IDs
                    const resetDay = groupDoc.data().resetDay;
                    const isGameActive = groupDoc.data().isGameActive;
                    const steps: { [key: string]: number } = {};

                    if (!isGameActive) {
                        continue;
                    }
                    for (const member of members) {
                        steps[member] = await getWeeklySteps(groupID, member);
                    }
                    // Sort steps in descending order
                    const sortedSteps = Object.keys(steps).sort((a, b) => steps[b] - steps[a]);
                    
                    const userIndex = sortedSteps.indexOf(userID);
                    
                    const prevWeeklySteps = calculatePrevWeeklySteps(prevSteps, prevAverageSteps, resetDay);

                    // Check users currently behind the user
                    const usersBehind = sortedSteps.slice(userIndex + 1);
                    const usersPassed = [];
                    for (const user of usersBehind) {
                        if (prevWeeklySteps >= steps[user]) {
                            break;
                        }
                        usersPassed.push(user);
                    }
                    if (usersPassed.length === 0) {
                        continue;
                    }

                    // Update group's record
                    console.log("racePullAheadOfYou - User is being passed in group: ", groupID);
                    const newNews = {
                        type: 'racePullAheadOfYou',
                        createdAt: Timestamp.now(),
                        priority2: usersPassed,
                        userID: userID,
                    };

                    // add to 'news' collection in group:
                    // const groupDocRef = doc(db, 'groups', groupID);
                    // const newsCollection = collection(groupDocRef, 'news');
                    await addDoc(newsCollectionRef, newNews);
                } else {
                }
            }
        } else {
            console.error("racePullAheadOfYou - error: No such document!");
            return undefined;
        }

    } catch (error) {
        console.error("racePullAheadOfYou - Error fetching user document:", error);
        return undefined;
    }
}


/** headToHeadOpponentWalking
 * 
 * Check if the user's steps - user's steps 5 hours ago > 5k
 * IF so, then for each group the user is in:
 * 1. Check if the user is in a head-to-head challenge
 * 2. If so, add opponent to priority2 list
 * 3. Add everyone else to priority3 list
 */
const headToHeadOpponentWalking = async (userID: string, fiveHoursSteps: number) => {
    try {
        if (fiveHoursSteps < 5000) {
            return;
        }

        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists() && userDoc.data().groups) {
            const groups = userDoc.data().groups;
            for (const groupID of groups) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                if (groupDoc.exists() && groupDoc.data().order) {

                    const newsCollectionRef = collection(db, 'groups', groupID, 'news');
                    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
                    
                    const existingNewsQuery = query(
                        newsCollectionRef,
                        where('type', '==', 'headToHeadOpponentWalking'),
                        where('userID', '==', userID),
                        where('createdAt', '>=', fiveMinutesAgo)
                    );

                    const existingNewsSnapshot = await getDocs(existingNewsQuery);
                    
                    if (!existingNewsSnapshot.empty) {
                        // console.log("Duplicate recordSetter news detected within 5 minutes - skipping");
                        continue;
                    }

                    const members = groupDoc.data().order; // user IDs
                    const gameType = groupDoc.data().gameType;
                    const groupCycleCount = groupDoc.data()?.cycleCount;
                    const groupCurrentCycle = gameType === 'daily' ? groupDoc.data()?.cycleDay : groupDoc.data()?.cycleWeek;
                    const resetDay = groupDoc.data().resetDay;
                    const isGameActive = groupDoc.data().isGameActive;
                    
                    if (!isGameActive) {
                        continue;
                    }

                    // Check if user is in a head-to-head challenge
                    const groupDocRef = doc(db, 'groups', groupID);
                    const duelsCollection = collection(groupDocRef, 'duels');
                    const cycleBlank = gameType === 'daily' ? 'cycleDay' : 'cycleWeek';
                    const q1 = query(duelsCollection, 
                        where('cycleCount', '==', groupCycleCount), 
                        where(cycleBlank, '==', groupCurrentCycle),
                        where('player1', '==', userID)
                    );
                    
                    const q2 = query(duelsCollection, 
                        where('cycleCount', '==', groupCycleCount), 
                        where(cycleBlank, '==', groupCurrentCycle),
                        where('player2', '==', userID)
                    );
                    
                    // Execute both queries and combine results
                    const snapshot1 = await getDocs(q1);
                    const snapshot2 = await getDocs(q2);
                    let duelPlayer = '';
                    
                    // Combine results (avoiding duplicates if necessary)
                    const results: any = [];
                    snapshot1.forEach(doc => {
                        duelPlayer = 'player1';
                        results.push(doc.data());
                    });
                    snapshot2.forEach(doc => {
                        duelPlayer = 'player2';
                        results.push(doc.data());
                    });

                    let newNews = {};

                    if (results.length === 0) {
                        newNews = {
                            type: 'headToHeadOpponentWalking',
                            createdAt: Timestamp.now(),
                            priority3: members.filter((member: string) => member !== userID),
                            userID: userID,
                            steps: fiveHoursSteps,
                        };
                    } else {
                        const duel = results[0];
                        const opponentID = duel[duelPlayer === 'player1' ? 'player2' : 'player1'];
                        newNews = {
                            type: 'headToHeadOpponentWalking',
                            createdAt: Timestamp.now(),
                            priority2: [opponentID],
                            priority3: members.filter((member: string) => member !== userID && member !== opponentID),
                            userID: userID,
                            steps: fiveHoursSteps,
                        };
                    }
                    
                    // add to 'news' collection in group:
                    console.log("headToHeadOpponentWalking - User is walking a lot in group: ", groupID);
                    const newsCollection = collection(groupDocRef, 'news');
                    await addDoc(newsCollection, newNews);                    
                }
            }
        } else {
            console.error("headToHeadOpponentWalking - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("headToHeadOpponentWalking - Error fetching user document:", error);
        return undefined;
    }
}

const calculateNewPrevSteps = (prevSteps: number, prevAverageSteps: number[], stepsLastUpdate: Date): { newPrevAverageSteps: number[], newPrevSteps: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const lastUpdate = new Date(stepsLastUpdate);
    lastUpdate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Calculate days difference
    const diffTime = today.getTime() - lastUpdate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // If same day, no changes needed
    if (diffDays === 0) {
        return {
            newPrevAverageSteps: [...prevAverageSteps],
            newPrevSteps: prevSteps
        };
    }
    
    // Create a new array for the updated average steps
    let newPrevAverageSteps = [...prevAverageSteps];
    
    // Shift the array based on days passed
    for (let i = 0; i < diffDays; i++) {
        // For the first day, add prevSteps to the end
        if (i === 0) {
            newPrevAverageSteps.shift();
            newPrevAverageSteps.push(prevSteps);
        } else {
            // For subsequent days, add 0 (no steps recorded)
            newPrevAverageSteps.shift();
            newPrevAverageSteps.push(0);
        }
    }
    
    // Reset current day's steps to 0
    const newPrevSteps = 0;
    
    return {
        newPrevAverageSteps,
        newPrevSteps
    };
};

const calculatePrevWeeklySteps = (prevSteps: number, prevAverageSteps: number[], resetDay: number): number => {
    const todayIndex = new Date().getDay();
    const daysPast = (todayIndex - resetDay) % 7;
    const totalStepsSinceReset = daysPast != 0 ? prevAverageSteps.slice(-daysPast).reduce((sum: number, steps: number) => sum + steps, 0) : 0;
    return prevSteps + totalStepsSinceReset;
};

export const newsFunctions = async (userID: string, prevSteps: number, prevAverageSteps: number[], fiveHoursSteps: number, stepsLastUpdate: Date) => {
    const { newPrevAverageSteps, newPrevSteps } = calculateNewPrevSteps(prevSteps, prevAverageSteps, stepsLastUpdate);
    const currentSteps = await getSteps(userID);
    if (currentSteps > newPrevSteps) {
        // run all news functions
        await recordSetter(userID, newPrevSteps, newPrevAverageSteps);
        await racePullAheadTopThree(userID, newPrevSteps, newPrevAverageSteps);
        await headToHeadPullAhead(userID, newPrevSteps, newPrevAverageSteps);
        await racePullAheadOfYou(userID, newPrevSteps, newPrevAverageSteps);
        await headToHeadOpponentWalking(userID, fiveHoursSteps);
    }
}