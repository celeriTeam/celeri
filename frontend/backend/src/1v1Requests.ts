import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, Timestamp, writeBatch, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";
import { Pedometer } from 'expo-sensors';
import AppleHealthKit, {
    HealthInputOptions,
    HealthKitPermissions,
    HealthUnit,
  } from "react-native-health";
import { Subscription } from 'expo-sensors/build/Pedometer';
import { useEffect, useState } from 'react';
import { get } from "http";


const db = getFirestore(app);
const storage = getStorage();

/*********************************************** GET FUNCTIONS ********************************************/

// Get all 1v1 requests received by user
export const get1v1Requests = (userID: string, onUpdate: (data: any | null) => void): (() => void) => {
    const requestsQuery = query(
        collection(db, '1v1Requests'),
        where('receiverID', '==', userID)
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const processRequests = async () => {
            if (snapshot.empty) {
                onUpdate([]);
                return;
            }
            const requests = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    const senderDoc = await getDoc(doc(db, 'users', data.senderID));
                    return {
                        requestID: docSnap.id,
                        senderID: docSnap.data().senderID,
                        receiverID: docSnap.data().receiverID,
                        status: docSnap.data().status,
                        createdAt: docSnap.data().createdAt ? (docSnap.data().createdAt as Timestamp).toDate() : null,
                        senderName: senderDoc.data()?.name || "",
                        senderUsername: senderDoc.data()?.username || "",
                        senderPfp: senderDoc.data()?.profileImageUrl || null 
                    };
                })
            );
            requests.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
            onUpdate(requests);
        }
        processRequests();
    });

    return unsubscribe;
}

// Get all 1v1 requests sent by user
export const getSent1v1Requests = (userID: string, onUpdate: (data: any | null) => void): (() => void) => {
    const requestsQuery = query(
        collection(db, '1v1Requests'),
        where('senderID', '==', userID),
        where('status', '==', 'pending') // Only get pending requests
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const processRequests = async () => {
            if (snapshot.empty) {
                onUpdate([]);
                return;
            }
            const requests = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    const receiverDoc = await getDoc(doc(db, 'users', data.receiverID));
                    return {
                        requestID: docSnap.id,
                        receiverID: docSnap.data().requestID,
                        status: docSnap.data().status,
                        createdAt: docSnap.data().createdAt ? (docSnap.data().createdAt as Timestamp).toDate() : null,
                        receiverName: receiverDoc.data()?.name || "",
                        receiverUsername: receiverDoc.data()?.username || "",
                        receiverPfp: receiverDoc.data()?.profileImageUrl || null 
                    };
                })
            );
            requests.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
            onUpdate(requests);
        }
        processRequests();
    });

    return unsubscribe;
}

export const create1v1Request = async (userID: string, opponentID: string) => {
    // senderID: string,
    // receiverID: string,
    // status: string, // "pending" | "accepted" | "invalid"
    // createdAt: timestamp,
    // respondedAt: null | timestamp,
    // duelID: null | string

    const existingQuery = query(
        collection(db, '1v1Requests'),
        where('senderID', '==', userID),
        where('receiverID', '==', opponentID),
        where('status', '==', 'pending')
    );

    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        throw new Error("A pending 1v1 request already exists between these users.");
    }
    
    try {
        const requestRef = await addDoc(collection(db, '1v1Requests'), {
            senderID: userID,
            receiverID: opponentID,
            status: 'pending',
            createdAt: serverTimestamp(),
            respondedAt: null,
            duelID: null
        });
        return requestRef.id; // Return the ID of the created request
    } catch (error) {
        console.error("Error creating 1v1 request:", error);
        throw new Error("Failed to create 1v1 request");
    }
};

export const update1v1Requests = async (userID: string, requestID: string, new1v1ID: string) => {
    // get all 1v1 requests sent or received by user that is 'pending'
    // update requestID to 'accepted'
    // update all others to 'invalid'
    const requestsSentQuery = query(
        collection(db, '1v1Requests'),
        where('senderID', '==', userID),
        where('status', '==', 'pending')
    );
    const requestsReceivedQuery = query(
        collection(db, '1v1Requests'),
        where('receiverID', '==', userID),
        where('status', '==', 'pending')
    );
    const requestsSentSnapshot = await getDocs(requestsSentQuery);
    const requestsReceivedSnapshot = await getDocs(requestsReceivedQuery);
    const batch = writeBatch(db);
    requestsSentSnapshot.docs.forEach(doc => {
        if (doc.id === requestID) {
            batch.update(doc.ref, { 
                status: 'accepted', 
                duelID: new1v1ID,
                respondedAt: serverTimestamp()
            });
        } else {
            batch.update(doc.ref, { 
                status: 'invalid',
                respondedAt: serverTimestamp()
            });
        }
    });
    requestsReceivedSnapshot.docs.forEach(doc => {
        if (doc.id === requestID) {
            batch.update(doc.ref, { status: 'accepted', duelID: new1v1ID });
        } else {
            batch.update(doc.ref, { status: 'invalid' });
        }
    });
    try {
        await batch.commit();
        return true; // Indicate success
    } catch (error) {
        console.error("Error updating 1v1 requests:", error);
        throw new Error("Failed to update 1v1 requests");
    }
}