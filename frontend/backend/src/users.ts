import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
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
            console.log("getUserEmail - response:", userDoc.data()?.email);
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
            console.log("getUserGroups - response: ", groups);
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
                    console.log("Group Document isGameActive: true");
                    groups.push(groupID);
                }
            }
            console.log("getActiveUserGroupIDs - response: ", groups);
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
                if(groupDoc.data()?.gameType == "weekly"){
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
export const setStepsFirebase = async(userID: string, steps: number, averageSteps: number[]) => {
    try {
        const userDocRef = doc(db, 'users', userID);
        console.log('setSteps - averageSteps before being put in the doc: ', averageSteps)
        await updateDoc(userDocRef, {
            steps: steps,
            averageSteps: averageSteps,
        });
        const userDoc = await getDoc(userDocRef);
        console.log('setSteps - response: ', userDoc.data()?.steps, ' averageSteps: ', userDoc.data()?.averageSteps);
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
            console.log("getSteps - response: ", userDoc.data()?.steps, " id: ", id);
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

// GET weekly steps
export const getWeeklySteps = async (groupID: string, userID: string): Promise<number> => {
    console.log("getWeeklySteps -- running");
    try {
        const groupDoc = await getDoc(doc(db, "groups", groupID));
        const userDoc = await getDoc(doc(db, "users", userID));

        const groupData = groupDoc.data();
        const userData = userDoc.data();

        const todayIndex = new Date().getDay(); // Get the current day index (0-6)
        const resetDay = groupData?.resetDay || 0;
        const weeklyStepsTemp = userData?.averageSteps ?? userData?.averageStepsTemp; // temp logic for averagesteps revamp (1/25/2024)

        if (weeklyStepsTemp === undefined || weeklyStepsTemp.length !== 7) {
            console.error("getWeeklySteps - error: Invalid averageSteps data");
            return 0;
        }

        // Calculate how many days to include (from resetDay to yesterday)        
        const daysPast = (todayIndex - resetDay) % 7;
        console.log('today index: ', todayIndex, ' resetDay: ', resetDay, ' daysPast: ', daysPast);
        const totalStepsSinceReset = daysPast != 0 ? weeklyStepsTemp.slice(-daysPast).reduce((sum: number, steps: number) => sum + steps, 0) : 0;

        const currentDaySteps = await getSteps(userID) || 0;
        const totalWeeklySteps = totalStepsSinceReset + currentDaySteps;
        console.log("totalWeeklySteps: ", totalWeeklySteps);

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
        if (userDoc.exists() && (userDoc.data()?.averageStepsTemp !== undefined || userDoc.data()?.averageStepsTemp !== undefined)) {
            const averageSteps = userDoc.data()?.averageSteps ?? userDoc.data()?.averageStepsTemp;
            console.log("getAverageSteps - response:", averageSteps);
            return averageSteps;
        } else {
            console.error("getAverageSteps - error: No such document!");
            return [];
        }
    } catch (error) {
        console.error("getAverageSteps - Error fetching user document:", error);
        return [];
    }
}