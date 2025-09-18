import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp, deleteDoc, addDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { db, storage } from "@firebaseConfig";

/*********************************************** ADD FUNCTIONS ********************************************/

// ADD group to user
export const addFeedback = async (name: string, username: string, subject: string, issue: string): Promise<string | undefined> => {
    try {
        await addDoc(collection(db, "feedback"), {
            to: ['appceleri@gmail.com', 'lukaschin000@gmail.com', 'acn64@georgetown.edu', 'ssw59@georgetown.edu'],
            subject: `Betting App Bug: ${subject}`,
            text: `From: ${name}\nUsername: ${username}\n\nIssue: ${issue}`,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
         console.error("addFeedback - Error adding feedback: ", error);
         return undefined;
    }
}