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


const db = getFirestore(app);
const storage = getStorage();

/*********************************************** GET FUNCTIONS ********************************************/

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