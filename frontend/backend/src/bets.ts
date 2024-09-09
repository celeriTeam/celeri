import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from "../../firebaseConfig";

const db = getFirestore(app);
const storage = getStorage();

/*********************************************** GET FUNCTIONS ********************************************/

/*********************************************** CREATE FUNCTIONS ********************************************/

// CREATE Head-To-Head Duels -- probably not used because we'll use it in the async functions
export const createDuels = async (firstUserID: string, secondUserID: string, groupID: string): Promise<string | undefined> => {
    try {

        if (!firstUserID || firstUserID.trim() === '') {
            throw new Error('Invalid userID for player one');
        }
        else if(!secondUserID || secondUserID.trim() === ''){
            throw new Error('Invalid userID for player two');
        }

        const groupDocRef = doc(db, 'groups', groupID)

        const duelRef = await addDoc(collection(groupDocRef, 'duels'), {
            "players": {
                [firstUserID]: {
                    "steps": 0,
                },
                [secondUserID]: {
                    "steps": 0,
                }
            },
            "betters": {

            },
            "createdAt": serverTimestamp(),
            "updatedAt": serverTimestamp(),
            "groupImageUrl": null,
        })
        const duelID = duelRef.id;
        console.log("createDuel - response:", duelID);
        return duelID



    } catch (error) {
        console.error("createDuel - Error fetching user document:", error);
        return undefined;
    }
}

/*********************************************** ADD FUNCTIONS ********************************************/

// ADD Bet
export const addBet = async (userID: string, wager: number, duelID: string, groupID: string,): Promise<undefined> => {
    try {
        if (userID || userID.trim() === '') {
            throw new Error('Invalid userID for player one');
        }

        const groupDocRef = doc(db, 'groups', groupID)
        const duelRef = doc(groupDocRef, 'duels', duelID)

        await updateDoc(duelRef, {
            [`usersWhoBet.${userID}`]: {
                placedBet: true,
                wager: wager,
                createdAt: serverTimestamp(),
            },
        });
        

    } catch (error) {
        console.error("addBet - Error adding bet:", error);
        return undefined;
    }
}