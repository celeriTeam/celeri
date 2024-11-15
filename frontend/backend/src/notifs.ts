import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, setDoc, increment } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** CREATE FUNCTIONS ********************************************/

// CREATE nudge

export const createNudge = async (username: string, groupID: string, message: string, tokens: []): Promise<string | undefined> => {
    try {
        console.log('createNudge - ', username)

        const nudgeRef = await addDoc(collection(db, 'nudges'), {
            groupID,
            message,
            tokens,
            username,
            "createdAt": serverTimestamp(),
        
        })
        const nudgeID = nudgeRef.id;
        console.log("createGroup - response:", nudgeID);
        return nudgeID;
    } catch (error) {

    }
}