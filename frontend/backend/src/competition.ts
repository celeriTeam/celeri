import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, Timestamp, writeBatch, onSnapshot, orderBy, limit } from "firebase/firestore";
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
            consent: true,
            referral: referral,
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

export const getUserProfile = async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            username: data.username || '',
            profileImageUrl: data.profileImageUrl || '',
        };
    }
    return {
        username: '',
        profileImageUrl: '',
    };
};

export const getUserProfilesBatch = async (userIds: string[]) => {
    if (userIds.length === 0) return [];
    // Firestore 'in' queries are limited to 10 items per query
    const batches = [];
    for (let i = 0; i < userIds.length; i += 10) {
        const batchIds = userIds.slice(i, i + 10);
        const q = query(collection(db, 'users'), where('__name__', 'in', batchIds));
        batches.push(getDocs(q));
    }
    const results = await Promise.all(batches);
    // Flatten and map to desired structure
    return results.flatMap(snapshot =>
        snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                userId: docSnap.id,
                username: data.username || '',
                // Map to profileImageUrl for consistency
                profileImageUrl: data.profileImageUrl || data.profilePicture || data.profilePic || '',
            };
        })
    );
};

// GET referral id
export const getReferral = async (id: string): Promise<string | null> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.referral !== undefined) {
            return userDoc.data()?.referral;
        } else {
            console.error("getSteps - error: No such document!");
            return null;
        }
    } catch (error) {
        console.error("getSteps - Error fetching user document:", error);
        return null;
    }
}

// GET titleMessage from waitingMessage
export const fetchDefaultTitleMessage = async (): Promise<string> => {
    try {
        const competitionsRef = collection(db, 'competitions');
        const q = query(competitionsRef, orderBy('createdAt', 'desc'), limit(1));
        console.log("test", q);
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const competitionDoc = snapshot.docs[0];
            const data = competitionDoc.data();
            if (data.waitingMessage) {
                return data.waitingMessage;
            }
        }
        
        // Default message if no competition found or no waitingMessage field
        return "No competition details at this time.";
    } catch (error) {
        console.error("Error fetching title message:", error);
        // Return default message on error
        return "Waiting for competition to start...";
    }
};