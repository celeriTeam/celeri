import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { Image } from 'expo-image';
import { useUser } from '../../../UserProvider';
import { LinearGradient } from 'expo-linear-gradient';
import StorePage from './Store';
import BetHistoryPage from './BetHistory';
import WeeklyBetHistoryPage from './WeeklyBetHistory';
import Svg, { Circle, G } from 'react-native-svg';
import { getAverageSteps, getProfilePic, getSteps, getUserName, getWeeklySteps, getBiweeklySteps } from '@/backend/src/users';
import { getCurrentPlayersInGame, getCycleCount, getCycle, getGroupIsFirstDay, getGroupName, getGroupProfilePic, getGameType, getTodaysBetTokens, getTotalCycles, getUserDiamonds, getUsersInGroup, getUserTokens, addPropBet, getPropBet, getResetDay, setLogin } from '@/backend/src/groups';
import { getPowerups } from '@/backend/src/store';
import { Dimensions } from 'react-native';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { addToFinishedPropBet, checkFinishedPropBet } from '@/backend/src/bets';
import { ClientRequest } from 'http';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LiveDuelPage from './LiveDuel';
import { group } from 'console';
import PropBetPage from './PropBet';
import EditGroupPage from './EditGroup';
import { SafeAreaView } from 'react-native-safe-area-context';
import NewsPage from './News';

const db = getFirestore(app);

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const BetSummaryPage: React.FC = () => {
    const { userID, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const { steps, stepsFromWeekBefore, averageSteps, distance, flights } = useHealthData();
    const [isPropBetModalVisible, setPropBetModalVisible] = useState(false);
    const [propBetQueued, setPropBetQueued] = useState(false);
    const [isNewsModalVisible, setNewsModalVisible] = useState(false);
    const [isBetHistoryModalVisible, setBetHistoryModalVisible] = useState(false);
    const [isStoreModalVisible, setStoreModalVisible] = useState(false);
    const [isLiveDuelModalVisible, setLiveDuelModalVisible] = useState(false);
    const [isEditGroupModalVisible, setEditGroupModalVisible] = useState(false);
    const [isTokensModalVisible, setTokensModalVisible] = useState(false);
    const [isTokensUsedModalVisible, setTokensUsedModalVisible] = useState(false);
    const [isDiamondsModalVisible, setDiamondsModalVisible] = useState(false);
    const [isHistoryDropdownVisible, setHistoryDropdownVisible] = useState(false);
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [currentBets, setCurrentBets] = useState<{ duelID: string, player1: string, player2: string, player1Pfp: string, player2Pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], player1Steps: number, player2Steps: number }[]>([]);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; betOnTokens: number | undefined; diamonds: number | undefined; steps: number | undefined, todaysSteps: number | undefined, averageSteps: number[] | undefined }[]>([]);
    const [gameTimeLeft, setGameTimeLeft] = useState("");
    const [betTimeLeft, setBetTimeLeft] = useState("");
    const [propBetPlayer, setPropBetPlayer] = useState<{ id: string; name: string; averageStepCount: number; }[]>([]);
    const [selectedPropBet, setSelectedPropBet] = useState<'over' | 'under' | null>(null);
    const [finishedPropBet, setFinishedPropBet] = useState<boolean>(false);
    const [currentPropBet, setCurrentPropBet] = useState<{ betOnUserID: string; averageStepCount: number; overUnder: string; } | undefined>(undefined);
    const [currentBetIndex, setCurrentBetIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [powerups, setPowerups] = useState<Array<Array<string>>>([]);
    const [selectedTab, setSelectedTab] = useState('Tokens');
    const [isDuelExpanded, setIsDuelExpanded] = useState(false);
    const router = useRouter();
    const maxNameLength = 16;
    const screenWidth = Dimensions.get('window').width * 0.8;
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        let cleanup: () => void;

        const initialize = async () => {
            try {
                await setLogin(userID, groupID, new Date());
                cleanup = await fetchGroupData(userID);
                await fetchPowerups();
            } catch (error) {
                console.error('Error fetching user groups:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initialize();

        return () => {
            if (cleanup) {
                cleanup();
            }
        };
    }, [userID, isStoreModalVisible, isPropBetModalVisible]);

    const fetchPowerups = async () => {
        try {
            const powerupsData = await getPowerups(groupID);
            setPowerups(powerupsData);
            console.log("powerups received", powerups);
        } catch (error) {
            console.error("Failed to fetch powerups:", error);
        }
    };

    const setPropBetPlayerLogic = (userList: string[], cycle: number, cycleCount: number) => {
        // Find current user's index
        const currentUserIndex = userList.indexOf(userID);

        // Calculate initial chosen index with wraparound
        const today = new Date().getDay();
        let chosenIndex = (currentUserIndex + cycle + cycleCount + today) % userList.length;

        // If chosen player is current user, increment index
        if (userList[chosenIndex] === userID) {
            chosenIndex = (chosenIndex + 1) % userList.length;
        }

        // Set the prop bet player
        return userList[chosenIndex];
    };

    const fetchGroupData = async (uid: string) => {
        const currentGroups: { [groupID: string]: any } = {};
        const groupsRef = collection(db, "groups");
        const groupDocRef = doc(groupsRef, groupID);
        console.log('fetching group data..');

        // Unsubscribe firebase listener functions
        const unsubscribeFunctions: (() => void)[] = [];
        // Set up listener iff modal is not visible
        if (!isStoreModalVisible && !isPropBetModalVisible) {
            const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
                setIsLoading(true);
                if (docSnapshot.exists() && groupID) {
                    const [groupImageUrl, groupName, isFirstDay, userTokens, todaysBetTokens, userDiamonds, currentPlayersInGame, cycle, cycleCount, totalCycles, resetDay, gameType, isFinishedPropBet] = await Promise.all([
                        getGroupProfilePic(groupID),
                        getGroupName(groupID),
                        getGroupIsFirstDay(groupID),
                        getUserTokens(uid, groupID),
                        getTodaysBetTokens(uid, groupID),
                        getUserDiamonds(uid, groupID),
                        getCurrentPlayersInGame(groupID),
                        getCycle(groupID),
                        getCycleCount(groupID),
                        getTotalCycles(groupID),
                        getResetDay(groupID),
                        getGameType(groupID),
                        checkFinishedPropBet(groupID, uid)
                    ]);

                    const userList = await getUsersInGroup(groupID); // userIDs
                    const users: { [userID: string]: any } = {};
                    let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; betOnTokens: number | undefined; diamonds: number | undefined; steps: number | undefined, todaysSteps: number | undefined, averageSteps: number[] | undefined }[] = [];
                    if (userList) {
                        await Promise.all(userList.map(async (selectedUserID) => {
                            const [profilePic, username, steps, weeklySteps, biweeklySteps, averageSteps, tokens, betOnTokens, diamonds] = await Promise.all([
                                getProfilePic(selectedUserID),
                                getUserName(selectedUserID),
                                getSteps(selectedUserID),
                                getWeeklySteps(groupID, selectedUserID),
                                getBiweeklySteps(groupID, selectedUserID),
                                getAverageSteps(selectedUserID),
                                getUserTokens(selectedUserID, groupID),
                                getTodaysBetTokens(selectedUserID, groupID),
                                getUserDiamonds(selectedUserID, groupID)
                            ]);

                            let newSteps;
                            if( gameType === "weekly") {
                                newSteps = Math.round(gameType === "weekly" ? weeklySteps : steps);
                            } else if (gameType === "biweekly") {
                                newSteps = Math.round(gameType === "biweekly" ? biweeklySteps : steps);
                            } else {
                                newSteps = steps;
                            }

                            users[selectedUserID] = {
                                profilePic,
                                username,
                                newSteps,
                                tokens
                            };
                            groupUsersArray.push({
                                id: selectedUserID,
                                name: username,
                                pfp: profilePic,
                                tokens: tokens,
                                betOnTokens: betOnTokens,
                                diamonds: diamonds,
                                steps: newSteps,
                                todaysSteps: steps,
                                averageSteps: averageSteps
                            });
                        }));
                        // Sort users by tokens in descending order
                        groupUsersArray.sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));
                        setCurrentGroupUsersArray(groupUsersArray);
                    }
                    currentGroups[groupID] = {
                        groupImageUrl,
                        groupName,
                        isFirstDay,
                        userTokens,
                        userList,
                        todaysBetTokens,
                        userDiamonds,
                        currentPlayersInGame,
                        gameType
                    };
                    setGroups(currentGroups);

                    // Set # of days/weeks left in the game
                    const currentDay = new Date().getDay();
                    const safeResetDay = resetDay ?? 0; // Default to Sunday if undefined
                    const timeLeft = (currentPlayersInGame ?? 0) - 1 - (cycle ?? 0) + ((totalCycles ?? 0) - (cycleCount ?? 0)) * (Object.keys(userList ?? []).length - 1);
                    if (gameType == "weekly") {
                        if (timeLeft == 1) {
                            const daysLeft = (safeResetDay - currentDay + 7) % 7;
                            if (daysLeft == 1) {
                                setGameTimeLeft(`${daysLeft} day`)
                            } else {
                                setGameTimeLeft(`${daysLeft} days`)
                            }
                        } else {
                            setGameTimeLeft(`${timeLeft} weeks`)
                        }
                    } else if (gameType == "biweekly") {
                        if (timeLeft == 1) {
                            const firstResetDay = safeResetDay; // e.g., Sunday (0)
                            const secondResetDay = (safeResetDay + 3) % 7; // e.g., Wednesday (3 days after Sunday)
                            const currentHour = new Date().getHours();

                            // Define reset times (in 24-hour format)
                            const firstResetHour = 0;  // 12 AM
                            const secondResetHour = 12; // 12 PM

                            // Determine how far the next reset is
                            let daysUntilReset;
                            let resetHour;
                            // also in users.ts, getBiweekly stems
                            if (
                                (currentDay < secondResetDay && currentDay >= firstResetDay) ||
                                (secondResetDay < firstResetDay && (currentDay >= firstResetDay || currentDay < secondResetDay)) // Handles cases where second reset is earlier in the week
                            ) {
                                // The next reset is the second reset
                                daysUntilReset = (secondResetDay - currentDay + 7) % 7;
                                if (daysUntilReset == 1) {
                                    setGameTimeLeft(`${daysUntilReset} day`)
                                } else {
                                    setGameTimeLeft(`${daysUntilReset} days`)
                                }
                            } else if (currentDay === secondResetDay && currentHour < secondResetHour) {
                                resetHour = secondResetHour
                                const hoursLeft = resetHour - currentHour;
                                if (hoursLeft == 1) {
                                    setGameTimeLeft(`${hoursLeft} hour`)
                                } else {
                                    setGameTimeLeft(`${hoursLeft} hours`)
                                }
                            } else {
                                // The next reset is the first reset of the next cycle
                                daysUntilReset = (firstResetDay - currentDay + 7) % 7;
                                if (daysUntilReset == 1) {
                                    setGameTimeLeft(`${daysUntilReset} day`)
                                } else {
                                    setGameTimeLeft(`${daysUntilReset} days`)
                                }
                            }
                        } else {
                            setGameTimeLeft(`${timeLeft / 2} weeks`);
                        }
                    } else { // DAILY
                        if (timeLeft == 1) {
                            setGameTimeLeft(`${timeLeft} day`)
                        } else {
                            setGameTimeLeft(`${timeLeft} days`)
                        }
                    }

                    // If weekly, get # of days left in the week
                    if (resetDay !== undefined) {
                        if (gameType == "weekly") {
                            const today = new Date();
                            const currentDay = today.getDay();
                            if (currentDay === resetDay) {
                                setBetTimeLeft("7 days");
                            } else if (currentDay > resetDay) {
                                const daysLeft = 7 - (currentDay - resetDay);
                                setBetTimeLeft(`${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`);
                            } else {
                                const daysLeft = resetDay - currentDay;
                                setBetTimeLeft(`${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`);
                            }
                        } else if (gameType == "biweekly") {
                            console.log("biweekly -- setting days left for bet");
                            const firstResetDay = resetDay; // e.g., Sunday (0)
                            const secondResetDay = (resetDay + 3) % 7; // e.g., Wednesday (3 days after Sunday)
                            const currentHour = new Date().getHours();

                            // Define reset times (in 24-hour format)
                            const firstResetHour = 0;  // 12 AM
                            const secondResetHour = 12; // 12 PM

                            // Determine how far the next reset is
                            let daysUntilReset;
                            let resetHour;

                            if (
                                (currentDay < secondResetDay && currentDay >= firstResetDay) || 
                                (secondResetDay < firstResetDay && (currentDay >= firstResetDay || currentDay < secondResetDay)) // Handles cases where second reset is earlier in the week
                            ) {
                                // The next reset is the second reset
                                daysUntilReset = (secondResetDay - currentDay + 7) % 7;
                                if(daysUntilReset == 1){
                                    setBetTimeLeft(`${daysUntilReset} day`)
                                } else {
                                    setBetTimeLeft(`${daysUntilReset} days`)
                                }
                            } else if (currentDay === secondResetDay && currentHour < secondResetHour){
                                resetHour = secondResetHour
                                const hoursLeft = resetHour - currentHour;
                                if(hoursLeft == 1){
                                    setBetTimeLeft(`${hoursLeft} hour`)
                                } else {
                                    setBetTimeLeft(`${hoursLeft} hours`)
                                }
                            } else {
                                // The next reset is the first reset of the next cycle
                                daysUntilReset = (firstResetDay - currentDay + 7) % 7;
                                if(daysUntilReset == 1){
                                    setBetTimeLeft(`${daysUntilReset} day`)
                                } else {
                                    setBetTimeLeft(`${daysUntilReset} days`)
                                }
                                console.log("bet time left: ", betTimeLeft);
                            }
                        }
                    }

                    // Set the prop bet player
                    setFinishedPropBet(isFinishedPropBet);
                    if (isFinishedPropBet) {
                        const propBetInfo = await getPropBet(groupID, uid);
                        setCurrentPropBet(propBetInfo);
                    }
                    const propBetPlayerID = setPropBetPlayerLogic(userList ?? [], cycle ?? 0, cycleCount ?? 0);
                    const propBetPlayerInfo = groupUsersArray.find(user => user.id === propBetPlayerID);

                    console.log("propBetPlayerInfo:", propBetPlayerInfo);
                    console.log("propBetPlayerInfo average steps:", propBetPlayerInfo?.averageSteps);

                    const sum = (propBetPlayerInfo?.averageSteps ?? []).reduce((a, b) => a + b, 0);
                    const stepsLength = (propBetPlayerInfo?.averageSteps ?? []).length;
                    const averageStepCount: number = sum == 0 ? 0 : Number((sum / stepsLength).toFixed(0));
                    setPropBetPlayer([{ id: propBetPlayerID, name: propBetPlayerInfo?.name ?? '', averageStepCount: averageStepCount ?? 0 }]);

                    // So it opens up immediately if you haven't made a prop bet yet
                    if (!isFinishedPropBet && (gameType === 'weekly' || gameType === 'biweekly')) {
                        // Add a small delay to ensure other states are properly set
                        const timer = setTimeout(() => {
                            setPropBetModalVisible(true);
                        }, 100);
                        return () => clearTimeout(timer);
                    }

                    // Set up a listener for today's duels
                    console.log('starting duel listener!....');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = new Date(today);
                    const endDate = new Date(today);

                    if (gameType === 'daily') {
                        // Start date is today, end date is tomorrow
                        endDate.setDate(endDate.getDate() + 1);
                    } else if (gameType === 'biweekly') {
                        startDate.setDate(startDate.getDate() - 4);
                        endDate.setDate(endDate.getDate() + 1);
                    } else {
                        // Start date is 7 days ago
                        startDate.setDate(startDate.getDate() - 7);
                        endDate.setDate(endDate.getDate() + 1);
                    }

                    console.log("the test continues", startDate, endDate);

                    const duelsCollection = collection(groupDocRef, 'duels');
                    console.log("checkpoint four");
                    console.log("Firestore Query Parameters:");
                    console.log("gameType:", gameType);
                    console.log("cycleCount:", cycleCount);
                    console.log("cycle:", cycle);
                    console.log("startDate:", startDate, "endDate:", endDate);
                    console.log("duelsCollection:", duelsCollection);

                    const duelsQuery = query(duelsCollection,
                        where('cycleCount', '==', cycleCount),
                        where((gameType === 'weekly' || gameType === 'biweekly') ? 'cycleWeek' : 'cycleDay', '==', cycle),
                        where('createdAt', '>=', Timestamp.fromDate(startDate)),
                        where('createdAt', '<', Timestamp.fromDate(endDate))
                    );
                    console.log("checkpoint five");
                    console.log("duelsQuery", duelsQuery);

                    // Clean up previous duels listener if exists
                    if (unsubscribeFunctions.length > 0) {
                        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
                        unsubscribeFunctions.length = 0;
                    }

                    // New duels listener
                    const unsubscribeDuels = onSnapshot(duelsQuery, (duelsSnapshot) => {
                        setIsLoading(true);
                        const todaysDuels: { [key: string]: any } = {};
                        duelsSnapshot.forEach((duelDoc) => {
                            const duelData = duelDoc.data();
                            todaysDuels[duelDoc.id] = {
                                duelID: duelDoc.id,
                                player1: duelData.player1,
                                player2: duelData.player2,
                                bets: duelData.bets || []
                            };
                        });

                        const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } }) => {
                            return Object.values(duels);
                        };

                        const flattenedBets = flattenDuels(todaysDuels);

                        const currBets = flattenedBets.map((bet) => {
                            const player1 = users[bet.player1]?.username;
                            const player2 = users[bet.player2]?.username;
                            const player1Steps = users[bet.player1]?.newSteps;
                            const player2Steps = users[bet.player2]?.newSteps;
                            const player1Pfp = users[bet.player1]?.profilePic ?? 'default_image_url';
                            const player2Pfp = users[bet.player2]?.profilePic ?? 'default_image_url';

                            if (bet.bets[0]?.wager == null || (bet.bets.length === 0)) {
                                console.log("thisis running!!");
                                console.log(bet.bets.length);
                                return {
                                    duelID: bet.duelID,
                                    player1,
                                    player2,
                                    player1Pfp,
                                    player2Pfp,
                                    player1Bets: [],
                                    player2Bets: [],
                                    player1Steps,
                                    player2Steps,
                                };
                            } else {
                                const player1Bets = bet.bets
                                    .filter((b) => b.betOnUserID === bet.player1 && b.wager !== 0)
                                    .map((b) => ({
                                        user: users[b.userID]?.username,
                                        wager: b.wager,
                                    }));
                                const player2Bets = bet.bets
                                    .filter((b) => b.betOnUserID === bet.player2 && b.wager !== 0)
                                    .map((b) => ({
                                        user: users[b.userID]?.username,
                                        wager: b.wager,
                                    }));

                                return {
                                    duelID: bet.duelID,
                                    player1,
                                    player2,
                                    player1Pfp,
                                    player2Pfp,
                                    player1Bets,
                                    player2Bets,
                                    player1Steps,
                                    player2Steps,
                                };
                            }
                        });

                        // Update the currentGroups with the latest duels data
                        currentGroups[groupID] = {
                            ...currentGroups[groupID],
                            todaysDuels
                        };

                        console.log(`Duels for group ${groupID} updated`);
                        console.log('Updated currentGroups: ', currentGroups);
                        console.log('current Bets', currBets);
                        setCurrentBets(currBets);
                        setIsLoading(false);
                    });

                    unsubscribeFunctions.push(unsubscribeGroup, unsubscribeDuels);
                }
                setIsLoading(false);
            });

            // Grab news data (dont need onSnapshot)
            const newsDocRef = doc(groupDocRef, 'news');
            const lastLogin = groups[groupID]?.lastLogin;

        }
        return () => {
            unsubscribeFunctions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };
    };

    const createMemberButtonHandle = (id: string) => {
        router.push({
            pathname: '/(authenticated)/home/bets/publicProfile',
            params: {
                selectedUserIDTemp: id ?? '',
                groupIDTemp: groupID,
                averageStepsTemp: currentGroupUsersArray.find((user) => user.id === id)?.averageSteps ?? [],
                stepsTemp: currentGroupUsersArray.find((user) => user.id === id)?.todaysSteps ?? 0,
            },
        });
    };

    const handleRightArrowPress = () => {
        setIsDuelExpanded(false);
        if (currentBetIndex > 0) scrollToIndex(currentBetIndex - 1);
    };

    const handleLeftArrowPress = () => {
        setIsDuelExpanded(false);
        if (currentBetIndex < (currentBets.length - 1)) scrollToIndex(currentBetIndex + 1);
    };

    const truncateString = (str: string, maxLength: number) => {
        return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    };

    const scrollToIndex = (index: number) => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: index * screenWidth, animated: true });
        }
        setCurrentBetIndex(index);
    };

    const handleScroll = (event: any) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        setCurrentBetIndex(newIndex);
    };

    // if it hits 12:00 am, navigate to hometab
    useEffect(() => {
        const interval = setInterval(() => {
            const date = new Date();
            if (date.getHours() === 0 && date.getMinutes() === 0) {
                router.replace('/(authenticated)/home')
            }
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const getBetPlayerInfo = () => {
        const totalPlayer1Bets = currentBets[currentBetIndex]?.player1Bets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalPlayer2Bets = currentBets[currentBetIndex]?.player2Bets.reduce((sum, bet) => sum + bet.wager, 0);

        // Calculate the sum of all bets
        const totalBets = totalPlayer1Bets + totalPlayer2Bets;

        const player2Ratio = totalBets === 0 ? 0.5 : totalPlayer2Bets / totalBets;

        // Filter powerups for player1 and player2
        const player1Powerups = powerups
            .filter(([type, targetID, targetUserName, userID, duelID]) => {
                console.log(`Checking: ${duelID} === ${currentBets[currentBetIndex]?.duelID} && ${targetUserName} === ${currentBets[currentBetIndex]?.player1}`);
                return duelID === currentBets[currentBetIndex]?.duelID && targetUserName === currentBets[currentBetIndex]?.player1;
            });

        const player2Powerups = powerups.filter(([type, targetID, targetUserName, userID, duelID]) => {
            console.log(`Checking: ${duelID} === ${currentBets[currentBetIndex]?.duelID} && ${targetUserName} === ${currentBets[currentBetIndex]?.player2}`);
            return duelID === currentBets[currentBetIndex]?.duelID && targetUserName === currentBets[currentBetIndex]?.player2;
        });

        // Calculate added steps for secondWind powerups
        let player1AddedSteps = 0;
        let player2AddedSteps = 0;

        // Create modified versions of the powerups for display
        // Transform and modify powerups
        const modifiedPlayer1Powerups = player1Powerups.map(([type, targetID, targetUserName, userID, duelID]) => {
            if (type === "secondWind") player1AddedSteps += 200;
            if (type === "brickWall") player1AddedSteps -= 200;
            return {
                powerupType: type,
                targetUserID: targetID,
                targetUserName,
                powerupUserID: userID,
                duelID,
            };
        });

        const modifiedPlayer2Powerups = player2Powerups.map(([type, targetID, targetUserName, userID, duelID]) => {
            if (type === "secondWind") player2AddedSteps += 200;
            if (type === "brickWall") player2AddedSteps -= 200;
            return {
                powerupType: type === "secondWind" ? "Second Wind (+200 steps)" : type === "brickWall" ? "Brick Wall (-200 steps)" : type,
                targetUserID: targetID,
                targetUserName,
                powerupUserID: userID,
                duelID,
            };
        });

        // Updated step counts
        const player1TotalSteps = currentBets[currentBetIndex]?.player1Steps + player1AddedSteps;
        const player2TotalSteps = currentBets[currentBetIndex]?.player2Steps + player2AddedSteps;

        return { player1Steps: player1TotalSteps, player2Steps: player2TotalSteps, player2Ratio: player2Ratio, player1Powerups: modifiedPlayer1Powerups, player2Powerups: modifiedPlayer2Powerups };
    };

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <SafeAreaView style={styles.safeView} edges={['top']}>
                <View style={styles.container}>
                    {/* Header Section */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Image
                                source={require('@assets/icons/back.png')}
                                style={styles.backIcon}
                            />
                        </TouchableOpacity>
                        <View style={styles.rightIcons}>
                            <View>
                                <TouchableOpacity onPress={() => { setHistoryDropdownVisible(!isHistoryDropdownVisible); }}>
                                    <Image
                                        source={require('@assets/icons/history.png')}
                                        style={styles.historyIcon}
                                    />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => setStoreModalVisible(true)}>
                                <Image
                                    source={require('@assets/icons/store.png')}
                                    style={styles.storeIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.groupInfo}>
                        <TouchableOpacity onPress={() => setEditGroupModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={groups[groupID]?.groupImageUrl ?
                                    { uri: groups[groupID]?.groupImageUrl } :
                                    require('@components/blank-profile-picture.png')
                                }
                                style={styles.groupImage}
                            />
                        </TouchableOpacity>
                        <View style={styles.groupNameContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ position: 'relative' }}>
                                    <Text style={styles.groupName}>
                                        {(groups[groupID]?.groupName || 'Group Name').slice(0, maxNameLength)}
                                    </Text>
                                    {(groups[groupID]?.groupName?.length || 0) > maxNameLength && (
                                        <LinearGradient
                                            colors={['transparent', '#000']}  // Match your background color
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: 0,
                                                height: '100%',
                                                width: scale(40),
                                            }}
                                        />
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => setEditGroupModalVisible(true)} activeOpacity={0.8}>
                                    <Image
                                        source={require('@assets/icons/edit.png')}
                                        style={[styles.editIcon, (groups[groupID]?.groupName?.length || 0) > maxNameLength && { marginLeft: scale(-10), }]}
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                <Image
                                    source={require('@assets/icons/timeLeft.png')}
                                    style={styles.timeLeftIcon}
                                />
                                <Text style={styles.timeLeft}> {gameTimeLeft}</Text>
                                <Text style={styles.timeLeftText}> left in game</Text>
                                {groups[groupID]?.gameType === 'weekly' || groups[groupID]?.gameType === 'biweekly' && (
                                    <>
                                        <Text style={styles.timeLeftText}> | </Text>
                                        <Text style={styles.timeLeft}>{betTimeLeft}</Text>
                                        <Text style={styles.timeLeftText}> until next bet</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Stats Container */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(20), paddingTop: scale(15), }}>
                        <Text style={styles.sectionTitle}>Your Total Stats</Text>
                        {groups[groupID]?.gameType === 'weekly' || groups[groupID]?.gameType === 'biweekly' && (
                            <TouchableOpacity onPress={() => setPropBetModalVisible(true)}>
                                <Text style={styles.propBetButton}>Today's Prop Bet</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.statsContainer}>
                        <TouchableOpacity style={styles.statItem} onPress={() => setTokensModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={require('@assets/icons/tokens.png')}
                                style={styles.tokensIcon}
                            />
                            <Text style={styles.statValue}> {groups[groupID]?.userTokens}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItem} onPress={() => setTokensUsedModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={require('@assets/icons/betTokens.png')}
                                style={styles.betTokensIcon}
                            />
                            <Text style={styles.statValue}> {groups[groupID]?.todaysBetTokens}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItem} onPress={() => setDiamondsModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={require('@assets/icons/diamonds.png')}
                                style={styles.diamondsIcon}
                            />
                            <Text style={styles.statValue}> {groups[groupID]?.userDiamonds}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Live Duel Section */}
                    <View>
                        <Text style={[styles.sectionTitle, { paddingHorizontal: scale(20), paddingTop: scale(10), }]}>This Week's Live Duels</Text>
                        <View style={styles.duelRow}>
                            <LinearGradient
                                colors={['#74ff6db3', '#2fffe3b3']}
                                style={styles.duelCard}
                            >
                                <TouchableOpacity style={[styles.duelNavigation, { left: 0, }]} onPress={handleRightArrowPress}>
                                    <Image
                                        source={require('@assets/icons/leftArrow.png')}
                                        style={styles.arrowIcon}
                                    />
                                </TouchableOpacity>
                                <ScrollView
                                    ref={scrollViewRef}
                                    horizontal
                                    snapToInterval={screenWidth} // Snap to each card
                                    decelerationRate="fast"
                                    showsHorizontalScrollIndicator={false}
                                    onScroll={handleScroll}
                                >
                                    {currentBets.map((bets, index) => (

                                        <TouchableOpacity
                                            onPress={() => setLiveDuelModalVisible(true)}
                                            activeOpacity={1}
                                            style={[styles.duelCardTouchable, { width: screenWidth, }]}
                                        >

                                            {/* player 1 */}
                                            <View style={styles.playerInfo}>
                                                <Image
                                                    source={bets?.player1Pfp ?
                                                        { uri: bets?.player1Pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={[styles.playerImage, { borderColor: '#FF6060', }]}
                                                />
                                                <Text style={styles.playerName}>{truncateString(bets?.player1 ?? '', 13)}</Text>
                                                <Text style={styles.playerSteps}>{getBetPlayerInfo().player1Steps} steps</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                                    <Image
                                                        source={require('@assets/icons/tokensWhite.png')}
                                                        style={styles.tokensWhiteIcon}
                                                    />
                                                    <Text style={styles.playerTokens}> {bets?.player1Bets.reduce((sum, bet) => sum + bet.wager, 0)}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.duelInfo}>
                                                <View style={styles.liveContainer}>
                                                    <Text style={styles.liveTag}><Text style={{ color: 'green', }}>•</Text> LIVE</Text>
                                                </View>
                                                <Text style={styles.versus}>VS</Text>
                                                <Text style={styles.youBetText}>You've bet:</Text>
                                            </View>
                                            <View style={styles.playerInfo}>
                                                <Image
                                                    source={bets?.player2Pfp ?
                                                        { uri: bets?.player2Pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={[styles.playerImage, { borderColor: '#7464FF', }]}
                                                />
                                                <Text style={styles.playerName}>{truncateString(bets?.player2 ?? '', 13)}</Text>
                                                <Text style={styles.playerSteps}>{getBetPlayerInfo().player2Steps} steps</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                                    <Image
                                                        source={require('@assets/icons/tokensWhite.png')}
                                                        style={styles.tokensWhiteIcon}
                                                    />
                                                    <Text style={styles.playerTokens}> {bets?.player2Bets.reduce((sum, bet) => sum + bet.wager, 0)}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity style={[styles.duelNavigation, { right: 0, }]} onPress={handleLeftArrowPress}>
                                    <Image
                                        source={require('@assets/icons/rightArrow.png')}
                                        style={styles.arrowIcon}
                                    />
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                        <View style={styles.betAmount}>
                            <Image
                                source={require('@assets/icons/tokensBlack.png')}
                                style={[styles.tokensBlackIcon, { marginRight: scale(5), }]}
                            />
                            <Text style={styles.betText}>
                                {(() => {
                                    const userName = currentGroupUsersArray?.find(usr => usr.id === userID)?.name || "";
                                    const combinedBets = [
                                        ...(currentBets[currentBetIndex]?.player1Bets || []),
                                        ...(currentBets[currentBetIndex]?.player2Bets || []),
                                    ];
                                    const userBet = combinedBets.find(bet => bet.user === userName);
                                    return userBet?.wager || 0;
                                })()}
                            </Text>
                        </View>
                    </View>

                    {/* Leaderboard Section */}
                    <View style={styles.leaderboardContainer}>
                        <Text style={styles.sectionTitle}>Leaderboards</Text>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'Tokens' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => setSelectedTab('Tokens')}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'Tokens' ? '#74FF6D' : '#fff', }]}>Tokens</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'Steps' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => setSelectedTab('Steps')}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'Steps' ? '#74FF6D' : '#fff', }]}>Steps</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Line for showing selected tab */}
                        <View style={[{ borderBottomWidth: 1, borderBottomColor: '#74FF6D', width: '47%', top: -1, },
                        selectedTab === 'Steps' ?
                            { alignSelf: 'flex-end', right: scale(10) } :
                            { alignSelf: 'flex-start', left: scale(10), }]}
                        />
                        {selectedTab === 'Tokens' ? (
                            <View style={[styles.leaderboardStepsContainer, { paddingVertical: selectedTab === 'Tokens' ? moderateScale(5) : moderateScale(15), paddingBottom: moderateScale(40), }]}>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <View style={styles.leaderboardTop}>
                                        <TouchableOpacity style={styles.leaderboardTopStyles} onPress={() => createMemberButtonHandle(currentGroupUsersArray[1]?.id)} activeOpacity={0.8}>
                                            <Image
                                                source={currentGroupUsersArray[1]?.pfp ?
                                                    { uri: currentGroupUsersArray[1]?.pfp } :
                                                    require('@components/blank-profile-picture.png')
                                                }
                                                style={{ width: scale(37), height: scale(37), borderRadius: moderateScale(50), borderWidth: moderateScale(1.5), borderColor: '#fff', }}
                                            />
                                            <View style={styles.leaderboardTopCircle} >
                                                <Text style={{ fontFamily: 'Lexend', color: '#000', fontSize: moderateScale(9), }}>2</Text>
                                            </View>
                                            <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{truncateString(currentGroupUsersArray[1]?.name ?? '', 7)}</Text>
                                            <View style={styles.leaderboardTopTokens}>
                                                <Image
                                                    source={require('@assets/icons/tokensWhite.png')}
                                                    style={styles.tokensWhiteIcon}
                                                />
                                                <Text style={[styles.leaderboardTokensText, { color: '#BEFFBB', }]}> {currentGroupUsersArray[1]?.tokens}</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.leaderboardTopStyles, { marginTop: verticalScale(15), }]} onPress={() => createMemberButtonHandle(currentGroupUsersArray[0]?.id)} activeOpacity={0.8}>
                                            <View style={{
                                                shadowColor: '#51ba51',
                                                shadowOffset: { width: 0, height: 0 },
                                                shadowOpacity: 0.7,
                                                shadowRadius: moderateScale(7),
                                                elevation: 10,
                                            }}>
                                                <Image
                                                    source={currentGroupUsersArray[0]?.pfp ?
                                                        { uri: currentGroupUsersArray[0]?.pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={{ width: scale(51), height: scale(51), borderRadius: moderateScale(50), borderWidth: moderateScale(1.5), borderColor: '#fff', }}
                                                />
                                            </View>
                                            <View style={styles.leaderboardTopCircle} >
                                                <Text style={{ fontFamily: 'Lexend', color: '#000', fontSize: moderateScale(9), }}>1</Text>
                                            </View>
                                            <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{currentGroupUsersArray[0]?.name}</Text>
                                            <View style={styles.leaderboardTopTokens}>
                                                <Image
                                                    source={require('@assets/icons/tokensWhite.png')}
                                                    style={styles.tokensWhiteIcon}
                                                />
                                                <Text style={[styles.leaderboardTokensText, { color: '#BEFFBB', }]}> {currentGroupUsersArray[0]?.tokens}</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.leaderboardTopStyles} onPress={() => createMemberButtonHandle(currentGroupUsersArray[2]?.id)} activeOpacity={0.8}>
                                            <Image
                                                source={currentGroupUsersArray[2]?.pfp ?
                                                    { uri: currentGroupUsersArray[2]?.pfp } :
                                                    require('@components/blank-profile-picture.png')
                                                }
                                                style={{ width: scale(37), height: scale(37), borderRadius: moderateScale(50), borderWidth: moderateScale(1.5), borderColor: '#fff', }}
                                            />
                                            <View style={styles.leaderboardTopCircle} >
                                                <Text style={{ fontFamily: 'Lexend', color: '#000', fontSize: moderateScale(9), }}>3</Text>
                                            </View>
                                            <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{truncateString(currentGroupUsersArray[2]?.name ?? '', 7)}</Text>
                                            <View style={styles.leaderboardTopTokens}>
                                                <Image
                                                    source={require('@assets/icons/tokensWhite.png')}
                                                    style={styles.tokensWhiteIcon}
                                                />
                                                <Text style={[styles.leaderboardTokensText, { color: '#BEFFBB', }]}> {currentGroupUsersArray[2]?.tokens}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                    {currentGroupUsersArray.slice(3).map((user, index) => (
                                        <TouchableOpacity onPress={() => createMemberButtonHandle(user.id)} activeOpacity={0.8}>
                                            <View key={user.id} style={[styles.leaderboardTokensRow, user.id === userID ? { backgroundColor: '#4bff6c99', } : { backgroundColor: '#00000080', }]}>
                                                <Text style={[styles.leaderboardTokensNumberText, user.id === userID ? { color: '#fff', } : { color: '#a7a7a7', }]}>{index + 4}</Text>
                                                <Image
                                                    source={user.pfp ?
                                                        { uri: user.pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={[styles.leaderboardImage, { marginRight: scale(10), }]}
                                                />
                                                <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{user.name}</Text>
                                                <View style={styles.leaderboardTokensNumTokens}>
                                                    <Image
                                                        source={require('@assets/icons/tokensWhite.png')}
                                                        style={styles.tokensWhiteIcon}
                                                    />
                                                    <Text style={[styles.leaderboardTokensText, user.id === userID ? { color: '#fff', } : { color: '#BEFFBB', }]}> {user.tokens}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : (
                            <View style={[styles.leaderboard, { paddingVertical: selectedTab === 'Tokens' ? moderateScale(5) : moderateScale(15), }]}>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <View style={styles.grayLine} />
                                    {[...currentGroupUsersArray].sort((a, b) => (b.steps || 0) - (a.steps || 0)).map((user, index) => (
                                        <View key={user.id} style={styles.leaderboardRow}>
                                            <TouchableOpacity onPress={() => createMemberButtonHandle(user.id)}>
                                                <Image
                                                    source={user.pfp ?
                                                        { uri: user.pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={styles.leaderboardImage}
                                                />
                                            </TouchableOpacity>
                                            <View style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center'
                                            }}>
                                                <View
                                                    style={{
                                                        backgroundColor: user.id === userID ? '#fff' : '#4bff6c99',
                                                        width: `${((user.steps || 0) / Math.max(...currentGroupUsersArray.map(user => user.steps || 0))) * 80}%`,
                                                        height: scale(26),
                                                        borderTopRightRadius: moderateScale(5),
                                                        borderBottomRightRadius: moderateScale(5),
                                                    }}
                                                />
                                                <Text style={styles.leaderboardSteps}>
                                                    {user.steps}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                {/* ************************  MODALS  ********************** */}

                {isHistoryDropdownVisible && (
                    <TouchableOpacity
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => setHistoryDropdownVisible(false)} // Close dropdown when overlay is pressed
                    >
                        <View style={styles.dropdownMenu}>
                            <TouchableOpacity
                                onPress={() => {
                                    setHistoryDropdownVisible(false);
                                    router.push({
                                        pathname: '/(authenticated)/home/bets/GainsHistory',
                                        params: { groupIDTemp: groupID },
                                    });
                                }}
                            >
                                <Text style={styles.dropdownText}>Gains</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setHistoryDropdownVisible(false);
                                    router.push({
                                        pathname: '/(authenticated)/home/bets/BetsHistory',
                                        params: { groupIDTemp: groupID },
                                    });
                                }}
                            >
                                <Text style={styles.dropdownText}>Bets</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setHistoryDropdownVisible(false);
                                    router.push({
                                        pathname: '/(authenticated)/home/bets/RaceHistory',
                                        params: { groupIDTemp: groupID },
                                    });
                                }}
                            >
                                <Text style={styles.dropdownText}>Races</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Bet History Modal */}
                <Modal
                    transparent={true}
                    visible={isBetHistoryModalVisible}
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setBetHistoryModalVisible(false)}>
                                <Text style={styles.closeButtonText}>X</Text>
                            </TouchableOpacity>

                            {/* BetRecapPage as the modal content */}
                            {groups[groupID]?.gameType === "weekly"
                            || groups[groupID]?.gameType === 'biweekly' ? (
                                <WeeklyBetHistoryPage groupID={groupID} />
                            ) : (
                                <BetHistoryPage groupID={groupID} gameType={groups[groupID]?.gameType} />
                            )}

                        </View>
                    </View>
                </Modal>

                {/* Live Duel Modal */}
                <Modal
                    transparent={true}
                    visible={isLiveDuelModalVisible}
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.liveDuelModalContainer}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setLiveDuelModalVisible(false)} activeOpacity={1}>
                                <Image
                                    source={require('@assets/icons/x.png')}
                                    style={styles.closeButtonIcon}
                                />
                            </TouchableOpacity>
                            {/* LiveDuelPage as the modal content */}
                            <LiveDuelPage
                                betPlayerInfo={getBetPlayerInfo()}
                                bet={currentBets[currentBetIndex]}
                                currentGroupUsersArray={currentGroupUsersArray}
                                userID={userID}
                                groupID={groupID}
                                onNavigate={(id) => {
                                    setLiveDuelModalVisible(false);
                                    // Add small delay to ensure modal is closed before navigation
                                    setTimeout(() => {
                                        createMemberButtonHandle(id);
                                    }, 100);
                                }}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Store Modal */}
                <Modal
                    transparent={true}
                    visible={isStoreModalVisible}
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setStoreModalVisible(false)}>
                                <Text style={styles.closeButtonText}>X</Text>
                            </TouchableOpacity>

                            {/* StorePage as the modal content */}
                            <StorePage
                                groupID={groupID}
                                userDiamonds={groups[groupID]?.userDiamonds}
                                gameType={groups[groupID]?.gameType}
                                currentGroupUsersArray={currentGroupUsersArray}
                                setStoreModalVisible={setStoreModalVisible}
                            />
                        </View>
                    </View>
                </Modal>

                {/* News Modal */}
                <Modal
                    transparent={true}
                    visible={isNewsModalVisible}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.moneyModalContainer, { height: '41%', top: '30%' }]}>
                            {/* Close button */}
                            {finishedPropBet && (
                                <TouchableOpacity style={styles.closeButton} onPress={() => setNewsModalVisible(false)}>
                                    <Image
                                        source={require('@assets/icons/x.png')}
                                        style={styles.closeButtonIcon}
                                    />
                                </TouchableOpacity>
                            )}

                            <NewsPage
                                groupID={groupID}
                                userID={userID}
                                setNewsModalVisible={setNewsModalVisible}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Prop Bet Modal */}
                <Modal
                    transparent={true}
                    visible={isPropBetModalVisible}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.moneyModalContainer, { height: '41%', top: '30%' }]}>
                            {/* Close button */}
                            {finishedPropBet && (
                                <TouchableOpacity style={styles.closeButton} onPress={() => { setPropBetModalVisible(false); setSelectedPropBet(null); }}>
                                    <Image
                                        source={require('@assets/icons/x.png')}
                                        style={styles.closeButtonIcon}
                                    />
                                </TouchableOpacity>
                            )}

                            <PropBetPage
                                groupID={groupID}
                                userID={userID}
                                propBetPlayer={propBetPlayer}
                                finishedPropBet={finishedPropBet}
                                currentPropBet={currentPropBet}
                                overUnder={setSelectedPropBet}
                                setFinishedPropBet={setFinishedPropBet}
                                setPropBetModalVisible={setPropBetModalVisible}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Edit Group Modal */}
                <Modal
                    transparent={true}
                    visible={isEditGroupModalVisible}
                    animationType="slide"
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setEditGroupModalVisible(false)} // Close dropdown when overlay is pressed
                    />
                        <View style={styles.editGroupModalContainer}>
                            <EditGroupPage
                                groupID={groupID}
                                setEditGroupModalVisible={setEditGroupModalVisible}
                                onNavigate={(id) => {
                                    setEditGroupModalVisible(false);
                                    // Add small delay to ensure modal is closed before navigation
                                    setTimeout(() => {
                                        createMemberButtonHandle(id);
                                    }, 100);
                                }}
                            />
                        </View>
                </Modal>

                {/* Info Modals */}
                <Modal
                    transparent={true}
                    visible={isTokensModalVisible}
                    animationType="fade"
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setTokensModalVisible(false)} // Close dropdown when overlay is pressed
                    />
                        <View style={[styles.moneyModalContainer, { height: '25%', top: '37%' }]}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setTokensModalVisible(false)}>
                                <Image
                                    source={require('@assets/icons/x.png')}
                                    style={styles.closeButtonIcon}
                                />
                            </TouchableOpacity>
                            <View style={styles.infoModalContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={styles.tokenText}>Here are your total tokens. You can earn more by winning your bets or the weekly race!{"\n\n"}The person with the most tokens at the end of your game wins!</Text>
                                </View>
                            </View>
                        </View>
                </Modal>
                <Modal
                    transparent={true}
                    visible={isTokensUsedModalVisible}
                    animationType="fade"
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setTokensUsedModalVisible(false)} // Close dropdown when overlay is pressed
                    />
                        <View style={[styles.moneyModalContainer, { height: '13%', top: '44%' }]}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setTokensUsedModalVisible(false)}>
                                <Image
                                    source={require('@assets/icons/x.png')}
                                    style={styles.closeButtonIcon}
                                />
                            </TouchableOpacity>
                            <View style={styles.infoModalContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={styles.tokenText}>Here are the tokens you've bet this week.</Text>
                                </View>
                            </View>
                        </View>
                </Modal>
                <Modal
                    transparent={true}
                    visible={isDiamondsModalVisible}
                    animationType="fade"
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setDiamondsModalVisible(false)} // Close dropdown when overlay is pressed
                    />
                        <View style={[styles.moneyModalContainer, { height: '20%', top: '40%' }]}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setDiamondsModalVisible(false)}>
                                <Image
                                    source={require('@assets/icons/x.png')}
                                    style={styles.closeButtonIcon}
                                />
                            </TouchableOpacity>
                            <View style={styles.infoModalContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={styles.tokenText}>Here are your diamonds. You gain one diamond for every daily prop-bet that you win. Use them in the power-ups store.</Text>
                                </View>
                            </View>
                        </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    safeView: {
        flex: 1,
    },
    container: {
        flex: 1,
        height: '100%',
    },
    infoModalContainer: {
        padding: moderateScale(30),
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        marginBottom: verticalScale(5),
    },
    rightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    backIcon: {
        width: scale(19),
        height: scale(19),
    },
    historyIcon: {
        width: scale(27),
        height: scale(27),
    },
    dropdownOverlay: {
        position: 'absolute',
        flex: 1,
        top: verticalScale(60),
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent dark background
    },
    dropdownMenu: {
        position: 'absolute',
        top: verticalScale(20),
        right: scale(50),
        width: scale(100),
        backgroundColor: '#000',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: scale(0), height: verticalScale(2) },
        shadowOpacity: 0.2,
        shadowRadius: moderateScale(4),
        elevation: moderateScale(5),
    },
    dropdownText: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: moderateScale(16),
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(10),
    },
    storeIcon: {
        width: scale(21),
        height: scale(21),
    },
    propBetButton: {
        fontFamily: 'Lexend',
        fontSize: 11,
        color: '#74FF6D',
    },
    groupInfo: {
        flexDirection: 'row',
        paddingHorizontal: scale(20),
        alignItems: 'center',
    },
    groupImage: {
        width: scale(70),
        height: scale(70),
        borderRadius: moderateScale(35),
        borderWidth: 2,
        borderColor: '#74FF6D',
    },
    groupNameContainer: {
        marginLeft: scale(20),
        justifyContent: 'center',
    },
    groupName: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: moderateScale(28),
        marginRight: scale(5),
    },
    editIcon: {
        width: scale(16),
        height: scale(16),
    },
    timeLeftIcon: {
        width: scale(13),
        height: scale(13),
    },
    timeLeft: {
        color: '#74FF6D',
        fontFamily: 'Lexend',
        fontSize: moderateScale(11),
    },
    timeLeftText: {
        fontFamily: 'Lexend',
        fontSize: moderateScale(11),
        color: '#fff',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#65656580',
        paddingHorizontal: scale(20),
        borderRadius: moderateScale(15),
        padding: moderateScale(10),
        marginHorizontal: scale(20),
        marginBottom: verticalScale(5),
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000080',
        borderRadius: moderateScale(15),
        padding: moderateScale(10),
        width: '30%',
    },
    statValue: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: moderateScale(13),
    },
    tokensIcon: {
        width: scale(16),
        height: scale(16),
    },
    betTokensIcon: {
        width: scale(15),
        height: scale(15),
    },
    diamondsIcon: {
        width: scale(14),
        height: scale(12),
    },
    sectionTitle: {
        color: '#fff',
        fontSize: moderateScale(16),
        fontFamily: 'Lexend',
        marginBottom: verticalScale(5),
    },
    duelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(20),
    },
    duelCardTouchable: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: verticalScale(10),
    },
    duelCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: moderateScale(15),
        padding: moderateScale(20),
    },
    duelNavigation: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '15%', // Adjust this value to control the width of the clickable area
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1
    },
    arrowIcon: {
        width: scale(15),
        height: scale(15),
    },
    playerInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '38%',
    },
    playerImage: {
        width: scale(50),
        height: scale(50),
        borderRadius: moderateScale(25),
        borderWidth: moderateScale(2),
    },
    playerName: {
        color: '#fff',
        fontSize: moderateScale(14),
        fontFamily: 'Lexend-Bold',
        marginVertical: verticalScale(5),
    },
    playerSteps: {
        color: '#BEFFBB',
        fontSize: moderateScale(11),
        fontFamily: 'Lexend',
    },
    tokensWhiteIcon: {
        width: scale(10),
        height: scale(10),
    },
    playerTokens: {
        color: '#BEFFBB',
        fontSize: moderateScale(11),
    },
    duelInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(10),
        width: '20%',
    },
    liveContainer: {
        position: 'absolute',
        top: verticalScale(-30),
        padding: moderateScale(5),
        backgroundColor: '#fff',
        borderRadius: moderateScale(20),
        marginTop: verticalScale(5),
    },
    liveTag: {
        color: '#000',
        fontSize: moderateScale(12),
        fontWeight: 'bold',
        textAlign: 'center',
    },
    versus: {
        color: '#fff',
        fontFamily: 'Lexend-Bold',
        fontSize: moderateScale(28),
    },
    youBetText: {
        position: 'absolute',
        bottom: verticalScale(-30),
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: moderateScale(11),
    },
    betAmount: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        bottom: verticalScale(-20),
        alignSelf: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(20),
    },
    tokensBlackIcon: {
        width: scale(15),
        height: scale(14.3),
    },
    betText: {
        color: '#000',
        fontSize: moderateScale(15),
        fontFamily: 'Lexend',
    },
    leaderboardContainer: {
        flex: 1,
        padding: moderateScale(20),
        // marginTop: verticalScale(10),
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#65656580',
        borderRadius: moderateScale(10),
    },
    tab: {
        flex: 1,
        padding: moderateScale(10),
        alignItems: 'center',
        borderRadius: moderateScale(15),
    },
    tabText: {
        color: '#fff',
        fontSize: moderateScale(13),
        fontFamily: 'Lexend',
    },
    leaderboard: {
        flex: 1,
        backgroundColor: '#65656580',
        borderRadius: moderateScale(20),
        paddingHorizontal: moderateScale(10),
        marginTop: verticalScale(8),
    },
    leaderboardStepsContainer: {
        // flex: 1,
        backgroundColor: '#65656580',
        paddingHorizontal: moderateScale(10),
        marginTop: verticalScale(8),
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
    },
    grayLine: {
        position: 'absolute',
        left: scale(36),
        width: scale(1.5),
        height: '100%',
        backgroundColor: '#fff',
        zIndex: 1,
    },
    leaderboardTop: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: verticalScale(15),
    },
    leaderboardTopStyles: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: scale(20),
    },
    leaderboardTopCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(-7),
        marginBottom: verticalScale(5),
        width: scale(17),
        height: scale(17),
        borderRadius: moderateScale(9),
        backgroundColor: '#74FF6D',
    },
    leaderboardTopTokens: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leaderboardTokensRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(5),
        padding: moderateScale(10),
        borderRadius: moderateScale(10),
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(10),
    },
    leaderboardTokensText: {
        fontFamily: 'Lexend',
        fontSize: moderateScale(11),
    },
    leaderboardTokensNumberText: {
        fontFamily: 'Lexend',
        fontSize: moderateScale(11),
        marginHorizontal: scale(10),
    },
    leaderboardTokensNumTokens: {
        flexDirection: 'row',
        alignItems: 'center',
        // align to right
        position: 'absolute',
        right: scale(15),
    },
    leaderboardImage: {
        width: scale(26),
        height: scale(26),
        borderRadius: moderateScale(15),
        marginRight: scale(10),
        borderWidth: moderateScale(1.5),
        borderColor: '#fff',
    },
    leaderboardSteps: {
        color: '#fff',
        fontSize: moderateScale(11),
        fontFamily: 'Lexend',
        marginLeft: scale(10),
    },
    tokenText: {
        fontFamily: 'Lexend',
        fontSize: moderateScale(15),
        color: 'white',
    },
    // MODAL
    modalOverlay: {
        // flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
        width: '90%',
        height: '90%',
        backgroundColor: 'white',
        borderRadius: moderateScale(10),
        padding: moderateScale(20),
        position: 'relative',
    },
    liveDuelModalContainer: {
        width: '90%',
        height: '80%',
        backgroundColor: 'black',
        position: 'relative',
        borderWidth: moderateScale(1),
        borderColor: '#4A4A4A',
        borderRadius: moderateScale(15),
    },
    moneyModalContainer: {
        position: 'absolute',
        left: '5%',
        width: '90%',
        backgroundColor: 'black',
        borderWidth: moderateScale(1),
        borderColor: '#4A4A4A',
        borderRadius: moderateScale(15),
        zIndex: 1,
    },
    editGroupModalContainer: {
        height: '88%',
        width: Dimensions.get('window').width + 2,
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#000',
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        borderWidth: moderateScale(1),
        borderBottomWidth: 0, // No border on the bottom
        borderColor: '#fff',
    },
    closeButton: {
        position: 'absolute',
        top: verticalScale(10),
        right: scale(10),
        zIndex: 1,
    },
    closeButtonText: {
        fontSize: moderateScale(18),
        fontWeight: 'bold',
        color: 'black',
    },
    closeButtonIcon: {
        width: scale(20),
        height: scale(20),
    },
});

export default BetSummaryPage;