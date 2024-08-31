import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();

// Get User Profile Pic
export const getProfilePic = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.username) {
            console.log("getProfilePic - response:", userDoc.data()?.profileImageUrl);
            return userDoc.data()?.profileImageUrl;
        } else {
            console.error("getProfilePic - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getProfilePic - Error fetching user document:", error);
        return undefined;
    }
}

// Get User Name
export const getUserName = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.username) {
            console.log("userDoc - Document data:", userDoc.data());
            console.log("getUserName - response:", userDoc.data()?.username);
            return userDoc.data()?.username;
        } else {
            console.error("getUserName - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getUserName - Error fetching user document:", error);
        return undefined;
    }
}

// Get User Email
export const getUserEmail = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.email) {
            console.log("getUserEmail - response:", userDoc.data()?.email);
            return userDoc.data()?.email;
        } else {
            console.error("getUserEmail - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getUserEmail - Error fetching user document:", error);
        return undefined;
    }
}

// Get List of User Groups
export const getUserGroups = async (id: string): Promise<string[] | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.groups) {
            const groupIDs = userDoc.data()?.groups;
            let groups: string[] = [];
            for (const groupID of groupIDs) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                console.log("Group Document data:", groupDoc.data());
                groups.push(groupDoc.data()?.groupName);
            }
            console.log("getUserGroups - response: ", groups);
            return groups;
        } else {
            console.error("getUserGroups - error: No such document!");
            return [];
        }
    } catch (error) {
        console.error("getUserGroups - Error fetching user document:", error);
        return undefined;
    }
}

// Get groupID from group name
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

// Get Users in Group
export const getUsersInGroup = async (groupID: string): Promise<string[] | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.users) {
            const users = groupDoc.data()?.users;
            console.log("getNumberOfUsersByGroupID - response: ", users);
            return users;
        } else {
            console.error("getNumberOfUsersByGroupID - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getNumberOfUsersByGroupID - Error fetching user document:", error);
        return undefined;
    }
}

// Edit Profile Pic
export const editProfilePic = async (userID: string, newProfileImageUri: string): Promise<string | null> => {
    try {
        // Fetch the image as a blob
        const response = await fetch(newProfileImageUri);
        const blob = await response.blob();

        // Create a reference to the user's profile image in Firebase Storage
        const storageRef = ref(storage, `profileImages/${userID}`);

        // Overwrite the existing image with the new one
        await uploadBytes(storageRef, blob);

        // Get the download URL for the new profile image
        const downloadURL = await getDownloadURL(storageRef);

        // Update the user's profile in Firestore with the new image URL
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            profileImageUrl: downloadURL,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('editProfilePic - response: ', userDoc.data()?.profileImageUrl);

        return downloadURL;
    } catch (error) {
        console.error('editProfilePic - Error updating profile picture:', error);
        return null;
    }
};

// Edit Username
export const editUsername = async(userID: string, usernameInput: string) => {
    try {
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            username: usernameInput,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('editUsername - response: ', userDoc.data()?.username);
    } catch (error) {
        console.error('editUsername - Error updating username', error);
        return null;
    }
};

// Add group to user
export const addGroupToUser = async (userID: string, groupID: string): Promise<string | undefined> => {
    try {
        const userDocRef = doc(db, 'users', userID);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()){
            // Check if group is already in the user's groups
            if (userDoc.data()?.groups.includes(groupID)) {
                console.log(`User ${userID} is already in the group ${groupID}. No update needed.`);
                return 'You are already in this group!';
            }

            await updateDoc(userDocRef, {
                groups: [...userDoc.data()?.groups, groupID],
            });
            console.log("addGroupToUser - response: ", userDoc.data()?.groups);
            return undefined;
        } else{
            console.error("addGroupToUser - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("addGroupToUser - Error fetching user document: ", error);
         return undefined;
    }
}

//Add user to group
export const addUserToGroup = async (userID: string, groupID: string): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        const groupDoc = await getDoc(groupDocRef);
        if (groupDoc.exists()){
            const groupData = groupDoc.data();
            
            // Check if the user is already in the users map
            if (groupData?.users && groupData.users[userID]) {
                console.log(`User ${userID} is already in the group ${groupID}. No update needed.`);
                return;
            }
            
            await updateDoc(groupDocRef, {
                [`users.${userID}`]: {
                    placedBet: false,
                    tokens: 0,
                },
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

// Get Group Members
export const getGroupMembers = async (groupID: string): Promise<string[] | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.groupMembers){
            console.log("getGroupMembers - response: ", groupDoc.data()?.groupMembers);
            return groupDoc.data()?.groupMembers;
        } else{
            console.error("getGroupMembers - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("getGroupMembers - Error fetching user document: ", error);
         return undefined;
    }
}

// Get Group Info From Code
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

// Create group
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

// Add Group Image
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


// Get Group Name
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

// Get Group Code
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

//BET FUNCTIONS

//create head to head 
export const createDuels = async (firstUserID: string, secondUserID: string, groupID: string): Promise<string | undefined> => {
    try {

        if (!firstUserID || firstUserID.trim() === '') {
            throw new Error('Invalid userID for player one');
        }
        else if(!secondUserID || secondUserID.trim() === ''){
            throw new Error('Invalid userID for player two');
        }

        const groupDocRef = doc(db, 'groups', groupID)

        const duelRef = await addDoc(collection(groupDocRef, 'duels'), {
            "players": {
                [firstUserID]: {
                    "steps": 0,
                },
                [secondUserID]: {
                    "steps": 0,
                }
            },
            "betters": {

            },
            "createdAt": serverTimestamp(),
            "updatedAt": serverTimestamp(),
            "groupImageUrl": null,
        })
        const duelID = duelRef.id;
        console.log("createDuel - response:", duelID);
        return duelID



    } catch (error) {
        console.error("createDuel - Error fetching user document:", error);
        return undefined;
    }
}

//add bet

export const addBet = async (userID: string, wager: number, duelID: string, groupID: string,): Promise<undefined> => {
    try {
        if (userID || userID.trim() === '') {
            throw new Error('Invalid userID for player one');
        }

        const groupDocRef = doc(db, 'groups', groupID)
        const duelRef = doc(groupDocRef, 'duels', duelID)

        await updateDoc(duelRef, {
            [`usersWhoBet.${userID}`]: {
                placedBet: true,
                wager: wager,
                createdAt: serverTimestamp(),
            },
        });
        

    } catch (error) {
        console.error("addBet - Error adding bet:", error);
        return undefined;
    }
}

// Get Group isGameActive
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

// Set Group isGameActive
export const setGroupIsGameActive = async (groupID: string, isGameActive: boolean): Promise<undefined> => {
    try {
        const groupDocRef = doc(db, 'groups', groupID);
        await updateDoc(groupDocRef, {
            isGameActive: isGameActive,
        });
        console.log("setGroupIsGameActive - response: ", isGameActive);
        return undefined;
    } catch (error) {
         console.error("setGroupIsGameActive - Error fetching user document: ", error);
         return undefined;
    }
}