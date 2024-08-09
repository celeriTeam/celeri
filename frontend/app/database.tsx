import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebaseConfig";

const db = getFirestore(app);

// Get User Name
export const getUserName = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.name) {
            console.log("Document data:", userDoc.data());
            return userDoc.data()?.name;
        } else {
            console.log("getUserName - No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
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
            console.log("API Response:", groups);
            return groups;
        } else {
            console.log("getUserGroups - No such document!");
            return [];
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
        return undefined;
    }
}

export const getGroupName = async (groupID: string): Promise<string | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.name) {
            console.log("Document data:", groupDoc.data());
            return groupDoc.data()?.name;
        } else {
            console.log("getGroupName - No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("Error fetching user document: ", error);
        return undefined;
    }
}

//getGroupMembers

export const getGroupMembers = async (groupID: string): Promise<string[] | undefined> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        if (groupDoc.exists() && groupDoc.data()?.groupMembers){
            console.log("Document data: ", groupDoc.data());
            return groupDoc.data()?.groupMembers;
        } else{
            console.log("getGroupMembers - No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("Error fetching user document: ", error);
         return undefined;
    }
}
