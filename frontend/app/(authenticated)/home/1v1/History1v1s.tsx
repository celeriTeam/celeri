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
    history1v1s: any[];
    setHistoryModal: (val: any) => void;
};

const History1v1sPage: React.FC<Props> = ({ history1v1s, setHistoryModal }) => {
    const { userID } = useUser();
    const opponentID = history1v1s[0]?.participants.find((id: string) => id !== userID);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });

    const StepsChart = ({ current1v1 }: { current1v1: any }) => {
        const labels = ["0", "4h", "8h", "12h", "16h", "20h", "24h"];

        const opponentID = current1v1.participants.find((id: string) => id !== userID);

        const getStepsArray = (userId: string) => {
            const progress = current1v1.progress[userId] || {};
            return [0, 4, 8, 12, 16, 20, 24]
                .map(hour => progress[hour.toString()] || 0);
        };

        const userSteps = getStepsArray(userID);
        const opponentSteps = getStepsArray(opponentID);

        const data = {
            labels: labels.slice(0, 7),
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
        <FlatList
            data={history1v1s.sort((a, b) => b.endTime.toDate().getTime() - a.endTime.toDate().getTime())}
            keyExtractor={(item) => item.duelID}
            renderItem={({ item }) => (
                <View>
                    <TouchableHighlight
                        onPress={() => {
                            setIsExpanded(!isExpanded);
                            setHistoryModal(false);
                        }}
                        underlayColor="#5BE35C33"
                        style={styles.playerContainer}
                    >
                        <View style={styles.row}>
                            <View>
                                <Image
                                    source={item?.userInfo?.currentUserPfp ?
                                        { uri: item?.userInfo?.currentUserPfp } :
                                        require('@components/blank-profile-picture.png')
                                    }
                                    style={styles.profileImage}
                                />
                                <View>
                                    <Text style={styles.player}>You</Text>
                                    <Text style={styles.steps}>{item?.progress[userID][24]} steps</Text>
                                </View>
                            </View>
                            <View>
                                <View>
                                    <Text style={styles.player}>{item?.userInfo?.opponentUsername}</Text>
                                    <Text style={styles.steps}>{item?.progress[opponentID][24]} steps</Text>
                                </View>
                                <Image
                                    source={item?.userInfo?.opponentPfp ?
                                        { uri: item?.userInfo?.opponentPfp } :
                                        require('@components/blank-profile-picture.png')
                                    }
                                    style={styles.profileImage}
                                />
                            </View>
                            {/* <Text style={styles.memberCreatedAt}>
                                {dayjs(item.endTime.toDate()).format('MMM D, YYYY')}
                            </Text> */}
                        </View>
                        {/* {isExpanded && (
                            <StepsChart current1v1={item} />
                        )} */}
                    </TouchableHighlight>
                </View>
            )}
        />
    )
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 16,
    },
    backImage: {
        width: 19,
        height: 19,
    },
    filterButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fff',
        padding: 8,
        gap: 15,
        paddingHorizontal: 10,
    },
    spacer: {
        flex: 1,
        marginRight: 10,
    },
    statusBar: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderRadius: 20,
    },
    statusText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontWeight: '500',
        fontSize: 12,
    },
    winStatus: {
        backgroundColor: '#35B849', // Green color
    },
    loseStatus: {
        backgroundColor: '#FF6060', // Red color
    },
    drawStatus: {
        backgroundColor: '#808080', // Gray color
    },
    title: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend',
        color: '#fff',
        marginBottom: 20,
    },
    flatList: {
        marginTop: 10,
        width: '100%',
    },
    betsContainer: {
        backgroundColor: '#5BE35C32',
        borderRadius: 15,
        padding: 10,
    },
    wonEarningsText: {
        fontFamily: "Lexend",
        color: '#74FF6D',
        fontSize: 15,
        marginRight: 5,
    },
    lostEarningsText: {
        fontFamily: "Lexend",
        color: '#FF6060',
        fontSize: 15,
        marginRight: 5,
    },
    drawEarningsText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 15,
        marginRight: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    carrotIcon: {
        textAlign: 'right',
        color: '#888',
    },
    triangleText: {
        marginHorizontal: 8,
        fontSize: 14,
        opacity: 0.8,
    },
    horizontalLine: {
        borderBottomColor: '#ffffff80',
        borderBottomWidth: 1,
        marginVertical: 10,
        width: '100%',
        alignSelf: 'center',
    },
    winnerIcon: {
        width: 7,
        height: 33,
        position: 'absolute',
        left: -20,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#D3D3D3",
        marginRight: 10,
    },
    playerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: '#00000080',
        borderRadius: 10,
        padding: 10,
        paddingHorizontal: 20,
    },
    player: {
        fontFamily: "Lexend",
        fontSize: 11,
        color: '#fff',
        flex: 1,
        textAlign: 'left',
    },
    steps: {
        fontFamily: "Lexend",
        fontSize: 11,
        color: '#fff',
        textAlign: 'right',
    },
    createdAtText: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#fff',
    },
    loserText: {
        color: '#808080',
        opacity: 0.7,
    },
    loserImage: {
        opacity: 0.5,
    },
    earningsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default History1v1sPage;