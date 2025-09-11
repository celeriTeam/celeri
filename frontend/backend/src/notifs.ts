import { collection, addDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { db } from "@firebaseConfig";

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
        console.log("createNudge - response:", nudgeID);
        return nudgeID;
    } catch (error) {

    }
}