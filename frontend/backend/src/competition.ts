import { db } from "../../firebaseConfig";

/*********************************************** PRE-GAME FUNCTIONS ********************************************/

export const writeConsentForm = async (userId: string, payment: string, referral: string) => {
    try {
        // Reference to the user document in the 'users' collection
        const userRef = db.collection('users').doc(userId);
        // Update the payment and consent fields
        await userRef.update({
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
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const data = userSnap.data();
        return data?.consent === true;
    }
    return false;
};

// Returns true if the user is in a competition (inCompetition === true), false otherwise
export const isUserInCompetition = async (userId: string): Promise<boolean> => {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const data = userSnap.data();
        return data?.inCompetition === true;
    }
    return false;
};

// Sets the user's inCompetition field to true
export const setUserInCompetition = async (userId: string): Promise<void> => {
    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({ inCompetition: true });
    } catch (error) {
        console.log("Error setting inCompetition:", error);
    }
};

export const getUserProfile = async (userId: string) => {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const data = userSnap.data();
        return {
            username: data?.username || '',
            profileImageUrl: data?.profileImageUrl || '',
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
        const q = db.collection('users').where('__name__', 'in', batchIds);
        batches.push(q.get());
    }
    const results = await Promise.all(batches);
    // Flatten and map to desired structure
    return results.flatMap(snapshot =>
        snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                userId: docSnap.id,
                username: data?.username || '',
                // Map to profileImageUrl for consistency
                profileImageUrl: data?.profileImageUrl || data?.profilePicture || data?.profilePic || '',
            };
        })
    );
};

// GET referral id
export const getReferral = async (id: string): Promise<string | null> => {
    try {
        const userDoc = await db.collection('users').doc(id).get();
        if (userDoc.exists && userDoc.data()?.referral !== undefined) {
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
        const competitionsRef = db.collection('competitions');
        const q = competitionsRef.orderBy('createdAt', 'desc').limit(1);
        console.log("test", q);
        const snapshot = await q.get();
        
        if (!snapshot.empty) {
            const competitionDoc = snapshot.docs[0];
            const data = competitionDoc.data();
            if (data?.waitingMessage) {
                return data?.waitingMessage;
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
