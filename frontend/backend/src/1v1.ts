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

// export const get1v1 = async (userID: string) => {
//     const current1v1Query = query(
//         collection(db, '1v1s'),
//         where('participants', 'array-contains', userID),
//         where('endTime', '>', Timestamp.now())
//     );

//     const current1v1Snapshot = await getDocs(current1v1Query);
//     if (current1v1Snapshot.empty) {
//         return null; // No active 1v1 found
//     }
//     const current1v1Doc = current1v1Snapshot.docs[0];
//     const current1v1Data = current1v1Doc.data();
//     return {
//         current1v1ID: current1v1Doc.id,
//         ...current1v1Data,
//     };
// }

// get 1v1 listener
export const get1v1 = (userID: string, onUpdate: (data: any | null) => void): (() => void) => {
    const current1v1Query = query(
        collection(db, '1v1s'),
        where('participants', 'array-contains', userID),
        where('endTime', '>', Timestamp.now())
    );

    const unsubscribe = onSnapshot(current1v1Query, (snapshot) => {
        if (snapshot.empty || snapshot.docs.length === 0) {
            onUpdate(null); // No active 1v1
            return;
        }
        const processRequests = async () => {
            if (!snapshot.empty) {
                const duelDoc = snapshot.docs[0];
                const isCurrentUserA = duelDoc.data().participants[0] === userID;
                const opponentDoc = await getDoc(doc(db, 'users', duelDoc.data().participants[isCurrentUserA ? 1 : 0]));
                const currentUserDoc = await getDoc(doc(db, 'users', userID));
                onUpdate({ 
                    current1v1ID: duelDoc.id, 
                    userInfo: {
                        currentUserPfp: currentUserDoc.data()?.profileImageUrl || null,
                        opponentName: opponentDoc.data()?.name || "",
                        opponentUsername: opponentDoc.data()?.username || "",
                        opponentPfp: opponentDoc.data()?.profileImageUrl || null
                    },
                    ...duelDoc.data() 
                });
            } else {
                onUpdate(null);
            }
        }
        processRequests();
    });

    return unsubscribe;
};

export const get1v1History = async (userID: string) => {
    const historyQuery = query(
        collection(db, '1v1s'),
        where('processed', '==', true)
    );

    const historySnapshot = await getDocs(historyQuery);
    if (historySnapshot.empty) {
        return []; // No history found
    }

    const history = await Promise.all(
        historySnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const opponentID = data.participants.find((id: string) => id !== userID);
            const opponentDoc = await getDoc(doc(db, 'users', opponentID));
            const currentUserDoc = await getDoc(doc(db, 'users', userID));
            return {
                duelID: docSnap.id,
                ...data,
                userInfo: {
                    currentUserPfp: currentUserDoc.data()?.profileImageUrl || null,
                    opponentName: opponentDoc.data()?.name || "",
                    opponentUsername: opponentDoc.data()?.username || "",
                    opponentPfp: opponentDoc.data()?.profileImageUrl || null
                },
            };
        })
    );

    // console.log('1v1 History:', history);
    return history;
};

export const get1v1StartTime = async (userID: string) => {
    const q = query(
        collection(db,'1v1s'),
        where('participants','array-contains', userID),
        where('endTime', '>', Timestamp.now())
    );
    const snap = await getDocs(q);
    if (snap.empty) return { startTime: null, current1v1ID: null };

    const doc = snap.docs[0];
    const data = doc.data();
    const current1v1ID = doc.id || null;
    const startTime = data.startTime?.toDate?.();
    return { startTime, current1v1ID };
};

export const update1v1Steps = async (userID: string, current1v1ID: string, stepsMap: { [key: string]: number }) => {
    const duelRef = doc(db, '1v1s', current1v1ID);
    const duelDoc = await getDoc(duelRef);
    if (!duelDoc.exists()) {
        throw new Error('Duel not found');
    }

    const duelData = duelDoc.data();

    await updateDoc(duelRef, {
        progress: {
            ...duelData.progress,
            [userID]: stepsMap,
        },
        lastSynced: {
            ...duelData.lastSynced,
            [userID]: serverTimestamp()
        }
    });
};

export const create1v1 = async (Request1v1ID: string) => {
    // grab senderID and receiverID from the request
    // set the following:
    // startTime: timestamp,
	// endTime: null,
	// lastSynced: {
	// 	userA: timestamp,
	// 	userB: timestamp
	// },
	// participants: [
	// 	userAID,
	// 	userBID
	// ],
	// progress: {
	// 	userA: {
	// 		4: 0,
	// 		8: 0,
	// 		12: 0,
	// 		16: 0,
	// 		20: 0,
	// 		24: 0
	// 	},
	// 	userB: {
	// 		4: 0,
	// 		8: 0,
	// 		12: 0,
	// 		16: 0,
	// 		20: 0,
	// 		24: 0
	// 	}
	// }

    const requestDoc = await getDoc(doc(db, '1v1Requests', Request1v1ID));
    if (!requestDoc.exists()) {
        throw new Error('Request not found');
    }

    const requestData = requestDoc.data();
    const senderID = requestData.senderID;
    const receiverID = requestData.receiverID;

    // set endTime to 24 hours after startTime

    const new1v1Data = {
        startTime: serverTimestamp(),
        endTime: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours later
        lastSynced: {
            [senderID]: serverTimestamp(),
            [receiverID]: serverTimestamp()
        },
        participants: [senderID, receiverID],
        progress: {
            [senderID]: {
                '4': 0,
                '8': 0,
                '12': 0,
                '16': 0,
                '20': 0,
                '24': 0
            },
            [receiverID]: {
                '4': 0,
                '8': 0,
                '12': 0,
                '16': 0,
                '20': 0,
                '24': 0
            }
        },
        processed: false,
    }

    const new1v1Ref = await addDoc(collection(db, '1v1s'), new1v1Data);

    return {
        current1v1ID: new1v1Ref.id,
        ...new1v1Data,
    };
};