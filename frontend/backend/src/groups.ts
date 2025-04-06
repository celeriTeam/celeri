import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, setDoc,
    increment, arrayUnion, deleteDoc, deleteField, orderBy, limit, startAfter,
    DocumentSnapshot,
    Timestamp,
    runTransaction
} from "firebase/firestore";
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
            //console.log("getGroupIDFromGroupName - response: ", groupID);
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
            //console.log("getUsersInGroup - response: ", users);
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
            // console.log("getGroupFromCode - response: ", doc.id);
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
            // console.log("getGroupName - response: ", groupDoc.data()?.groupName);
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
            // console.log("getGroupCode - response: ", groupDoc.data()?.groupCode);
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
// GET Group createdAt
export const getGroupCreatedAt = async (groupID: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.createdAt){
            // console.log("getGroupCreatedAt - response: ", groupDoc.data()?.createdAt);
            return groupDoc.data()?.createdAt;
        } else{
            console.error("getGroupCreatedAt - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupCreatedAt - Error fetching user document: ", error);
         return undefined;
    }
}

// GET Group isGameActive
export const getGroupIsGameActive = async (groupID: string): Promise<boolean | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data().hasOwnProperty('isGameActive')){
            // console.log("getGroupIsGameActive - response: ", groupDoc.data()?.isGameActive);
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
            const gameType = groupDoc.data()?.gameType;
            const currentCycle = (gameType === 'weekly' || gameType === 'biweekly') ? groupDoc.data()?.cycleWeek : groupDoc.data()?.cycleDay;
            const isFirstDay = groupDoc.data()?.cycleCount == 1 && currentCycle == 1;
            // console.log("getGroupIsFirstDay - response: ", isFirstDay);
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
            // console.log("getGroupCreator - response: ", creator);
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
export const getUserTokens = async (groupID: string, userID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.users;
            const user = users[userID];
            const tokens = user.tokens; // - user.todaysBetTokens; removing this bc it makes more sense imo
            // console.log("getUserTokens - response: ", tokens);
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
            // console.log("getDefaultBetOnSelf - response: ", groupDoc.data()?.defaultBetOnSelf);
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
export const getTodaysBetTokens = async (groupID: string, userID: string): Promise<number> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.users;
            const user = users[userID];
            // console.log(`getTodaysBetTokens - response for ${userID}: ${user.todaysBetTokens}`);
            return user.todaysBetTokens;
        } else{
            console.error("getTodaysBetTokens - error: No such document!");
            return 0;
        }
    } catch (error) {
         console.error("getTodaysBetTokens - Error fetching user document: ", error);
         return 0;
    }
}

// GET daily tokens
export const getDailyTokens = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.dailyTokens){
            //console.log("getDailyTokens - response: ", groupDoc.data()?.dailyTokens);
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
            // console.log("getTotalCycles - response: ", groupDoc.data()?.totalCycles);
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
            const value = (gameType === 'weekly' || gameType === 'biweekly') ? groupDoc.data()?.cycleWeek : groupDoc.data()?.cycleDay;
            
            // console.log(`getCycle - response: ${value}`);
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
            // console.log("getCycleCount - response: ", groupDoc.data()?.cycleCount);
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
            // console.log("getCurrentPlayersInGame - response: ", groupDoc.data()?.currentPlayersInGame);
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
export const getUserDiamonds = async (groupID: string, userID: string): Promise<number> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const users = groupDoc.data()?.users;
            const user = users[userID];
            const diamonds = user?.diamonds ?? 0;
            // console.log("getDiamonds - response: ", diamonds);
            return diamonds;
        } else{
            console.error("getDiamonds - error: No such document!");
            return 0;
        }
    } catch (error) {
         console.error("getDiamonds - Error fetching user document: ", error);
         return 0;
    }
}

// GET Group Profile Pic
export const getGroupProfilePic = async (id: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", id));
        if (groupDoc.exists() && groupDoc.data()?.groupImageUrl) {
            // console.log("getGroupProfilePic - response:", groupDoc.data()?.groupImageUrl);
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
        if (groupDoc.exists() && (groupDoc.data()?.resetDay !== undefined)){
            // console.log("getResetDay - response: ", groupDoc.data()?.resetDay);
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
            // console.log("getGameType - response: ", groupDoc.data()?.gameType);
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
export const getPropBet = async (groupID: string, userID: string): Promise<{ betOnUserID: string, averageStepCount: number, overUnder: string } | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.propBets){
            const propBets = groupDoc.data()?.propBets;
            for (const propBet of propBets) {
                if (propBet.userID === userID) {
                    const currentBet = {
                        betOnUserID: propBet.betOnUserID,
                        averageStepCount: propBet.averageStepCount,
                        overUnder: propBet.overUnder,
                    };
                    // console.log("getPropBet - response: ", currentBet);
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

// GET last login
export const getLastLogin = async (groupID: string, userID: string): Promise<Date | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const loginTime = groupDoc.data()?.users[userID]?.loginTime;
            const today = new Date();
            const lastLogin = loginTime ? loginTime[0] : today;
            // console.log(`getLastLogin - response for ${userID}: ${loginTime}`);
            return lastLogin;
        } else{
            console.error("getLastLogin - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getLastLogin - Error fetching user document: ", error);
         return undefined;
    }
}

// GET starting tokens
export const getStartingTokens = async (groupID: string): Promise<number | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.startingTokens){
            // console.log("getStartingTokens - response: ", groupDoc.data()?.startingTokens);
            return groupDoc.data()?.startingTokens;
        } else{
            console.error("getStartingTokens - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getStartingTokens - Error fetching user document: ", error);
         return undefined;
    }
}

// GET latest bet time
export const getLatestBetTime = async (groupID: string, userID: string): Promise<Date | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const latestBetTime = groupDoc.data()?.users[userID]?.latestBetTime;
            // console.log(`getLatestBetTime - response for ${userID}: ${latestBetTime}`);
            return latestBetTime ? latestBetTime.toDate() : undefined;
        } else{
            console.error("getLatestBetTime - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getLatestBetTime - Error fetching user document: ", error);
         return undefined;
    }
}

// GET tutorial status
export const getTutorialStatus = async (groupID: string, userID: string): Promise<
    {
        propBet?: boolean,
        liveDuels?: boolean,
        store?: boolean,
        gainsHistory?: boolean,
        betsHistory?: boolean,
        raceHistory?: boolean,
        newsHistory?: boolean,
        currency?: boolean
    }
> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users){
            const tutorialStatus = groupDoc.data()?.users[userID]?.tutorials;
            // console.log(`getLatestBetTime - response for ${userID}: ${tutorialStatus ?? {}}`);
            return tutorialStatus ?? {};
        } else{
            console.error("getLatestBetTime - error: No such document!");
            return {};
        }
    } catch (error) {
         console.error("getLatestBetTime - Error fetching user document: ", error);
         return {};
    }
}

export const getNewsSummary = async (groupID: string, targetDate: Date): Promise<{ news: any[]; nextTargetDate: Date }> => {
    try {
        const groupDocRef = doc(db, "groups", groupID);
        const newsRef = collection(groupDocRef, "news");

        // Calculate day boundaries
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            newsRef,
            where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
            where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const rawNews = await Promise.all(
            querySnapshot.docs.map(async (newsDoc) => {
                const newsData = newsDoc.data();
                const userRef = doc(db, "users", newsData.userID);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();
                let userOpponentData = null;
                if (newsData.opponentID) {
                    const userOpponentRef = doc(db, "users", newsData.opponentID);
                    const userOpponentDoc = await getDoc(userOpponentRef);
                    userOpponentData = userOpponentDoc.data();
                }
                let content = "";

                if (newsData.type === 'recordSetter') {
                    content = `set a new record of ${newsData.record} steps`;
                } else if (newsData.type === 'racePullAheadTopThree') {
                    const placeSuffix = newsData.place === 1 ? 'st' : newsData.place === 2 ? 'nd' : newsData.place === 3 ? 'rd' : 'th';
                    content = `bumped up to ${newsData.place}${placeSuffix} place`;
                } else if (newsData.type === 'headToHeadPullAhead') {
                    content = `pulled ahead of ${userOpponentData?.username ?? ''} in their head to head`;
                }

                return userData ? {
                    id: newsDoc.id,
                    type: newsData.type,
                    userID: newsData.userID,
                    username: userData.username ?? '',
                    profilePic: userData.profileImageUrl ?? '',
                    createdAt: newsData.createdAt.toDate(),
                    content: content,
                    place: newsData.place,
                    opponentID: newsData.opponentID
                } : null;
            })
        );

        // Filter nulls and apply business rules
        const filteredNews = rawNews.filter(Boolean).reduce((acc, item) => {
            if (!item) {
                return acc;
            }
            switch(item.type) {
                case 'recordSetter':
                    if (!acc.some(i => i.type === 'recordSetter')) {
                        acc.push(item);
                    }
                    break;

                case 'racePullAheadTopThree':
                    const exists = acc.some(i => 
                        i.type === 'racePullAheadTopThree' && 
                        (i.userID === item.userID || 
                        i.place === item.place)
                    );
                    if (!exists) acc.push(item);
                    break;

                case 'headToHeadPullAhead':
                    const pair = [item.userID, item.opponentID].sort();
                    const existsH2H = acc.some(i => 
                        i.type === 'headToHeadPullAhead' && 
                        [i.userID, i.opponentID].sort().join() === pair.join()
                    );
                    if (!existsH2H) acc.push(item);
                    break;

                default:
                    // acc.push(item);
                    break;
            }
            return acc;
        }, [] as any[]);

        // Get next target date (previous day)
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() - 1);

        return {
            news: filteredNews,
            nextTargetDate: nextDate
        };
    } catch (error) {
        console.error('Error fetching news:', error);
        return { news: [], nextTargetDate: new Date() };
    }
};

/*********************************************** ADD FUNCTIONS ********************************************/

// ADD user to group
export const addUserToGroup = async (groupID: string, userID: string): Promise<undefined> => {
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

export const addPropBet = async (groupID: string, userID: string, betOnUserID: string, averageStepCount: number, overUnder: string) => {
    // add to groups[groupID].propBets where propBets = {betOnUserID, userID, averageStepCount, overUnder}
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()) {
            const propBetData = {
                betOnUserID: betOnUserID,
                userID: userID,
                averageStepCount: averageStepCount,
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

// SET login
export const setLogin = async (groupID: string, userID: string, time: Date) => {
    try {
        // groups[groupID].users[userID].loginTime will be a list [lastlogin, currentlogin]
        // if loginTime doesnt exist, create it with lastlogin = currentlogin
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()) {
            const loginTime = groupDoc.data()?.users[userID]?.loginTime;
            if (loginTime) {
                const lastLogin = loginTime[1].toDate();
                const timeDifferenceNow = time.getTime() - lastLogin.getTime();
                const timeDifference = lastLogin.getTime() - loginTime[0].toDate().getTime();
                const oneMinuteInMs = 60 * 1000;
        
                if (timeDifferenceNow >= oneMinuteInMs || timeDifference >= oneMinuteInMs) {
                  await updateDoc(groupDocRef, {
                    [`users.${userID}.loginTime`]: [loginTime[1], time],
                  });
                  console.log('setLogin - response: Login time updated');
                } else {
                  console.log('setLogin - response: Login time not updated (within 1 minute of last login)');
                }
            } else {
                await updateDoc(groupDocRef, {
                    [`users.${userID}.loginTime`]: [time, time],
                });
                console.log('setLogin - response: Initial login time set');
            }
            console.log('setLogin - response: Login time set');
        } else {
            console.error('setLogin - error: No such document!');
        }
    } catch (error) {
        console.error('setLogin - Error updating last login:', error);
    }
}

export const setLatestBetTime = async (groupID: string, userID: string, time: Date): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()) {
            await updateDoc(groupDocRef, {
                [`users.${userID}.latestBetTime`]: time,
            });
            console.log('setLatestBetTime - response: Latest bet time set');
            return;
        } else {
            console.error('setLatestBetTime - error: No such document!');
            return;
        }
    } catch (error) {
        console.error('setLatestBetTime - Error setting latest bet time:', error);
        return;
    }
}

export const setTutorialStatus = async (groupID: string, userID: string, tutorial: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()) {
            await updateDoc(groupDocRef, {
                [`users.${userID}.tutorials.${tutorial}`]: true,
            });
            console.log('setTutorialStatus - response: Latest bet time set');
            return;
        } else {
            console.error('setTutorialStatus - error: No such document!');
            return;
        }
    } catch (error) {
        console.error(`setTutorialStatus - Error setting ${tutorial} tutorial status: ${error}`);
        return;
    }
}

export const addDiamonds = async (groupID: string, userID: string, diamonds: number) => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()) {
            const userDiamonds = groupDoc.data()?.users[userID]?.diamonds ?? 0;
            await updateDoc(groupDocRef, {
                [`users.${userID}.diamonds`]: userDiamonds + diamonds,
            });
            console.log('addDiamonds - response: Diamonds added');
        } else {
            console.error('addDiamonds - error: No such document!');
        }
    } catch (error) {
        console.error('addDiamonds - Error adding diamonds:', error);
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

/*********************************************** DELETE FUNCTIONS ********************************************/

export const deleteGroup = async (groupID: string) => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        
        if (groupDoc.exists()) {
            const orderArray = groupDoc.data()?.order || [];
            
            // Remove group from each user's groups array
            for (const userID of orderArray) {
                const userDocRef = doc(db, 'users', userID);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userGroups = userDoc.data()?.groups || [];
                    await updateDoc(userDocRef, {
                        groups: userGroups.filter((group: string) => group !== groupID)
                    });
                }
            }
            
            // Delete the group document
            await deleteDoc(groupDocRef);
            console.log('deleteGroup - response: Group deleted');
        } else {
            console.error('deleteGroup - error: No such document!');
        }
    } catch (error) {
        console.error('deleteGroup - Error deleting group:', error);
    }
}

export const leaveGroup = async (groupID: string, userID: string) => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const userDocRef = doc(db, 'users', userID);
        
        const groupDoc = await getDoc(groupDocRef);
        const userDoc = await getDoc(userDocRef);
        
        if (groupDoc.exists() && userDoc.exists()) {
            // Remove user from group's order array and users map
            await updateDoc(groupDocRef, {
                order: groupDoc.data()?.order.filter((id: string) => id !== userID),
                [`users.${userID}`]: deleteField()
            });
            
            // Remove group from user's groups array
            const userGroups = userDoc.data()?.groups || [];
            await updateDoc(userDocRef, {
                groups: userGroups.filter((id: string) => id !== groupID)
            });
            
            console.log('leaveGroup - response: User left group');
        } else {
            console.error('leaveGroup - error: Document does not exist');
        }
    } catch (error) {
        console.error('leaveGroup - Error leaving group:', error);
    }
}

/*********************************************** SET FUNCTIONS ********************************************/

// START Game
export const startGame = async (groupID: string, totalCycles: number, startingTokens: number, gameType: string, resetDay: number): Promise<undefined> => {
    const groupDocRef = doc(db, 'groups', groupID);
    
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Atomic read of group document
            const groupDoc = await transaction.get(groupDocRef);
            if (!groupDoc.exists()) {
                throw new Error('Group document does not exist');
            }

            const data = groupDoc.data();
            const orderArray = data.order;
            const numberOfPlayers = orderArray.length;
            const cycles = createCycle(orderArray);
            const users = data.users;

            // 2. Prepare all updates first
            const updateData: any = {
                isGameActive: true,
                currentPlayersInGame: numberOfPlayers,
                cycleCount: 1,
                totalCycles,
                startingTokens,
                cycleDuels: cycles,
                gameType,
                gameStartedAt: serverTimestamp(),
            };

            if (gameType === "weekly" || gameType === 'biweekly') {
                updateData.cycleWeek = 1;
                updateData.resetDay = resetDay;
            } else {
                updateData.cycleDay = 1;
                updateData.previousPlayersInGame = numberOfPlayers;
            }

            // 3. Update group document atomically
            transaction.update(groupDocRef, updateData);

            // 4. Update user tokens in transaction
            const usersUpdate: Record<string, any> = {};
            Object.keys(users).forEach(userID => {
                usersUpdate[`users.${userID}.tokens`] = startingTokens;
                usersUpdate[`users.${userID}.todaysBetTokens`] = 0;
            });
            transaction.update(groupDocRef, usersUpdate);

            // 5. Create duels in transaction
            const duelsForDay1 = cycles[0];
            const duelsCollection = collection(groupDocRef, 'duels');
            
            Object.values(duelsForDay1).forEach(duel => {
                const duelDocRef = doc(duelsCollection);
                const duelData = {
                    player1: duel.player1,
                    player2: duel.player2,
                    createdAt: serverTimestamp(),
                    winner: "empty",
                    ended: false,
                    bets: [
                        { userID: duel.player1, wager: 0, betOnUserID: duel.player1 },
                        { userID: duel.player2, wager: 0, betOnUserID: duel.player2 }
                    ],
                    cycleCount: 1,
                    ...(gameType === "weekly" || gameType === 'biweekly') ? 
                        { cycleWeek: 1 } : 
                        { cycleDay: 1 }
                };
                transaction.set(duelDocRef, duelData);
            });
        });
        
        console.log("Transaction successfully committed!");
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw error; // Propagate error for handling upstream
    }
};

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
export const setTodaysBetTokens = async (groupID: string, userID: string, todaysBetTokens: number): Promise<undefined> => {
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