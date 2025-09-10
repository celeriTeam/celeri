import { serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";

/*********************************************** TROPHY FUNCTIONS ********************************************/

//GET trophies from user doc, should be used in UserProvider
export const getTrophies = async (userID: string): Promise<string> => {
    try {
        const userDoc = await db.collection('users').doc(userID).get();
        if (userDoc.exists && userDoc.data()?.trophies){
            return userDoc.data()?.trophies;
        } else {
            console.error(`getTrophies - error: No such document for user ${userID}!`);
            return '';
        }
    } catch (error) {
        console.error("getTrophies - Error fetching user document:", error);
        return '';
    }
}

//ADD or SUBTRACT trophies from user doc
export const updateTrophies = async (userID: string, trophies: number) => {
    try {
        const userDocRef = db.collection('users').doc(userID);
        await userDocRef.update({
            trophies: trophies
        });
    } catch (error) {
        console.error('updateTrophies - Error updating username:', error);
        return null;
    }
}

/*********************************************** MATCH FUNCTIONS ********************************************/

// FIND match if available, if not set findingMatch to true
export const findMatch = async (userID: string, opponentID?: string) => {
    try{

        if (opponentID) {
            //you've chosen your opponent
            console.log(`Finding match for ${userID} against ${opponentID}`);
            const opponentDocRef = db.collection('users').doc(opponentID);
            const opponentDoc = await opponentDocRef.get();

            const opponentFoundMatch = opponentDoc.data()?.findingMatch; // should be TRUE or FALSE
            if(opponentFoundMatch){
                return;
            } else {
                await opponentDocRef.update({
                    findingMatch: false
                });
                createMatch(userID, opponentID);
            }
        } else {
            //find a random person to play
            console.log(`Finding a random match for ${userID}`);

            const usersRef = db.collection('users');
            const matchQuery = usersRef.where("findingMatch", "==", true);
            const userDocRef = usersRef.doc(userID);

            const querySnapshot = await matchQuery.get();
            if (!querySnapshot.empty) {
                // Pick the first available user
                const randomOpponent = querySnapshot.docs[0]; 
                const randomOpponentID = randomOpponent.id;

                // Update the opponent's status
                await randomOpponent.ref.update({
                    findingMatch: false
                });

                console.log(`Match found! ${userID} vs ${opponentID}`);
                createMatch(userID, randomOpponentID);
            } else {
                console.log("No available matches found.");

                // Put yourself on the findingMatch waitlist 
                await userDocRef.update({
                    findingMatch: true
                });
            }
        }

    } catch (error) {
        console.error('findMatch - Error finding match:', error);
    }
}

// CREATE match 
export const createMatch = async (userID: string, opponentID: string) => {
    try {

        // Define the first three elements randomly shuffled
        const activityTypes = ["steps", "distance", "flights"];
        const shuffledActivities = activityTypes.sort(() => Math.random() - 0.5);
        
        // Define the fourth element randomly chosen from the first three
        const fourthActivity = shuffledActivities[Math.floor(Math.random() * 3)];
        
        // The last element is always "bet"
        const dailyMatches = [
            { type: shuffledActivities[0], userOneCount: 0, userTwoCount: 0, winner: "none" },
            { type: shuffledActivities[1], userOneCount: 0, userTwoCount: 0, winner: "none" },
            { type: shuffledActivities[2], userOneCount: 0, userTwoCount: 0, winner: "none" },
            { type: fourthActivity, userOneCount: 0, userTwoCount: 0, winner: "none" },
            { type: "bet", userOneCount: 0, userTwoCount: 0, winner: "none" }
        ]

        const today = new Date();

        const matchRef = await db.collection('matches').add({
            "user1": userID,
            "user2": opponentID,
            dailyMatches,
            "createdAt": serverTimestamp(),
            "startDay": today.getDay(),
            "daysPast": 0,
            "isGameActive": true,
            "matchWinner": "none",
        })

        console.log("Match created successfully:", matchRef.id);
        return matchRef.id;

    } catch (error) {
        console.error('createMatch - Error creating match:', error);
    }
}