import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
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
                console.log(`User ${userID} is already in the group ${groupID}. No update needed.`);
                return;
            }
            
            await updateDoc(groupDocRef, {
                [`users.${userID}`]: {
                    placedBet: false,
                    tokens: 0,
                },
                order: [...groupDoc.data()?.order, userID],
            });

            
            console.log(`User ${userID} added to group ${groupID}`);
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
export const addGroupImage = async (groupID: string, groupImageUri: string): Promise<string | undefined> => {
    try {
        if (groupImageUri != '') {
            const response = await fetch(groupImageUri);
            const blob = await response.blob();
            const storageRef = ref(storage, `groupImages/${groupID}`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            // Update the user's profile in Firestore with the new image URL
            const userDocRef = doc(db, 'groups', groupID);
            await updateDoc(userDocRef, {
                groupImageUrl: downloadURL,
            });
            const userDoc = await getDoc(userDocRef);
            console.log('addGroupImage - response: ', userDoc.data()?.groupImageUrl);
            return userDoc.data()?.groupImageUrl;
        } else {
            console.log("addGroupImage - error: No such document!");
            return undefined
        }
    } catch (error) {
        console.error("createGroup - Error fetching user document:", error);
        return undefined;
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

// SET Group isGameActive
export const setGroupIsGameActive = async (groupID: string, isGameActive: boolean): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);

        //Grab the number of players from the document
        let numberOfPlayers;
        let cycles;

        const docSnap = await getDoc(groupDocRef);
        
        if (docSnap.exists()) {
            // Access the 'order' array from the document data
            const data = docSnap.data();
            const orderArray = data.order;
            cycles = createCycle(orderArray)
            // Get the number of players (length of the 'order' array)
            numberOfPlayers = orderArray.length;
        } else {
            console.log("Document does not exist.");
            return undefined;
        }

        
        await updateDoc(groupDocRef, {
            isGameActive: isGameActive,

            //set the cycle
            currentPlayersInGame: numberOfPlayers,
            cycleDay: 1,
            cycleCount: 1,
            cycleDuels: cycles,
        });

        // Create the duels for cycleDay 1
        const duelsForDay1 = cycles[0]; // Get the first day's duels

        for (const duel of duelsForDay1) {
            const duelData = {
                player1: duel[0],
                player2: duel[1],
                cycleDay: 1,
                cycleCount: 1,
                date: serverTimestamp(), // Add a timestamp for when the duel was created
            };

            // Add the duel to the 'duels' subcollection of the group document
            const duelDocRef = doc(collection(groupDocRef, 'duels')); // Auto-generate document ID in 'duels' subcollection
            await setDoc(duelDocRef, duelData);
        }
        
        console.log("setGroupIsGameActive - response: ", isGameActive);
        return undefined;
    } catch (error) {
         console.error("setGroupIsGameActive - Error fetching user document: ", error);
         return undefined;
    }
}

function createCycle(players: Array<string>): Array<Array<[string, string]>> {
    const cycles: Array<Array<[string, string]>> = [];
    const playerCount = players.length;

    // If there's an odd number of players, add a 'bye' player
    if (playerCount % 2 !== 0) {
        players.push('BYE');
    }

    const rounds = players.length - 1; // Total rounds needed for all players to face each other once

    for (let round = 0; round < rounds; round++) {
        const roundMatchups: Array<[string, string]> = [];
        for (let i = 0; i < players.length / 2; i++) {
            const player1 = players[i];
            const player2 = players[players.length - 1 - i];

            if (player1 !== 'BYE' && player2 !== 'BYE') {
                roundMatchups.push([player1, player2]);
            }
        }

        // Rotate players for the next round except for the first one
        players.splice(1, 0, players.pop() as string);

        cycles.push(roundMatchups);
    }

    return cycles;
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