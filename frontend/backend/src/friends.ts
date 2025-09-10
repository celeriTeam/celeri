import { arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebaseConfig";

/*********************************************** REQUEST FRIENDS FUNCTIONS ********************************************/

export const requestFriend = async (requesterID: string, requestedID: string): Promise<undefined> => {
    try {
        const requesterDocRef = db.collection('users').doc(requesterID);
        const requestedDocRef = db.collection('users').doc(requestedID);

        // add the person being friended to the outgoingRequests of the requester
        await requesterDocRef.update({
            outgoingRequests: arrayUnion(requestedID),
        })

        // add the person who is requesting to friend to the incomingRequests of the requested
        await requestedDocRef.update({
            incomingRequests: arrayUnion(requesterID),
        })

    } catch (error) {
        console.error('Failed to add outgoingRequests: ', error);
        return undefined;
    }
}

export const cancelRequest = async (cancellerID: string, cancelledID: string): Promise<undefined> => {
    try {
        const cancellerDocRef = db.collection('users').doc(cancellerID);
        const cancelledDocRef = db.collection('users').doc(cancelledID);

        // remove the cancelledID from the canceller's outgoingRequests
        await cancellerDocRef.update({
            outgoingRequests: arrayRemove(cancelledID),
        });

        // remove the cancellerID from the cancelled user's incomingRequests
        await cancelledDocRef.update({
            incomingRequests: arrayRemove(cancellerID),
        });

    } catch(error){
        console.error('Failed to cancel outgoingRequest: ', error);
        return undefined;
    }
}

export const acceptRequest = async (accepterID: string, acceptedID: string): Promise<undefined> => { // you are the accepter, you accept the accepted persons request
    try {
        const accepterDocRef = db.collection('users').doc(accepterID);
        const acceptedDocRef = db.collection('users').doc(acceptedID);

        // remove the cancelledID from the canceller's outgoingRequests
        await accepterDocRef.update({
            friendsList: arrayUnion(acceptedID),
            incomingRequests: arrayRemove(acceptedID),
        });

        // remove the cancellerID from the cancelled user's incomingRequests
        await acceptedDocRef.update({
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
        const removerDocRef = db.collection('users').doc(removerID);
        const removedDocRef = db.collection('users').doc(removedID);

        // remove the friend from the remover and the removed
        await removerDocRef.update({
            friendsList: arrayRemove(removedID),
        });

        await removedDocRef.update({
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

        const userRef = db.collection('users').doc(targetUserID);
        const snap = await userRef.get();

        if (!snap.exists) {
            console.warn(`No user found with ID "${targetUserID}"`);
            return undefined;
        }

        const data = snap.data();

        const incoming = Array.isArray(data?.incomingRequests)
        ? (data?.incomingRequests as string[])
        : [];
        const outgoing = Array.isArray(data?.outgoingRequests)
        ? (data?.outgoingRequests as string[])
        : [];
        const friends = Array.isArray(data?.friendsList)
        ? (data?.friendsList as string[])
        : [];

        // Determine friendStatus
        let friendStatus = 'request';
        if (userID) {
            if (incoming.includes(userID)) {
                friendStatus = 'cancel';
            } else if (friends.includes(userID)) {
                friendStatus = 'remove';
            } else if (outgoing.includes(userID)) {
                friendStatus = 'accept';
            }
        }
        return {
            averageSteps: Array.isArray(data?.averageSteps)
                ? (data?.averageSteps as number[])
                : [],
            steps: data?.steps as number,
            name: data?.name as string,
            username: data?.username as string,
            profileImageUrl: data?.profileImageUrl as string,
            friendStatus: friendStatus as string,
        };


    } catch (error) {
        console.error("fetchPublicProfileData - error: ", error);
        return undefined;

    }
}