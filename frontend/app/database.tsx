import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebaseConfig"; // Make sure your Firebase config is correctly imported

const db = getFirestore(app);

// Temp User APIs
export const getUserName = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
            return userDoc.data().name;
        } else {
            console.log("No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
        return undefined;
    }
}

export const getUserGroups = async (id: string): Promise<string[] | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
            return userDoc.data().groups;
        } else {
            console.log("No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
        return undefined;
    }
}

export const getGroupName = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "groups", id));
        if (userDoc.exists()) {
            return userDoc.data().name;
        } else {
            console.log("No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
        return undefined;
    }
}