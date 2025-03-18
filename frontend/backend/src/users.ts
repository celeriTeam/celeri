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

// GET User Profile Pic
export const getProfilePic = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.username) {
            return userDoc.data()?.profileImageUrl;
        } else {
            console.error("getProfilePic - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getProfilePic - Error fetching user document:", error);
        return undefined;
    }
}

// GET User Name
export const getUserName = async (id: string): Promise<string> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.username) {
            return userDoc.data()?.username;
        } else {
            console.error(`getUserName - error: No such document for user ${id}!`);
            return '';
        }
    } catch (error) {
        console.error("getUserName - Error fetching user document:", error);
        return '';
    }
}

// GET name
export const getName = async (id: string): Promise<string> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.name) {
            return userDoc.data()?.name;
        } else {
            console.error(`getName - error: No such document for user ${id}!`);
            return '';
        }
    } catch (error) {
        console.error("getName - Error fetching user document:", error);
        return '';
    }
}

// GET User Email
export const getUserEmail = async (id: string): Promise<string | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.email) {
            // console.log("getUserEmail - response:", userDoc.data()?.email);
            return userDoc.data()?.email;
        } else {
            console.error("getUserEmail - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getUserEmail - Error fetching user document:", error);
        return undefined;
    }
}

// GET List of User Groups
export const getUserGroups = async (id: string): Promise<string[] | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.groups) {
            const groupIDs = userDoc.data()?.groups;
            let groups: string[] = [];
            for (const groupID of groupIDs) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                //console.log("Group Document data:", groupDoc.data());
                groups.push(groupDoc.data()?.groupName);
            }
            // console.log("getUserGroups - response: ", groups);
            return groups;
        } else {
            console.error("getUserGroups - error: No such document!");
            return [];
        }
    } catch (error) {
        console.error("getUserGroups - Error fetching user document:", error);
        return undefined;
    }
}

// GET List of Active User Group ID
export const getActiveUserGroupIDs = async (id: string): Promise<string[] | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.groups) {
            const groupIDs = userDoc.data()?.groups;
            let groups: string[] = [];
            for (const groupID of groupIDs) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                if(groupDoc.data()?.isGameActive){
                    // console.log("Group Document isGameActive: true");
                    groups.push(groupID);
                }
            }
            // console.log("getActiveUserGroupIDs - response: ", groups);
            return groups;
        } else {
            console.error("getActiveUserGroupIDs - error: No such document!");
            return [];
        }
    } catch (error) {
        console.error("getActiveUserGroupIDs - Error fetching user document:", error);
        return undefined;
    }
}


// GET if user is in a weekly group
export const getIfWeekly = async (id: string): Promise<Boolean | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        let isWeekly =  false;
        if (userDoc.exists() && userDoc.data()?.groups) {
            const groupIDs = userDoc.data()?.groups;
            for (const groupID of groupIDs) {
                const groupDoc = await getDoc(doc(db, "groups", groupID));
                //console.log("Group Document data:", groupDoc.data());
                if(groupDoc.data()?.gameType == "weekly" || groupDoc.data()?.gameType == 'biweekly'){
                    isWeekly = true; 
                }
            }
        }
        return isWeekly;
    } catch (error) {
        console.error("getIfWeekly - Error fetching user document:", error);
        return undefined;
    }
}

// GET weekly duels won
export const getWeeklyDuelsWon = async (userID: string, groupID: string): Promise<number> =>{
    try {
        // console.log("getWeeklyDuelsWon starting");
        const duelsRef = collection(db, `groups/${groupID}/duels`);
        const q = query(duelsRef, where("winner", "==", userID));
        const querySnapshot = await getDocs(q);
        // console.log("getWeeklyDuelsWon snapshotSize", querySnapshot.size);
        return querySnapshot.size ?? 0;
    } catch (error) {
        console.error("getWeeklyDuelsWon - Error fetching duels won:", error);
        return 0;
    }
}

// GET user finished tutorial
export const getUserFinishedTutorial = async (userID: string): Promise<boolean> => {
    try {
        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists() && userDoc.data()?.finishedTutorial) {
            return userDoc.data()?.finishedTutorial;
        } else {
            console.error("getUserFinishedTutorial - error: No such document!");
            return false;
        }
    } catch (error) {
        console.error("getUserFinishedTutorial - Error fetching user document:", error);
        return false;
    }
}


/*********************************************** EDIT FUNCTIONS ********************************************/

// EDIT Profile Pic
export const editProfilePic = async (userID: string, newProfileImageUri: string): Promise<string | null> => {
    try {
        // Fetch the image as a blob
        const response = await fetch(newProfileImageUri);
        const blob = await response.blob();

        // Create a reference to the user's profile image in Firebase Storage
        const storageRef = ref(storage, `profileImages/${userID}`);

        // Overwrite the existing image with the new one
        await uploadBytes(storageRef, blob);

        // Get the download URL for the new profile image
        const downloadURL = await getDownloadURL(storageRef);

        // Update the user's profile in Firestore with the new image URL
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            profileImageUrl: downloadURL,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('editProfilePic - response: ', userDoc.data()?.profileImageUrl);

        return downloadURL;
    } catch (error) {
        console.error('editProfilePic - Error updating profile picture:', error);
        return null;
    }
};

// EDIT Username
export const editUsername = async(userID: string, usernameInput: string) => {
    try {
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            username: usernameInput,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('editUsername - response: ', userDoc.data()?.username);
    } catch (error) {
        console.error('editUsername - Error updating username', error);
        return null;
    }
}

// EDIT name
export const editName = async(userID: string, nameInput: string) => {
    try {
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            name: nameInput,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('editName - response: ', userDoc.data()?.name);
    } catch (error) {
        console.error('editName - Error updating name', error);
        return null;
    }
}

// EDIT password
export const editPassword = async(userID: string, newPassword: string) => {
    try {
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            password: newPassword,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('editPassword - response: ', userDoc.data()?.password);
    } catch (error) {
        console.error('editPassword - Error updating password', error);
        return null;
    }
}

// SET user finished tutorial
export const setUserFinishedTutorial = async (userID: string): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', userID);
        await updateDoc(userDocRef, {
            finishedTutorial: true,
        });
        console.log('setUserFinishedTutorial - response: ', true);
    } catch (error) {
        console.error('setUserFinishedTutorial - Error updating finished tutorial:', error);
    }
}

/*********************************************** ADD FUNCTIONS ********************************************/

// ADD group to user
export const addGroupToUser = async (userID: string, groupID: string): Promise<string | undefined> => {
    try {
        const userDocRef = doc(db, 'users', userID);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()){
            // Check if group is already in the user's groups
            if (userDoc.data()?.groups.includes(groupID)) {
                console.log(`addUserToGroup - response: User ${userID} is already in the group ${groupID}. No update needed.`);
                return 'You are already in this group!';
            }

            await updateDoc(userDocRef, {
                groups: [...userDoc.data()?.groups, groupID],
            });
            console.log(`addGroupToUser - response: Group ${groupID} added to user ${userID}`);
            return 'Group added successfully!';
        } else{
            console.error("addGroupToUser - error: No such document!");
            return undefined;
        }
    } catch (error) {
         console.error("addGroupToUser - Error fetching user document: ", error);
         return undefined;
    }
}

/*********************************************** HEALTH DATA FUNCTIONS ********************************************/

// SET Steps and average steps
export const setStepsFirebase = async(userID: string, steps: number, averageSteps: number[], stepsFromWeekBefore: number) => {
    try {
        const userDocRef = doc(db, 'users', userID);
        // console.log('setSteps - averageSteps before being put in the doc: ', averageSteps)
        await updateDoc(userDocRef, {
            steps: steps,
            averageSteps: averageSteps,
            stepsFromWeekBefore: stepsFromWeekBefore,
        });
        const userDoc = await getDoc(userDocRef);
        // console.log('setSteps - response: ', userDoc.data()?.steps, ' averageSteps: ', userDoc.data()?.averageSteps,
    // ' stepsFromWeekBefore: ', userDoc.data()?.stepsFromWeekBefore);
    } catch (error) {
        console.error('setSteps - Error updating username', error);
        return null;
    }
}

// GET Steps
export const getSteps = async (id: string): Promise<number> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.steps !== undefined) {
            //console.log("getSteps - response: ", userDoc.data()?.steps, " id: ", id);
            return userDoc.data()?.steps;
        } else {
            console.error("getSteps - error: No such document!");
            return 0;
        }
    } catch (error) {
        console.error("getSteps - Error fetching user document:", error);
        return 0;
    }
}

// GET biweekly steps
export const getBiweeklySteps = async(groupID: string, userID: string): Promise<number> => {
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        const userDoc = await getDoc(doc(db, "users", userID));

        const groupData = groupDoc.data();
        const userData = userDoc.data();
        const resetDay = groupData?.resetDay || 0;


        const firstResetDay = resetDay;
        const secondResetDay = (resetDay + 3) % 7; 
        const currentDay = new Date().getDay();

        const currentHour = new Date().getHours();

        // Define reset times (in 24-hour format)
        const firstResetHour = 0;  // 12 AM
        const secondResetHour = 12; // 12 PM

        const weeklyStepsTemp = userData?.averageSteps; 

        if (weeklyStepsTemp === undefined || weeklyStepsTemp.length !== 7) {
            console.error("getBiweeklySteps - error: Invalid averageSteps data");
            return 0;
        }

        let daysSinceReset;

        // figure out if you should count from first or second resetDay, also in bet summary
        if (
            (currentDay < secondResetDay && currentDay >= firstResetDay) ||
            (secondResetDay < firstResetDay && (currentDay >= firstResetDay || currentDay < secondResetDay) ||
            currentDay === secondResetDay && currentHour < secondResetHour) // Handles cases where second reset is earlier in the week
        ) {
            // the next reset is the secondReset, the previous reset is the firstReset
            daysSinceReset = (currentDay - firstResetDay + 7) & 7;
            const totalStepsSinceReset = daysSinceReset != 0 ? weeklyStepsTemp.slice(-daysSinceReset).reduce((sum: number, steps: number) => sum + steps, 0) : 0;

            const currentDaySteps = await getSteps(userID) || 0;
            const totalBiweeklySteps = totalStepsSinceReset + currentDaySteps;
            // console.log("getBiweekluySteps - totalBiweeklySteps: ", totalBiweeklySteps);

            return totalBiweeklySteps;
        } else {
            // the next reset is the firstReset, the previous reset is the secondReset
            daysSinceReset = (currentDay - secondResetDay + 7) & 7;
            const totalStepsSinceReset = daysSinceReset != 0 ? weeklyStepsTemp.slice(-daysSinceReset).reduce((sum: number, steps: number) => sum + steps, 0) : 0;
            const currentDaySteps = await getSteps(userID) || 0;
            const totalBiweeklySteps = totalStepsSinceReset + currentDaySteps;
            // console.log("getBiweekluySteps - totalBiweeklySteps: ", totalBiweeklySteps);

            return totalBiweeklySteps;
        }
    } catch (error) {
        console.error("getBiweeklySteps - Error fetching user document:", error);
        return 0;
    }
}

// GET weekly steps
export const getWeeklySteps = async (groupID: string, userID: string): Promise<number> => {
    // console.log("getWeeklySteps -- running");
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        const userDoc = await getDoc(doc(db, "users", userID));

        const groupData = groupDoc.data();
        const userData = userDoc.data();

        const todayIndex = new Date().getDay(); // Get the current day index (0-6)
        const resetDay = groupData?.resetDay || 0;
        const weeklyStepsTemp = userData?.averageSteps; // temp logic for averagesteps revamp (1/25/2024)

        if (weeklyStepsTemp === undefined || weeklyStepsTemp.length !== 7) {
            console.error("getWeeklySteps - error: Invalid averageSteps data");
            return 0;
        }

        // Calculate how many days to include (from resetDay to yesterday)        
        const daysPast = (todayIndex - resetDay) % 7;
        // console.log('today index: ', todayIndex, ' resetDay: ', resetDay, ' daysPast: ', daysPast);
        const totalStepsSinceReset = daysPast != 0 ? weeklyStepsTemp.slice(-daysPast).reduce((sum: number, steps: number) => sum + steps, 0) : 0;

        const currentDaySteps = await getSteps(userID) || 0;
        const totalWeeklySteps = totalStepsSinceReset + currentDaySteps;
        // console.log("getWeeklySteps - totalWeeklySteps: ", totalWeeklySteps);

        return totalWeeklySteps;
    } catch (error) {
        console.error("getWeeklySteps - Error fetching group document:", error);
        return 0;
    }
}


// GET Average Steps
export const getAverageSteps = async (id: string): Promise<number[]> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists() && userDoc.data()?.averageSteps !== undefined) {
            const averageSteps = userDoc.data()?.averageSteps;
            // console.log("getAverageSteps - response:", id, averageSteps);
            return averageSteps;
        } else {
            console.error("getAverageSteps - error: No such document!", id);
            return [];
        }
    } catch (error) {
        console.error("getAverageSteps - Error fetching user document:", error);
        return [];
    }
}

// GET last week's steps; different from getWeeklySteps because it's looking at the past cycle's week, not the past week 
// so if today is weds and reset day is sunday it would look for the past sunday-sunday, not weds-weds 
export const getLastWeekSteps = async (userID: string, groupID: string): Promise<number> => {

    try {
        const groupDocRef = doc(db, `groups/${groupID}`);
        const groupDocSnap = await getDoc(groupDocRef);
        

        if (groupDocSnap.exists()) {
            const resetDay = groupDocSnap.data().resetDay as number; 

            // Get the date of the most recent "resetDay"
            const today = new Date();
            const currentDay = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

            // Find the most recent occurrence of the resetDay
            const daysSinceResetDay = (currentDay - resetDay + 7) % 7;
            const lastResetDayDate = new Date(today);
            lastResetDayDate.setDate(today.getDate() - daysSinceResetDay);

            // Get the date 7 days before that resetDay
            const previousResetDayDate = new Date(lastResetDayDate);
            previousResetDayDate.setDate(lastResetDayDate.getDate() - 7);

            // Normalize both dates to 00:00:00 for comparison
            previousResetDayDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(previousResetDayDate);
            nextDay.setDate(previousResetDayDate.getDate() + 1);


            // Query the "duels" subcollection for matching player and date range
            const duelsRef = collection(db, `groups/${groupID}/duels`);
            const duelsQuery = query(
            duelsRef,
                where('createdAt', '>=', Timestamp.fromDate(previousResetDayDate)),
                where('createdAt', '<', Timestamp.fromDate(nextDay))
            );

            const duelsSnap = await getDocs(duelsQuery);

            // Filter the duels to check for player1 or player2
            const matchingDuel = duelsSnap.docs.find(
                (doc) => doc.data().player1 === userID || doc.data().player2 === userID
            );
        

        
            const duelData = matchingDuel?.data();

            if(duelData?.steps && duelData?.steps > 0){
                return Math.floor(duelData?.steps) ?? 0; // Return steps or 0 if not found
            } else {
                //if weeklySteps doesn't exist, it means its the first week, and you should grab it from the past seven days
                const averageStepArray = await getAverageSteps(userID);
                const sum = averageStepArray.reduce((a: number, b: number) => a + b, 0);
                return Math.floor(sum);
            }
        }

        return 0; // Return 0 if the group document does not exist
    } catch (error) {
        console.error("getLastWeekSteps - Error fetching last week's steps:", error);
        return 0; // Return 0 in case of an error
    }
}

// GET stepsFromWeekBefore
export const getStepsFromWeekBefore = async(userID: string): Promise<number> => {
    try {
        const userDocRef = doc(db, `users/${userID}`)
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const stepsFromWeekBefore = data.stepsFromWeekBefore ?? 0; // Fallback to 0 if field is missing
            // console.log(`getStepsFromWeekBefore - ${stepsFromWeekBefore} here stepsFromWeekBefore`);
            return stepsFromWeekBefore;
        } else {
            console.error(`getStepsFromWeekBefore - User document for ${userID} not found`);
            return 0;
        }
    } catch (error) {
        console.error("getStepsFromWeekBefore - Error fetching stepsFromWeekBefore:", error);
        return 0;
    }
}

// GET steps last updated
export const getStepsLastUpdate = async (id: string): Promise<Date | undefined> => {
    try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
            const stepsLastUpdate = userDoc.data()?.stepsLastUpdate.toDate() ?? new Date();
            // console.log("getStepsLastUpdate - response: ", stepsLastUpdate);
            return stepsLastUpdate;
        } else {
            console.error("getStepsLastUpdate - error: No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("getStepsLastUpdate - Error fetching user document:", error);
        return undefined;
    }
}

// SET steps last updated
export const setStepsLastUpdate = async (id: string, date: Date): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', id);
        await updateDoc(userDocRef, {
            stepsLastUpdate: date,
        });
        console.log('setStepsLastUpdate - response: ', date);
    } catch (error) {
        console.error('setStepsLastUpdate - Error updating steps last updated:', error);
    }
}