import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** GET FUNCTIONS ********************************************/

// GET User Profile Pic
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

// GET User Name
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

// GET User Email
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

// GET List of User Groups
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


/*********************************************** EDIT FUNCTIONS ********************************************/

// EDIT Profile Pic
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

// EDIT Username
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
}

/*********************************************** ADD FUNCTIONS ********************************************/

// ADD group to user
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