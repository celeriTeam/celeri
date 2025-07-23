import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";
import { useUser } from '../../app/UserProvider'

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** REQUEST FRIENDS FUNCTIONS ********************************************/

export const requestFriend = async (requesterID: string, requestedID: string): Promise<undefined> => {
    try {
        const requesterDocRef = doc(db, 'users', requesterID);
        const requestedDocRef = doc(db, "users", requestedID);

        // add the person being friended to the outgoingRequests of the requester
        await updateDoc(requesterDocRef, {
            outgoingRequests: arrayUnion(requestedID),
        })

        // add the person who is requesting to friend to the incomingRequests of the requested
        await updateDoc(requestedDocRef, {
            incomingRequests: arrayUnion(requesterID),
        })

    } catch (error) {
        console.error('Failed to add outgoingRequests:', error);
        return undefined;
    }
}