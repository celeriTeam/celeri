import React, { createContext, useContext, useState, useEffect } from 'react';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { getProfilePic, getUserName, getSteps, getUserGroups, getName, getWeeklySteps, 
    getAverageSteps, getStepsFromWeekBefore, getLastWeekSteps, getWeeklyDuelsWon, 
    getUserFinishedTutorial} from '@/backend/src/users';
import { getGroupIDFromGroupName, getGroupName, getGroupCode, getGroupProfilePic, getGroupIsGameActive, getGroupIsFirstDay, 
    getGroupIsResultAvailable, getGroupCreator, getUserTokens, getTodaysBetTokens, getUsersInGroup, getTotalCycles, getGameType, getCycle, getCycleCount, getCurrentPlayersInGame, getGroupCreatedAt, getUserDiamonds, getLastLogin, getResetDay, getStartingTokens, getTutorialStatus } from '@/backend/src/groups';
import { getYesterdaysDuelsSummary, getGameStartedAt, getTodaysDuelsSummary, getUnbetDuels, checkFinishedBetting, checkFinishedRecap, checkFinishedTutorial, getLastWeekDuelsSummary, getLastWeekPropBets, } from '@/backend/src/bets';


const auth = getAuth(app);
const db = getFirestore(app);

export interface UserContextType {
    userID: string;
    profileImageUrl: string;
    username: string;
    name: string;
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
    name: '',
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
    const [name, setName] = useState<string>('');
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
                const name = await getName(uid);
                setName(name || '');
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
                        const [groupCode, groupImageUrl, groupName, isGameActive, isFirstDay, isResultAvailable,
                        groupCreator] = await Promise.all([
                            getGroupCode(groupID),
                            getGroupProfilePic(groupID),
                            getGroupName(groupID),
                            getGroupIsGameActive(groupID),
                            getGroupIsFirstDay(groupID),
                            getGroupIsResultAvailable(groupID, uid),
                            getGroupCreator(groupID),
                        ]);

                        let userTokens = null,
                        todaysBetTokens = null,
                        cycle = null,
                        cycleCount = null,
                        totalCycles = null,
                        currentPlayersInGame = null,
                        yesterdaysDuels = null,
                        lastWeekDuels = null,
                        todaysDuels = null,
                        unbetDuels = null,
                        lastWeekPropBets = null,
                        isFinishedBetting = null,
                        isFinishedRecap = null,
                        isFinishedTutorial = null,
                        gameType = null,
                        createdAt = null,
                        resetDay = null,
                        startingTokens = null,
                        userFinishedTutorial = null,
                        tutorialStatus = null,
                        gameStartedAt = null;

                        if (isGameActive) {
                            [userTokens, todaysBetTokens, cycle, cycleCount, totalCycles, currentPlayersInGame, 
                            yesterdaysDuels, lastWeekDuels, todaysDuels, 
                            unbetDuels, lastWeekPropBets, isFinishedBetting, isFinishedRecap, 
                            isFinishedTutorial, gameType, createdAt, resetDay,
                            startingTokens, userFinishedTutorial, tutorialStatus, gameStartedAt] = await Promise.all([
                                getUserTokens(groupID, uid),
                                getTodaysBetTokens(groupID, uid),
                                getCycle(groupID),
                                getCycleCount(groupID),
                                getTotalCycles(groupID),
                                getCurrentPlayersInGame(groupID),
                                getYesterdaysDuelsSummary(groupID),
                                getLastWeekDuelsSummary(groupID),
                                getTodaysDuelsSummary(groupID),
                                getUnbetDuels(groupID, uid),
                                getLastWeekPropBets(groupID, uid),
                                checkFinishedBetting(groupID, uid),
                                checkFinishedRecap(groupID, uid),
                                checkFinishedTutorial(groupID, uid),
                                getGameType(groupID),
                                getGroupCreatedAt(groupID),
                                getResetDay(groupID),
                                getStartingTokens(groupID),
                                getUserFinishedTutorial(uid),
                                getTutorialStatus(groupID, uid),
                                getGameStartedAt(groupID),
                            ]);
                        }

                        // console.log("testing here", groupName, isResultAvailable)

                        const userList = await getUsersInGroup(groupID); // userIDs
                        const users: { [userID: string]: any } = {};
                        if (userList) {
                            await Promise.all(userList.map(async (selectedUserID) => {
                                const [profilePic, username, name, steps, averageSteps, stepsFromWeekBefore] = await Promise.all([
                                    getProfilePic(selectedUserID),
                                    getUserName(selectedUserID),
                                    getName(selectedUserID),
                                    getSteps(selectedUserID),
                                    getAverageSteps(selectedUserID), // average amount of steps over the past seven days 
                                    getStepsFromWeekBefore(selectedUserID), // from the week before the past reset day to one week before that. 7 days before the one below.
                                ]);

                                let weeklySteps = null,
                                lastWeekSteps = null,
                                weeklyDuelsWon = null,
                                tokens = null,
                                betOnTokens = null,
                                diamonds = null,
                                lastLogin = null;

                                if (isGameActive) {
                                    [weeklySteps, lastWeekSteps, weeklyDuelsWon, tokens, betOnTokens, diamonds, lastLogin] = await Promise.all([
                                        getWeeklySteps(groupID, selectedUserID), // the steps that are being counted for the game week by week
                                        getLastWeekSteps(groupID, selectedUserID), // from the past reset day to 7 days behind that
                                        getWeeklyDuelsWon(groupID, selectedUserID),
                                        getUserTokens(groupID, selectedUserID),
                                        getTodaysBetTokens(groupID, selectedUserID),
                                        getUserDiamonds(groupID, selectedUserID),
                                        getLastLogin(groupID, selectedUserID)
                                    ]);
                                }
                        
                                users[selectedUserID] = {
                                    profilePic,
                                    username,
                                    steps,
                                    weeklySteps,
                                    averageSteps,
                                    stepsFromWeekBefore,   
                                    lastWeekSteps,
                                    weeklyDuelsWon,
                                    tokens,
                                    betOnTokens,
                                    diamonds,
                                    name,
                                    lastLogin
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
                            isResultAvailable,
                            groupCreator,
                            userTokens,
                            todaysBetTokens,
                            startingTokens,
                            currentPlayersInGame,
                            cycle,
                            cycleCount,
                            totalCycles,
                            yesterdaysDuels,
                            lastWeekDuels,
                            todaysDuels,
                            unbetDuels,
                            lastWeekPropBets,
                            isFinishedBetting,
                            isFinishedRecap,
                            isFinishedTutorial,
                            userFinishedTutorial,
                            tutorialStatus,
                            gameStartedAt,
                            gameType,
                            createdAt,
                            resetDay,
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
        setName('');
        setSteps(0);
        setGroupNames([]);
        setGroups({});
    };

    return (
        <UserContext.Provider value={{ userID, profileImageUrl, username, name, steps, groupNames, getGroupID, groups, loading }}>
            {children}
        </UserContext.Provider>
    );
};
