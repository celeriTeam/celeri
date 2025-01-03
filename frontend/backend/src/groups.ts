import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, setDoc, increment, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();


/*********************************************** GET FUNCTIONS ********************************************/

// GET groupID from group name
export const getGroupIDFromGroupName = async (groupName: string): Promise<string | undefined> => {
    try {
        // Get the group ID from the group name
        const q = query(collection(db, "groups"), where("groupName", "==", groupName));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const groupID = doc.id;
            console.log("getGroupIDFromGroupName - response: ", groupID);
            return groupID;
        } else {
            console.error("getNumberOfUsersByGroupName - error: No matching documents found for groupName", groupName);
            return undefined;
        }
    } catch (error) {
        console.error("getNumberOfUsersByGroupName - Error fetching user document:", error);
        return undefined;
    }
}

// GET Users in Group
export const getUsersInGroup = async (groupID: string): Promise<string[] | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.order) {
            const users = groupDoc.data()?.order;
            console.log("getUsersInGroup - response: ", users);
            return users;
        } else {
            console.error("getUsersInGroup - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getUsersInGroup - Error fetching user document:", error);
        return undefined;
    }
}

// GET Group Info From Code
export const getGroupFromCode = async (groupCode: string): Promise<string | undefined> => {
    try {
        const groupsCollection = collection(db, "groups");
        const q = query(groupsCollection, where("groupCode", "==", groupCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            console.log("getGroupFromCode - response: ", doc.id);
            return doc.id; // Return the document ID
        } else {
            console.error("getGroupFromCode - error: No matching documents found.");
            return '';
        }
    } catch (error) {
         console.error("getGroupFromCode - Error fetching user document: ", error);
         return undefined;
    }
}

// GET Group Name
export const getGroupName = async (groupID: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.groupName){
            console.log("getGroupName - response: ", groupDoc.data()?.groupName);
            return groupDoc.data()?.groupName;
        } else{
            console.error("getGroupName - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupName - Error fetching user document: ", error);
         return undefined;
    }
}

// GET Group Code
export const getGroupCode = async (groupID: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.groupCode){
            console.log("getGroupCode - response: ", groupDoc.data()?.groupCode);
            return groupDoc.data()?.groupCode;
        } else{
            console.error("getGroupCode - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupCode - Error fetching user document: ", error);
         return undefined;
    }
}

// GET Group isGameActive
export const getGroupIsGameActive = async (groupID: string): Promise<boolean | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data().hasOwnProperty('isGameActive')){
            console.log("getGroupIsGameActive - response: ", groupDoc.data()?.isGameActive);
            return groupDoc.data()?.isGameActive;
        } else{
            console.error("getGroupIsGameActive - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupIsGameActive - Error fetching user document: ", error);
         return undefined;
    }
}

// GET Group isFirstDay
export const getGroupIsFirstDay = async (groupID: string): Promise<boolean | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists()){
            const isFirstDay = groupDoc.data()?.cycleCount == 1 && groupDoc.data()?.cycleDay == 1;
            console.log("getGroupIsFirstDay - response: ", isFirstDay);
            return isFirstDay;
        } else{
            console.error("getGroupIsFirstDay - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupIsFirstDay - Error fetching user document: ", error);
         return undefined;
    }
}

// GET Group Creator
export const getGroupCreator = async (groupID: string): Promise<string | undefined> => {
    // this will be the first user that was added to the group
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.order;
            const creator = users[0];
            console.log("getGroupCreator - response: ", creator);
            return creator;
        } else{
            console.error("getGroupCreator - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupCreator - Error fetching user document: ", error);
         return undefined;
    }
}

// GET user tokens (based on group)
export const getUserTokens = async (userID: string, groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.users;
            const user = users[userID];
            const tokens = user.tokens; // - user.todaysBetTokens; removing this bc it makes more sense imo
            console.log("getUserTokens - response: ", tokens);
            return tokens;
        } else{
            console.error("getUserTokens - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getUserTokens - Error fetching user document: ", error);
         return undefined;
    }
}

// GET defaultBetOnSelf
export const getDefaultBetOnSelf = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.defaultBetOnSelf){
            console.log("getDefaultBetOnSelf - response: ", groupDoc.data()?.defaultBetOnSelf);
            return groupDoc.data()?.defaultBetOnSelf;
        } else{
            console.error("getDefaultBetOnSelf - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getDefaultBetOnSelf - Error fetching user document: ", error);
         return undefined;
    }
}

// GET todaysBetTokens
export const getTodaysBetTokens = async (userID: string, groupID: string): Promise<number> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.users;
            const user = users[userID];
            console.log("getTodaysBetTokens - response: ", user.todaysBetTokens);
            return user.todaysBetTokens;
        } else{
            console.error("getTodaysBetTokens - error: No such document!");
            return -1;
        }
    } catch (error) {
         console.error("getTodaysBetTokens - Error fetching user document: ", error);
         return -1;
    }
}

// GET daily tokens
export const getDailyTokens = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.dailyTokens){
            console.log("getDailyTokens - response: ", groupDoc.data()?.dailyTokens);
            return groupDoc.data()?.dailyTokens;
        } else{
            console.error("getDailyTokens - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getDailyTokens - Error fetching user document: ", error);
         return undefined;
    }
}

// GET total cycles
export const getTotalCycles = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.totalCycles){
            console.log("getTotalCycles - response: ", groupDoc.data()?.totalCycles);
            return groupDoc.data()?.totalCycles;
        } else{
            console.error("getTotalCycles - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getTotalCycles - Error fetching user document: ", error);
         return undefined;
    }
}

// GET cycle day OR week
export const getCycle = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists()) {
            const gameType = groupDoc.data()?.gameType;
            const field = gameType === 'weekly' ? 'cycleWeek' : 'cycleDay';
            const value = groupDoc.data()?.[field];
            
            console.log(`getCycle - response: ${value}`);
            return value;
        } else {
            console.error("getCycle - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getCycle - Error fetching user document: ", error);
        return undefined;
    }
}

// GET cycle count
export const getCycleCount = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.cycleCount){
            console.log("getCycleCount - response: ", groupDoc.data()?.cycleCount);
            return groupDoc.data()?.cycleCount;
        } else{
            console.error("getCycleCount - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getCycleCount - Error fetching user document: ", error);
         return undefined;
    }
}

// GET current players in game
export const getCurrentPlayersInGame = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.currentPlayersInGame){
            console.log("getCurrentPlayersInGame - response: ", groupDoc.data()?.currentPlayersInGame);
            return groupDoc.data()?.currentPlayersInGame;
        } else{
            console.error("getCurrentPlayersInGame - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getCurrentPlayersInGame - Error fetching user document: ", error);
         return undefined;
    }
}

// GET diamonds
export const getUserDiamonds = async (userID: string, groupID: string): Promise<number> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.users;
            const user = users[userID];
            const diamonds = user?.diamonds ?? 0;
            console.log("getDiamonds - response: ", diamonds);
            return diamonds;
        } else{
            console.error("getDiamonds - error: No such document!");
            return -1;
        }
    } catch (error) {
         console.error("getDiamonds - Error fetching user document: ", error);
         return -1;
    }
}

// GET Group Profile Pic
export const getGroupProfilePic = async (id: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", id));
        if (groupDoc.exists() && groupDoc.data()?.groupImageUrl) {
            console.log("getGroupProfilePic - response:", groupDoc.data()?.groupImageUrl);
            return groupDoc.data()?.groupImageUrl;
        } else {
            console.error("getGroupPic - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getGroupPic - Error fetching user document:", error);
        return undefined;
    }
}

// GET reset day (if gameType is weekly)
export const getResetDay = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.resetDay){
            console.log("getResetDay - response: ", groupDoc.data()?.resetDay);
            return groupDoc.data()?.resetDay;
        } else{
            console.error("getResetDay - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getResetDay - Error fetching user document: ", error);
         return undefined;
    }
}

// GET group type
export const getGameType = async (groupID: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.gameType){
            console.log("getGameType - response: ", groupDoc.data()?.gameType);
            return groupDoc.data()?.gameType;
        } else{
            console.error("getGameType - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGameType - Error fetching user document: ", error);
         return undefined;
    }
}

// GET prop bet info
export const getPropBet = async (groupID: string, userID: string): Promise<{ betOnUserID: string, averageSteps: number, overUnder: string } | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.propBets){
            const propBets = groupDoc.data()?.propBets;
            for (const propBet of propBets) {
                if (propBet.userID === userID) {
                    const currentBet = {
                        betOnUserID: propBet.betOnUserID,
                        averageSteps: propBet.averageSteps,
                        overUnder: propBet.overUnder,
                    };
                    console.log("getPropBet - response: ", currentBet);
                    return currentBet;
                }
            }
        } else{
            console.error("getPropBet - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getPropBet - Error fetching user document: ", error);
         return undefined;
    }
}

/*********************************************** ADD FUNCTIONS ********************************************/

// ADD user to group
export const addUserToGroup = async (userID: string, groupID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const groupData = groupDoc.data();
            const users = groupData?.users;
            
            // Check if the user is already in the users map
            if (users && users[userID]) {
                console.log(`addUserToGroup - response: User ${userID} is already in the group ${groupID}. No update needed.`);
                return;
            }

             // Ensure startingTokens has a default value
             const startingTokens = groupData?.startingTokens ?? 0;

            
            await updateDoc(groupDocRef, {
                [`users.${userID}`]: {
                    placedBet: false,
                    tokens: startingTokens,
                    todaysBetTokens: 0,
                },
                order: [...groupDoc.data()?.order, userID],
            });

            
            console.log(`addUserToGroup - response: User ${userID} added to group ${groupID}`);
            return undefined;
        } else{
            console.error("addUserToGroup - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("addUserToGroup - Error fetching group document: ", error);
         return undefined;
    }
}

// ADD Group Image
export const addGroupImage = async (groupID: string, groupImageUri: string): Promise<string | null> => {
    try {
        if (groupImageUri != '') {
            const response = await fetch(groupImageUri);
            const blob = await response.blob();
            const storageRef = ref(storage, `groupImages/${groupID}`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            // Update the user's profile in Firestore with the new image URL
            const groupDocRef = doc(db, 'groups', groupID);
            await updateDoc(groupDocRef, {
                groupImageUrl: downloadURL,
            });
            const groupDoc = await getDoc(groupDocRef);
            console.log('addGroupImage - response: ', groupDoc.data()?.groupImageUrl);
            return downloadURL;
        } else {
            console.log("addGroupImage - error: No such document!");
            return null
        }
    } catch (error) {
        console.error("createGroup - Error fetching user document:", error);
        return null;
    }
}

// Edit group name
export const editGroupName = async(groupID: string, groupNameInput: string) => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        await updateDoc(groupDocRef, {
            groupName: groupNameInput,
        });
        const groupDoc = await getDoc(groupDocRef);
        console.log('editGroupName - response: ', groupDoc.data()?.groupName);
    } catch (error) {
        console.error('editGroupName - Error updating username', error);
        return null;
    }
}

export const addPropBet = async (groupID: string, userID: string, betOnUserID: string, averageSteps: number, overUnder: string) => {
    // add to groups[groupID].propBets where propBets = {betOnUserID, userID, averageSteps, overUnder}
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()) {
            const propBetData = {
                betOnUserID: betOnUserID,
                userID: userID,
                averageSteps: averageSteps,
                overUnder: overUnder,
            };
            await updateDoc(groupDocRef, {
                propBets: arrayUnion(propBetData),
            });
            console.log('addPropBet - response: ', propBetData);
        } else {
            console.error('addPropBet - error: No such document!');
            return null;
        }
    } catch (error) {
        console.error('addPropBet - Error adding prop bet:', error);
        return null;
    }
}

/*********************************************** CREATE FUNCTIONS ********************************************/

// CREATE group
export const createGroup = async (userID: string, groupName: string, groupCode: string): Promise<string | undefined> => {
    try {
        console.log('createGroup - ', userID)
        if (!userID || userID.trim() === '') {
            throw new Error('Invalid userID');
        }
        const groupRef = await addDoc(collection(db, 'groups'), {
            groupName,
            "users": {
                [userID]: {
                    "placedBet": false,
                    "tokens": 0,
                    "todaysBetTokens": 0,
                },
            },
            "order": [userID],
            "createdAt": serverTimestamp(),
            "updatedAt": serverTimestamp(),
            "groupImageUrl": null,
            groupCode,
            "isGameActive": false,
        })
        const groupID = groupRef.id;
        console.log("createGroup - response:", groupID);
        return groupID
    } catch (error) {
        console.error("createGroup - Error fetching user document:", error);
        return undefined;
    }
}

/*********************************************** SET FUNCTIONS ********************************************/

// START Game
export const startGame = async (groupID: string, totalCycles: number, dailyTokens: number, startingTokens: number, defaultBetOnSelf: number, gameType: string, resetDay: number): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);

        // Grab the number of players from the document
        let numberOfPlayers;
        let cycles;

        const docSnap = await getDoc(groupDocRef);
        
        if (docSnap.exists()) {
            // Access the 'order' array from the document data
            const data = docSnap.data();
            const orderArray = data.order;
            numberOfPlayers = orderArray.length;
            cycles = createCycle(orderArray);
        } else {
            console.log("startGame - Error: Document does not exist.");
            return undefined;
        }
        
        // set it 

        // if the game is weekly
        if(gameType == "weekly"){
            await updateDoc(groupDocRef, {
                isGameActive: true,
                currentPlayersInGame: numberOfPlayers,
                cycleWeek: 1,
                cycleCount: 1,
                totalCycles: totalCycles,
                startingTokens: startingTokens,
                cycleDuels: cycles,
                gameType: gameType,
                resetDay: resetDay,
            });
        }
        else {
            await updateDoc(groupDocRef, {
                isGameActive: true,
                //set the cycle
                currentPlayersInGame: numberOfPlayers,
                previousPlayersInGame: numberOfPlayers,
                cycleDay: 1,
                cycleCount: 1,
                totalCycles: totalCycles,
                //dailyTokens: dailyTokens,
                //defaultBetOnSelf: 0,
                startingTokens: startingTokens,
                cycleDuels: cycles,
                gameType: gameType,
            });
        }
        // for each user in users, set their tokens to startingTokens
        const users = docSnap.data()?.users;
        for (const user in users) {
            if (users.hasOwnProperty(user)) {
                await updateDoc(groupDocRef, {
                    [`users.${user}.tokens`]: startingTokens,
                });
            }
        }

        // Create the duels for cycleDay 1
        const duelsForDay1 = cycles[0]; // Get the first day's duels

        const usersInDuels = [];
        for (const duelKey in duelsForDay1) {
            if (duelsForDay1.hasOwnProperty(duelKey)) {
                const duel = duelsForDay1[duelKey];
                usersInDuels.push(duel.player1);
                usersInDuels.push(duel.player2);

                const player1Bet = {
                    userID: duel.player1,
                    wager: 0,
                    betOnUserID: duel.player1,
                };
        
                  const player2Bet = {
                    userID: duel.player2,
                    wager: 0,
                    betOnUserID: duel.player2,
                };
                let duelData = {};
                if(gameType == "weekly"){
                    duelData = {
                        player1: duel.player1,
                        player2: duel.player2,
                        cycleWeek: 1,
                        cycleCount: 1,
                        createdAt: serverTimestamp(), // Add a timestamp for when the duel was created
                        winner: "empty",
                        ended: false,
                        bets: [player1Bet, player2Bet],
                    };
                } else {

                    duelData = {
                        player1: duel.player1,
                        player2: duel.player2,
                        cycleDay: 1,
                        cycleCount: 1,
                        createdAt: serverTimestamp(), // Add a timestamp for when the duel was created
                        winner: "empty",
                        ended: false,
                        bets: [player1Bet, player2Bet],
                    };
                }

                // Add the duel to the 'duels' subcollection of the group document
                const duelDocRef = doc(collection(groupDocRef, 'duels')); // Auto-generate document ID in 'duels' subcollection
                await setDoc(duelDocRef, duelData);
            }
        }

        // update the bet tokens for each player in usersUpdate
        for (const user in users) {
            if (users.hasOwnProperty(user)) {
                await updateDoc(groupDocRef, {
                    [`users.${user}.todaysBetTokens`]: usersInDuels.includes(user) ? defaultBetOnSelf : 0,
                });
            }
        }
        
        console.log("startGame - response: ", true);
        return undefined;
    } catch (error) {
         console.error("startGame - Error fetching user document: ", error);
         return undefined;
    }
}

function createCycle(players: Array<string>): Array<{ [duelKey: string]: { player1: string, player2: string } }> {
    const cycles: Array<{ [duelKey: string]: { player1: string, player2: string } }> = [];
    const playerCount = players.length;

    // If there's an odd number of players, add a 'bye' player
    if (playerCount % 2 !== 0) {
        players.push('BYE');
    }

    const rounds = players.length - 1; // Total rounds needed for all players to face each other once

    for (let round = 0; round < rounds; round++) {
        const roundMatchups: { [duelKey: string]: { player1: string, player2: string } } = {};
        let duelCounter = 1;
        for (let i = 0; i < players.length / 2; i++) {
            const player1 = players[i];
            const player2 = players[players.length - 1 - i];

            if (player1 !== 'BYE' && player2 !== 'BYE') {
                const duelKey = `duel${duelCounter}`;
                roundMatchups[duelKey] = {
                    player1: player1,
                    player2: player2,
                };
                duelCounter++;
            }
        }

        // Rotate players for the next round except for the first one
        players.splice(1, 0, players.pop() as string);

        cycles.push(roundMatchups);
    }

    return cycles;
};

// SET todaysBetTokens
export const setTodaysBetTokens = async (userID: string, groupID: string, todaysBetTokens: number): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const groupData = groupDoc.data();
            const users = groupData?.users;
            
            // Check if the user is already in the users map
            if (users && users[userID]) {
                await updateDoc(groupDocRef, {
                    [`users.${userID}.todaysBetTokens`]: increment(todaysBetTokens),
                });
                console.log(`setTodaysBetTokens - response: User ${userID} todaysBetTokens set to ${todaysBetTokens}`);
                return;
            }
        } else{
            console.error("setTodaysBetTokens - error: No such document!");
            return;
        }
    } catch (error) {
         console.error("setTodaysBetTokens - Error fetching group document: ", error);
         return;
    }
}

/*********************************************** MISC FUNCTIONS ********************************************/

// Generate group code
export const generateGroupCode = async (): Promise<string> => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let groupCode = '';
    let isUnique = false;

    while (!isUnique) {
        // Generate a 6-character random code
        groupCode = '';
        for (let i = 0; i < 6; i++) {
            groupCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Check if the group code already exists
        const groupCodeQuery = query(collection(db, "groups"), where("groupCode", "==", groupCode));

        // If no group exists with this code, it's unique
        const querySnapshot = await getDocs(groupCodeQuery);
        if (querySnapshot.size === 0) {
            isUnique = true;
        }
    }

    console.log("generateGroupCode - response: ", groupCode);
    return groupCode;
};