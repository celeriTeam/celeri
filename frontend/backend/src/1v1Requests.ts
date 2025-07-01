import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
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
export const get1v1Requests = async (userID: string) => {
    const requestsQuery = query(
        collection(db, '1v1Requests'),
        where('receiverID', '==', userID)
    );

    const requestsSnapshot = await getDocs(requestsQuery);
    const requests = requestsSnapshot.docs.map(doc => ({ 
        requestID: doc.id,
        senderID: doc.data().senderID,
        status: doc.data().status,
        createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : null,
    }));
    // what do i want to return:
    // requestID
    // senderID
    // senderName
    // senderUsername
    // senderPfp
    // status
    // createdAt
    console.log('requests: ', requests);

    const requestsWithSenderInfo = await Promise.all(requests.map(async (request) => {
        const senderDoc = await getDoc(doc(db, 'users', request.senderID));
        return {
            ...request,
            senderName: senderDoc.data()?.name || "",
            senderUsername: senderDoc.data()?.username || "",
            senderPfp: senderDoc.data()?.profileImageUrl || null // Assuming pfp is the profile picture URL
        };
    }));

    return requestsWithSenderInfo;
}

// Get all 1v1 requests sent by user
export const getSent1v1Requests = async (userID: string) => {
    const requestsQuery = query(
        collection(db, '1v1Requests'),
        where('senderID', '==', userID)
    );

    const requestsSnapshot = await getDocs(requestsQuery);
    const requests = requestsSnapshot.docs.map(doc => ({
        requestID: doc.id,
        receiverID: doc.data().receiverID,
        status: doc.data().status,
        createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : null,
    }));
    
    // what do i want to return:
    // requestID
    // senderID
    // senderName
    // senderUsername
    // senderPfp
    // status
    // createdAt

    const requestsWithReceiverInfo = await Promise.all(requests.map(async (request) => {
        const receiverDoc = await getDoc(doc(db, 'users', request.receiverID));
        return {
            ...request,
            receiverName: receiverDoc.data()?.name || "",
            receiverUsername: receiverDoc.data()?.username || "",
            receiverPfp: receiverDoc.data()?.profileImageUrl || null // Assuming pfp is the profile picture URL
        };
    }));

    return requestsWithReceiverInfo;
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