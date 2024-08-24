import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../firebaseConfig";

const db = getFirestore(app);

// Get User Profile Pic
export const getProfilePic = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.name) {
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
        if (userDoc.exists() && userDoc.data()?.name) {
            console.log("userDoc - Document data:", userDoc.data());
            console.log("getProfilePic - response:", userDoc.data()?.name);
            return userDoc.data()?.name;
        } else {
            console.error("getUserName - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getUserName - Error fetching user document:", error);
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
                groups.push(groupDoc.data()?.name);
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

//EDIT -- Profile

export const editProfilePic = async (userId: string, newProfileImageUri: string): Promise<string | null> => {
    const storage = getStorage();
    try {
        // Fetch the image as a blob
        const response = await fetch(newProfileImageUri);
        const blob = await response.blob();

        // Create a reference to the user's profile image in Firebase Storage
        const storageRef = ref(storage, `profileImages/${userId}`);

        // Overwrite the existing image with the new one
        await uploadBytes(storageRef, blob);

        // Get the download URL for the new profile image
        const downloadURL = await getDownloadURL(storageRef);

        // Update the user's profile in Firestore with the new image URL
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            profileImageUrl: downloadURL,
        });

        return downloadURL;
    } catch (error) {
        console.error('Error updating profile picture:', error);
        return null;
    }
};

export const editUsername = async(userId: string, usernameInput: string) => {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            username: usernameInput,
        });
    } catch (error) {
        console.error('Error updating username', error);
        return null;
    }
};
