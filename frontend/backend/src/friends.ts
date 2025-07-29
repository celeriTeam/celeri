import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
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
        console.error('Failed to add outgoingRequests: ', error);
        return undefined;
    }
}

export const cancelRequest = async (cancellerID: string, cancelledID: string): Promise<undefined> => {
    try {
        const cancellerDocRef = doc(db, 'users', cancellerID);
        const cancelledDocRef = doc(db, 'users', cancelledID);

        // remove the cancelledID from the canceller's outgoingRequests
        await updateDoc(cancellerDocRef, {
            outgoingRequests: arrayRemove(cancelledID),
        });

        // remove the cancellerID from the cancelled user's incomingRequests
        await updateDoc(cancelledDocRef, {
            incomingRequests: arrayRemove(cancellerID),
        });

    } catch(error){
        console.error('Failed to cancel outgoingRequest: ', error);
        return undefined;
    }
}

export const acceptRequest = async (accepterID: string, acceptedID: string): Promise<undefined> => { // you are the accepter, you accept the accepted persons request
    try {
        const accepterDocRef = doc(db, 'users', accepterID);
        const acceptedDocRef = doc(db, 'users', acceptedID);

        // remove the cancelledID from the canceller's outgoingRequests
        await updateDoc(accepterDocRef, {
            friendsList: arrayUnion(acceptedID),
            incomingRequests: arrayRemove(acceptedID),
        });

        // remove the cancellerID from the cancelled user's incomingRequests
        await updateDoc(acceptedDocRef, {
            friendsList: arrayUnion(accepterID),
            outgoingRequests: arrayRemove(accepterID),
        });

    } catch(error){
        console.error('Failed to cancel outgoingRequest: ', error);
        return undefined;
    }
}

export const removeFriend = async (removerID: string, removedID: string): Promise<undefined> => { // you are the accepter, you accept the accepted persons request
    try {
        const removerDocRef = doc(db, 'users', removerID);
        const removedDocRef = doc(db, 'users', removedID);

        // remove the friend from the remover and the removed
        await updateDoc(removerDocRef, {
            friendsList: arrayRemove(removedID),
        });

        await updateDoc(removedDocRef, {
            friendsList: arrayRemove(removerID),
        });

    } catch(error){
        console.error('Failed to cancel outgoingRequest: ', error);
        return undefined;
    }
}

/*********************************************** FRIEND PROFILE FUNCTIONS ********************************************/

export interface PublicProfileData {
  averageSteps: number[]
  steps: number
  name: string
  username: string
  profileImageUrl: string
  friendStatus: string
}

export const fetchPublicProfileData = async (userID: string, targetUserID: string): Promise<PublicProfileData | undefined> => {
    try {

        const userRef = doc(db, 'users', targetUserID)
        const snap = await getDoc(userRef)

        if (!snap.exists()) {
            console.warn(`No user found with ID "${targetUserID}"`)
            return undefined
        }

        const data = snap.data()

        const incoming = Array.isArray(data.incomingRequests)
        ? (data.incomingRequests as string[])
        : []
        const outgoing = Array.isArray(data.outgoingRequests)
        ? (data.outgoingRequests as string[])
        : []
        const friends = Array.isArray(data.friendsList)
        ? (data.friendsList as string[])
        : []

        // Determine friendStatus
        let friendStatus = 'request'
        if (userID) {
            if (incoming.includes(userID)) {
                friendStatus = 'cancel'
            } else if (friends.includes(userID)) {
                friendStatus = 'remove'
            } else if (outgoing.includes(userID)) {
                friendStatus = 'accept'
            }
        }
        return {
            averageSteps: Array.isArray(data.averageSteps)
                ? (data.averageSteps as number[])
                : [],
            steps: data.steps as number,
            name: data.name as string,
            username: data.username as string,
            profileImageUrl: data.profileImageUrl as string,
            friendStatus: friendStatus as string,
        }


    } catch (error) {
        console.error("fetchPublicProfileData - error: ", error);
        return undefined;

    }
}