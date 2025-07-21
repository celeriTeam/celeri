import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../UserProvider';
import { StyleSheet } from 'react-native-size-scaling';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { app } from "@firebaseConfig";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TextInput } from 'react-native-gesture-handler';
import { create1v1Request, update1v1Requests } from '@/backend/src/1v1Requests';
import UserSearchPage from './UserSearch';
import Store1v1Page from './Store';
import { create1v1 } from '@/backend/src/1v1';
import { setIsIn1v1 } from '@/backend/src/users';
import { LineChart } from 'react-native-chart-kit';
import History1v1s from './History1v1s';
import { getFunctions, httpsCallable } from 'firebase/functions';

dayjs.extend(relativeTime);

const db = getFirestore(app);

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type Props = {
    current1v1: any;
    setCurrent1v1: (val: any) => void;
    history1v1s: any[];
    receivedChallengeRequests: any[];
    sentChallengeRequests: any[];
};

const SoloTab: React.FC<Props> = ({
    current1v1,
    setCurrent1v1,
    history1v1s,
    receivedChallengeRequests,
    sentChallengeRequests
}) => {
    const { userID, username } = useUser();
    const [selectedTab, setSelectedTab] = useState('Received');
    const [storeModal, setStoreModal] = useState(false);
    const [historyModal, setHistoryModal] = useState(false);
    const [userSearchModal, setUserSearchModal] = useState(false);
    const [requestModalVisible, setRequestModalVisible] = useState<any>({});
    const [timeLeftString, setTimeLeftString] = useState<string>('00:00:00');
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });
    const userSteps = (current1v1 ? current1v1.progress[userID]?.['24'] || 0 : 0);
    const opponentSteps = (current1v1 ? current1v1.progress[current1v1.participants.find((id: string) => id !== userID)]?.['24'] || 0 : 0);
        
    const formatRelativeTime = (timestamp: Date): string => {
        const now = dayjs();
        const then = dayjs(timestamp);

        // console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
        // console.log(`User's last login time: ${then.format('YYYY-MM-DD HH:mm:ss')}`);

        const diffMinutes = now.diff(then, 'minute');
        const diffHours = now.diff(then, 'hour');
        const diffDays = now.diff(then, 'day');
        const diffMonths = now.diff(then, 'month');

        // console.log(`Time difference: ${diffMinutes} minutes, ${diffHours} hours, ${diffDays} days, ${diffMonths} months`);

        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return `over ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    };

    const handleRequestClick = (request: any) => () => {
        setRequestModalVisible(request);
        console.log('Request clicked:', request);
    };
    
    const handleRequestAccept = async (request: any) => {
        const request1v1ID = request?.requestID;
        if (!request1v1ID) {
            return;
        }
        console.log('request1v1ID: ', request?.requestID);
        setRequestModalVisible({});

        try {
            const new1v1Data = await create1v1(request?.requestID);
            await update1v1Requests(userID, request?.requestID, new1v1Data.current1v1ID);
            await setIsIn1v1(request?.senderID, true);
            await setIsIn1v1(request?.receiverID, true);

            const functions = getFunctions();
            const notifyStart = httpsCallable(functions, 'send1v1StartedNotification');
            await notifyStart({ opponentID: request.senderID, opponentName: username });
            // setCurrent1v1(new1v1Data);
        } catch (error) {
            console.error('Error accepting request:', error);
            Alert.alert('Error', 'Failed to accept the challenge request. Please try again.');
        }
    };

    const countdownTimer = () => {
        if (!current1v1) {
            setTimeLeftString('00:00:00');
            return;
        }

        const endTime = current1v1.endTime.toDate();
        const now = new Date();
        const timeLeft = endTime.getTime() - now.getTime();

        if (timeLeft <= 0) {
            setTimeLeftString('00:00:00');
            return;
        }

        const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        setTimeLeftString(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    useEffect(() => {
        countdownTimer(); // run immediately on mount
        const interval = setInterval(countdownTimer, 1000); // update every second

        return () => clearInterval(interval); // cleanup on unmount
    }, [current1v1]);

    const getHoursLeft = () => {
        const [hours, minutes, seconds] = timeLeftString.split(":").map(Number);
        return hours + minutes / 60 + seconds / 3600;
    };

    const StepsChart = () => {
        if (!current1v1) {
            return null;
        }

        const getFilledIntervals = () => {
            const hoursPassed = 24 - getHoursLeft() + 4;

            const intervals = [0, 4, 8, 12, 16, 20, 24];
            return intervals.filter(interval => hoursPassed >= interval);
        };

        const filledIntervals = getFilledIntervals(); // e.g., [4, 8]

        const labels = ["0", "4h", "8h", "12h", "16h", "20h", "24h"];

        const opponentID = current1v1.participants.find((id: string) => id !== userID);

        const getStepsArray = (userId: string) => {
            const progress = current1v1.progress[userId] || {};
            return [0, 4, 8, 12, 16, 20, 24]
                .filter(hour => filledIntervals.includes(hour))
                .map(hour => progress[hour.toString()] || 0);
        };

        const userSteps = getStepsArray(userID);
        const opponentSteps = getStepsArray(opponentID);

        const data = {
            labels: [...labels.slice(0, filledIntervals.length - 1), 'now'],
            datasets: [
                {
                    data: userSteps,
                    color: () => "#FF6060",
                    strokeWidth: 2,
                },
                {
                    data: opponentSteps,
                    color: () => "#7464FF",
                    strokeWidth: 2,
                }
            ]
        };

        return (
            <LineChart
                data={data}
                width={width - 40}
                height={verticalScale(240)}
                fromZero
                withVerticalLabels
                withDots
                withInnerLines
                yAxisInterval={1}
                chartConfig={{
                    backgroundColor: 'rgba(2, 68, 5, 1)',
                    backgroundGradientFrom: 'rgba(2, 68, 5, 1)',
                    backgroundGradientTo: 'rgba(2, 68, 5, 1)',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(81, 186, 81, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: "#fff",
                    },
                    propsForBackgroundLines: {
                        strokeWidth: 1,
                        stroke: "rgba(255,255,255,0.1)",
                    },
                    propsForLabels: {
                        fontFamily: "Lexend",
                        fontSize: 11,
                    },
                    style: {
                        borderRadius: 16,
                    }
                }}
                style={{
                    marginVertical: 8,
                    borderRadius: 16,
                    paddingTop: 20,
                    paddingBottom: 5,
                    backgroundColor: 'rgba(2, 68, 5, 1)',
                }}
                decorator={() => {
                    return tooltipPos.visible ? (
                        <View style={{
                            position: 'absolute',
                            left: tooltipPos.x - 20,
                            top: tooltipPos.y - 25,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            padding: 5,
                            borderRadius: 5
                        }}>
                            <Text style={{ fontFamily: 'Lexend', fontSize: 16, color: '#fff', includeFontPadding: false }}>
                                {tooltipPos.value}
                            </Text>
                        </View>
                    ) : null;
                }}
                onDataPointClick={({ x, y, value }) => {
                    setTooltipPos({
                        x: x,
                        y: y,
                        value: value,
                        visible: true
                    });
                }}
            />
        );
    };

    return (
        <>
            <View style={styles.row}>
                {current1v1 && (
                    <TouchableOpacity onPress={() => setStoreModal(true)}>
                        <Image
                            source={require('@assets/icons/store.png')}
                            style={styles.storeIcon}
                        />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setHistoryModal(true)}>
                    <Image
                        source={require('@assets/icons/history.png')}
                        style={styles.historyIcon}
                    />
                </TouchableOpacity>
                <Image
                    source={require('@assets/icons/trophy.png')}
                    style={styles.trophyIcon}
                />
            </View>
            {current1v1 ? (
                <>
                    <View style={styles.row}>
                        <View style={styles.playerInfo}>
                            <Image
                                source={current1v1?.userInfo?.currentUserPfp ?
                                    { uri: current1v1?.userInfo?.currentUserPfp } :
                                    require('@components/blank-profile-picture.png')
                                }
                                style={[styles.playerImage, { borderColor: '#FF6060', }]}
                            />
                            <Text style={styles.playerName}>You</Text>
                            <Text style={styles.playerSteps}>{userSteps} steps</Text>
                        </View>
                        <View style={styles.duelInfo}>
                            <View style={styles.liveContainer}>
                                <Text style={styles.liveTag}><Text style={{ color: 'green', }}>•</Text> LIVE</Text>
                            </View>
                            <Text style={styles.versus}>VS</Text>
                        </View>
                        <View style={styles.playerInfo}>
                            <Image
                                source={current1v1?.userInfo?.opponentPfp ?
                                    { uri: current1v1?.userInfo?.opponentPfp } :
                                    require('@components/blank-profile-picture.png')
                                }
                                style={[styles.playerImage, { borderColor: '#7464FF', }]}
                            />
                            <Text style={styles.playerName}>{current1v1?.userInfo?.opponentUsername}</Text>
                            <Text style={styles.playerSteps}>{userSteps} steps</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={styles.countdownTimer}>{timeLeftString}</Text>
                    </View>
                    <View>{StepsChart()}</View>
                </>
            ) : (
                <>
                    <Image
                        source={require('@assets/icons/magnify.png')}
                        style={styles.magifyIcon}
                    />
                    <Text style={styles.noMatchText}>No match in progress.</Text>
                    <TouchableOpacity style={styles.challengeButton} onPress={() => setUserSearchModal(true)}>
                        <Text style={styles.challengeText}>Challenge a friend</Text>
                    </TouchableOpacity>
                    {/* <TouchableOpacity style={styles.randomButton} onPress={() => setComingSoonModal(true)}>
                        <Text style={styles.randomText}>Find Random Match</Text>
                    </TouchableOpacity> */}
                    {/* challenge requests */}
                    <Text style={styles.requestsTitle}>Challenge Requests</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, { borderBottomColor: selectedTab === 'Received' ? '#74FF6D' : 'transparent', }]}
                            onPress={() => setSelectedTab('Received')}
                            activeOpacity={1}
                        >
                            <Text style={[styles.tabText, { color: selectedTab === 'Received' ? '#74FF6D' : '#fff', }]}>Received</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, { borderBottomColor: selectedTab === 'Sent' ? '#74FF6D' : 'transparent', }]}
                            onPress={() => setSelectedTab('Sent')}
                            activeOpacity={1}
                        >
                            <Text style={[styles.tabText, { color: selectedTab === 'Sent' ? '#74FF6D' : '#fff', }]}>Sent</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Line for showing selected tab */}
                    <View style={[{ borderBottomWidth: 1, borderBottomColor: '#74FF6D', width: '47%', top: -1, },
                    selectedTab === 'Sent' ?
                        { alignSelf: 'flex-end', right: scale(10) } :
                        { alignSelf: 'flex-start', left: scale(10), }]}
                    />
                    <View style={styles.requestsContainer}>
                        {selectedTab === 'Received' ? (
                            <ScrollView>
                                {receivedChallengeRequests.length > 0 ? (
                                    receivedChallengeRequests.map((request) => (
                                        <TouchableOpacity 
                                            key={request.requestID}
                                            style={[styles.memberInfo, { backgroundColor: request.status === 'pending' ? '#00000080' : '#00000050' }]}
                                            onPress={request.status === 'pending' ? handleRequestClick(request) : undefined}
                                            activeOpacity={request.status === 'pending' ? 0.7 : 1}
                                        >
                                            <Image
                                                source={
                                                    request.senderPfp ?
                                                        { uri: request?.senderPfp }
                                                        : require('@components/blank-profile-picture.png')
                                                }
                                                style={styles.profilePic}
                                            />
                                            <View>
                                                <View style={styles.memberRow}>
                                                    <Text style={styles.memberName}>{request?.senderName}</Text>
                                                    <Text style={styles.memberCreatedAt}>{formatRelativeTime(request?.createdAt)}</Text>
                                                </View>
                                                <Text style={styles.memberUserName}>@{request?.senderUsername}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noMatchText}>No received challenge requests.</Text>
                                )}
                            </ScrollView>
                        ) : (
                            <ScrollView>
                                {sentChallengeRequests.length > 0 ? (
                                    sentChallengeRequests.map((request) => (
                                        <View key={request.requestID} style={styles.memberInfo}>
                                            <Image
                                                source={
                                                    request.receiverPfp ?
                                                        { uri: request?.receiverPfp }
                                                        : require('@components/blank-profile-picture.png')
                                                }
                                                style={styles.profilePic}
                                            />
                                            <View>
                                                <View style={styles.memberRow}>
                                                    <Text style={styles.memberName}>{request?.receiverName}</Text>
                                                    <Text style={styles.memberCreatedAt}>{formatRelativeTime(request?.createdAt)}</Text>
                                                </View>
                                                <Text style={styles.memberUserName}>@{request?.receiverUsername}</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noMatchText}>No sent challenge requests.</Text>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </>
            )}
            
            {/* History modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={historyModal}
                onRequestClose={() => setHistoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { height: '80%', }]}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setHistoryModal(false)}>
                            <Image
                                source={require('@assets/icons/x.png')}
                                style={styles.closeButtonIcon}
                            />
                        </TouchableOpacity>
                        {history1v1s.length > 0 ? (
                            <History1v1s 
                                history1v1s={history1v1s}
                                setHistoryModal={setHistoryModal}
                            />
                        ) : (
                            <Text style={styles.noMatchText}>No match history found.</Text>
                        )}
                    </View>
                </View>
            </Modal>
            
            {/* Store modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={storeModal}
                onRequestClose={() => setStoreModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setStoreModal(false)} // Close dropdown when overlay is pressed
                >
                    <View style={[styles.modalContainer, { height: '80%', }]}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setStoreModal(false)}>
                            <Image
                                source={require('@assets/icons/x.png')}
                                style={styles.closeButtonIcon}
                            />
                        </TouchableOpacity>
                        {/* <Store1v1Page
                            userDiamonds={3}
                            setStoreModalVisible={setStoreModal}
                        /> */}
                        <Text style={styles.modalContent}>Coming Soon.</Text>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* User Search modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={userSearchModal}
                onRequestClose={() => setUserSearchModal(false)}
            >
                <View style={styles.modalOverlay} >
                    <View style={[styles.modalContainer, { height: '80%', }]}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setUserSearchModal(false)}>
                            <Image
                                source={require('@assets/icons/x.png')}
                                style={styles.closeButtonIcon}
                            />
                        </TouchableOpacity>
                        <UserSearchPage
                            setUserSearchModalVisible={setUserSearchModal}
                        />
                    </View>
                </View>
            </Modal>

            {/* Request modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={requestModalVisible?.requestID !== undefined}
                onRequestClose={() => setRequestModalVisible({})}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setRequestModalVisible({})} // Close dropdown when overlay is pressed
                >
                    <View style={[styles.modalContainer, { height: '20%', }]}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={styles.buttonText}>Do you want to accept {requestModalVisible?.senderUsername}'s request?</Text>
                            <View style={{  flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingTop: 5, }}>
                                <TouchableOpacity 
                                    style={[styles.requestButton, { backgroundColor: '#fff' }]} 
                                    onPress={() => setRequestModalVisible({})} 
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.buttonText, { color: '#000' }]}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.requestButton, { backgroundColor: '#1976d2' }]} 
                                    onPress={() => handleRequestAccept(requestModalVisible)} 
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.buttonText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '98%',
        gap: 5,
        margin: 20,
    },
    storeIcon: {
        width: 21,
        height: 21,
    },
    historyIcon: {
        width: 27,
        height: 27,
    },
    trophyIcon: {
        width: 21,
        height: 21,
    },
    magifyIcon: {
        width: 86,
        height: 86,
        alignSelf: 'center',
        marginVertical: 40,
    },
    noMatchText: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 13,
    },
    challengeButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#74FF6D',
        borderRadius: 20,
        marginVertical: 20,
    },
    challengeText: {
        fontFamily: 'Lexend',
        color: '#74FF6D',
        fontSize: 13,
        padding: 10,
    },
    requestsTitle: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 16,
        paddingLeft: 10,
        // paddingTop: 10,
        textAlign: "left",
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    requestsContainer: {
        flex: 1,
        backgroundColor: '#5BE35C33',
        justifyContent: 'center',
        width: '100%',
        height: '15%',
        marginVertical: 10,
        marginBottom: 20,
        borderRadius: 15,
        padding: 10,
        paddingLeft: 20,
    },
    memberInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        
        padding: 10,
        paddingLeft: 20,
        paddingRight: 5,
        backgroundColor: '#00000080',
        marginVertical: 3,
        borderRadius: 10,
        alignItems: 'center',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '92%',
    },
    profilePic: {
        width: 26,
        height: 26,
        borderRadius: 20,
        borderColor: '#fff',
        borderWidth: 1,
    },
    memberName: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#fff',
        marginLeft: 10,
    },
    memberUserName: {
        fontFamily: "Lexend",
        fontSize: 8,
        color: '#74FF6D',
        marginLeft: 10,
    },
    memberCreatedAt: {
        fontFamily: "Lexend",
        fontSize: 8,
        color: '#ffffffaa',
    },
    randomButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 30,
    },
    randomText: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 13,
        padding: 10,
    },
    
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#65656580',
        borderRadius: 10,
    },
    tab: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 15,
    },
    tabText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    modalContent: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 20,
        margin: 20,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'black',
        position: 'relative',
        borderWidth: moderateScale(1),
        borderColor: '#4A4A4A',
        borderRadius: moderateScale(15),
    },
    modalCloseButton: {
        position: 'absolute',
        top: verticalScale(10),
        right: scale(10),
        zIndex: 1,
    },
    buttonText: {
        textAlign: "center",
        fontSize: 15,
        color: '#fff',
        fontFamily: 'Lexend',
    },
    spaceAboveButton: {
        marginTop: 30,
    },
    requestButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30, // Oval shape
        marginVertical: 10,
        width: '48%',  
    },
    closeButtonIcon: {
        width: scale(20),
        height: scale(20),
    },
    playerInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '38%',
    },
    playerImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
    },
    playerName: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Lexend-Bold',
        marginTop: 5,
    },
    playerSteps: {
        color: '#ffffff80',
        fontSize: 11,
        fontFamily: 'Lexend',
    },
    duelInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        width: '20%',
    },
    liveContainer: {
        position: 'absolute',
        top: -30,
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
        marginTop: 5,
    },
    liveTag: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    versus: {
        color: '#fff',
        fontFamily: 'Lexend-Bold',
        fontSize: 28,
    },
    countdownTimer: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 60,
        textAlign: 'center',
        // marginTop: 10,
    },
});

export default SoloTab;