import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions, Alert, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';
import { useUser } from '@/app/UserProvider';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Timestamp } from 'firebase/firestore';
import { LineChart } from 'react-native-chart-kit';

dayjs.extend(relativeTime);

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 393;
const guidelineBaseHeight = 852;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type Results = {
    current1v1ID: string;
    startTime: Timestamp;
    endTime: Timestamp;
    participants: string[];
    progress: any;
    userInfo: {
        currentUserPfp: string;
        opponentName: string;
        opponentUsername: string;
        opponentPfp: string;
    }
};

type Props = {
    results: Results;
};

type UserInfo = {
    user_id: string,
    username?: string,
    profileImageUrl?: string,
}

type Profile = { username?: string; profileImageUrl?: string };

const ResultsModal: React.FC<Props> = ({ results }) => {
    const { userID, name } = useUser();
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });
    const [updatedResults, setUpdatedResults] = useState<Results>(results);
    const [opponentID, setOpponentID] = useState<string>("");
    const [userSteps, setUserSteps] = useState<number>(0);
    const [opponentSteps, setOpponentSteps] = useState<number>(0);
    const [winner, setWinner] = useState<"User" | "Opponent" | null>(null);

    useEffect(() => {
        setUpdatedResults(results);
        setOpponentID(results.participants.find((id: string) => id !== userID) || "");
        setUserSteps(results?.progress?.[userID]?.[24] ?? 0);
        setOpponentSteps(results?.progress?.[opponentID]?.[24] ?? 0);
        if (userSteps > opponentSteps) {
            setWinner("User");
        } else if (opponentSteps > userSteps) {
            setWinner("Opponent");
        }
    }, [results])

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
                    strokeWidth: 1,
                },
                {
                    data: opponentSteps,
                    color: () => "#7464FF",
                    strokeWidth: 1,
                }
            ]
        };

        return (
            <LineChart
                data={data}
                width={width * 0.7}
                height={verticalScale(200)}
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
                        r: "4",
                        strokeWidth: "1",
                        stroke: "#fff",
                    },
                    propsForBackgroundLines: {
                        strokeWidth: 0.5,
                        stroke: "rgba(255,255,255,0.1)",
                    },
                    propsForLabels: {
                        fontFamily: "Lexend",
                        fontSize: 9,
                    },
                    style: {
                        borderRadius: 12,
                    }
                }}
                style={{
                    marginVertical: 8,
                    borderRadius: 14,
                    paddingTop: 15,
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
                            <Text style={{ fontFamily: 'Lexend', fontSize: 11, color: '#fff', includeFontPadding: false }}>
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
        <View style={{ height: '100%' }}>
            <Text style={styles.header}>Hey {name}! Here are the results of the 1v1:</Text>
            <View>
                <Text style={styles.date}>
                    {dayjs(results.endTime.toDate()).format('MMM D, YYYY')}
                </Text>
                <View style={styles.playerContainer}>
                    <View style={styles.row}>
                        <View style={[styles.rowSide, { opacity: winner === "User" ? 1 : 0.5 }]}>
                            <Image
                                source={results?.userInfo?.currentUserPfp ?
                                    { uri: results?.userInfo?.currentUserPfp } :
                                    require('@components/blank-profile-picture.png')
                                }
                                style={[styles.profileImage, { marginRight: 10, borderColor: "#FF606080", }]}
                            />
                            <View>
                                <Text style={styles.player}>You</Text>
                                <Text style={styles.steps}>{userSteps} steps</Text>
                            </View>
                        </View>
                        <View style={[styles.rowSide, { opacity: winner === "Opponent" ? 1 : 0.5}]}>
                            <View>
                                <Text style={[styles.player, { textAlign: 'right', }]}>{results?.userInfo?.opponentUsername}</Text>
                                <Text style={[styles.steps, { textAlign: 'right', }]}>{opponentSteps} steps</Text>
                            </View>
                            <Image
                                source={results?.userInfo?.opponentPfp ?
                                    { uri: results?.userInfo?.opponentPfp } :
                                    require('@components/blank-profile-picture.png')
                                }
                                style={[styles.profileImage, { marginLeft: 10, borderColor: "#7464FF80", }]}
                            />
                        </View>
                    </View>
                    <StepsChart current1v1={results} />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 15,
        marginHorizontal: 5,
        marginTop: -30,
        marginBottom: 10,
    },
    date: {
        fontFamily: "Lexend",
        color: '#ffffff80',
        fontSize: 10,
        marginBottom: 5,
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
        width: '100%',
    },
    rowSide: {
        flexDirection: 'row',
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
    },
    playerContainer: {
        // flexDirection: 'row',
        // justifyContent: 'space-between',
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
    },
    steps: {
        fontFamily: "Lexend",
        fontSize: 9,
        color: '#ffffffaa',
    },
});

export default ResultsModal;