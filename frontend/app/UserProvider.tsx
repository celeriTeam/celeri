import React, { createContext, useContext, useState, useEffect } from 'react';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { getProfilePic, getUserName, getSteps, getUserGroups } from '@/backend/src/users';
import { getGroupIDFromGroupName, getGroupName, getGroupCode, getGroupProfilePic, getGroupIsGameActive, getGroupIsFirstDay, getGroupCreator, getUserTokens, getTodaysBetTokens, getUsersInGroup, getDefaultBetOnSelf, getDailyTokens, getTotalCycles, getGameType, getCycle, getCycleCount, getCurrentPlayersInGame } from '@/backend/src/groups';
import { getYesterdaysDuelsSummary, getTodaysDuelsSummary, getUnbetDuels, checkFinishedBetting, checkFinishedRecap, checkFinishedTutorial } from '@/backend/src/bets';

const auth = getAuth(app);
const db = getFirestore(app);

export interface UserContextType {
    userID: string;
    profileImageUrl: string;
    username: string;
    steps: number;
    groupNames: string[];
    getGroupID: { [groupName: string]: any };
    groups: { [groupID: string]: any };
    loading: boolean;
}

const UserContext = createContext<UserContextType>({
    userID: '',
    profileImageUrl: '',
    username: '',
    steps: 0,
    groupNames: [],
    getGroupID: {},
    groups: {},
    loading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userID, setUserID] = useState<string>('');
    const [profileImageUrl, setProfileImageUrl] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [steps, setSteps] = useState<number>(0);
    const [groupNames, setGroupNames] = useState<any[]>([]);
    const [getGroupID, setGetGroupID] = useState<{ [groupName: string]: any }>({});
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        let unsubscribeUser: any;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserID(user.uid);
                unsubscribeUser = fetchUserData(user.uid);
            } else {
                setUserID('');
                clearUserData();
                setLoading(false);
            }
        });
        setLoading(false);

        return () => {
            unsubscribe(); // Cleanup the auth state listener
            // Cleanup the user document snapshot listener
            if (typeof unsubscribeUser === 'function') {
                unsubscribeUser();
            }
        };
    }, []);

    const fetchUserData = async (uid: string) => {
        const usersRef = collection(db, "users");
        const userDocRef = doc(usersRef, uid);
        const unsubscribeUser = onSnapshot(userDocRef, async (docSnapshot) => {
            setLoading(true);
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const currentProfilePicUrl = await getProfilePic(uid);
                setProfileImageUrl(currentProfilePicUrl || '');
                const currentUsername = await getUserName(uid);
                setUsername(currentUsername || '');
                const currentUserSteps = await getSteps(uid);
                setSteps(currentUserSteps || 0);

                const userGroups = await getUserGroups(uid); // List of group names
                if (userGroups) {
                    setGroupNames(userGroups);
                    fetchGroupData(userGroups, uid);
                }
            }
            setLoading(false);
        });

        return unsubscribeUser;
    };

    const fetchGroupData = async (userGroups: string[], uid: string) => {
        const groups: { [groupID: string]: any } = {};
        const getGroupID: { [groupName: string]: any } = {};
        if (userGroups) {
            await Promise.all(userGroups.map(async (groupName) => {
                const groupID = await getGroupIDFromGroupName(groupName);
                const groupsRef = collection(db, "groups");
                const groupDocRef = doc(groupsRef, groupID);
                const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
                    setLoading(true);
                    if (docSnapshot.exists() && groupID) {
                        const [groupCode, groupImageUrl, groupName, isGameActive, isFirstDay, groupCreator, userTokens, defaultBetOnSelf, todaysBetTokens, dailyTokens, currentPlayersInGame, cycle, cycleCount, totalCycles, yesterdaysDuels, todaysDuels, unbetDuels, isFinishedBetting, isFinishedRecap, isFinishedTutorial, gameType] = await Promise.all([
                            getGroupCode(groupID),
                            getGroupProfilePic(groupID),
                            getGroupName(groupID),
                            getGroupIsGameActive(groupID),
                            getGroupIsFirstDay(groupID),
                            getGroupCreator(groupID),
                            getUserTokens(uid, groupID),
                            getDefaultBetOnSelf(groupID),
                            getTodaysBetTokens(uid, groupID),
                            getDailyTokens(groupID),
                            getCurrentPlayersInGame(groupID),
                            getCycle(groupID),
                            getCycleCount(groupID),
                            getTotalCycles(groupID),
                            getYesterdaysDuelsSummary(groupID),
                            getTodaysDuelsSummary(groupID),
                            getUnbetDuels(groupID, uid),
                            checkFinishedBetting(groupID, uid),
                            checkFinishedRecap(groupID, uid),
                            checkFinishedTutorial(groupID, uid),
                            getGameType(groupID)
                        ]);

                        const userList = await getUsersInGroup(groupID); // userIDs
                        const users: { [userID: string]: any } = {};
                        if (userList) {
                            await Promise.all(userList.map(async (selectedUserID) => {
                                const [profilePic, username, steps, tokens] = await Promise.all([
                                    getProfilePic(selectedUserID),
                                    getUserName(selectedUserID),
                                    getSteps(selectedUserID),
                                    getUserTokens(selectedUserID, groupID)
                                ]);
                        
                                users[selectedUserID] = {
                                    profilePic,
                                    username,
                                    steps,
                                    tokens
                                };
                            }));
                        }
                        if (groupName) {
                            getGroupID[groupName] = groupID;
                        }
                        groups[groupID] = {
                            groupCode,
                            groupImageUrl,
                            groupName,
                            isGameActive,
                            isFirstDay,
                            groupCreator,
                            userTokens,
                            defaultBetOnSelf,
                            todaysBetTokens,
                            dailyTokens,
                            currentPlayersInGame,
                            cycle,
                            cycleCount,
                            totalCycles,
                            yesterdaysDuels,
                            todaysDuels,
                            unbetDuels,
                            isFinishedBetting,
                            isFinishedRecap,
                            isFinishedTutorial,
                            gameType,
                            userList,
                            users
                        };
                    }
                    setLoading(false);
                });
                return unsubscribeGroup;
            }));
        }
        setGetGroupID(getGroupID);
        setGroups(groups);
    };

    const clearUserData = () => {
        setProfileImageUrl('');
        setUsername('');
        setSteps(0);
        setGroupNames([]);
        setGroups({});
    };

    return (
        <UserContext.Provider value={{ userID, profileImageUrl, username, steps, groupNames, getGroupID, groups, loading }}>
            {children}
        </UserContext.Provider>
    );
};
