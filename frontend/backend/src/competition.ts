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

/*********************************************** PRE-GAME FUNCTIONS ********************************************/

export const writeConsentForm = async (userId: string, payment: string, referral: string) => {
    try {
        // Reference to the user document in the 'users' collection
        const userRef = doc(db, 'users', userId);
        // Update the payment and consent fields
        await updateDoc(userRef, {
            payment: payment,
            consent: true
        });
    } catch (error) {
        console.log("Error writing consent form:", error);
    }
}

// Returns true if the user has consented (consent === true), false otherwise
export const hasUserConsented = async (userId: string): Promise<boolean> => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return data.consent === true;
    }
    return false;
};

// Returns true if the user is in a competition (inCompetition === true), false otherwise
export const isUserInCompetition = async (userId: string): Promise<boolean> => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return data.inCompetition === true;
    }
    return false;
};

// Sets the user's inCompetition field to true
export const setUserInCompetition = async (userId: string): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, { inCompetition: true });
    } catch (error) {
        console.log("Error setting inCompetition:", error);
    }
};
