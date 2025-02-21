import React, { useEffect, useState } from 'react';
import { Timestamp } from "firebase/firestore";
import { getMoreWeeklyDuelsSummary, getWeeklyGainsSummary, getRacesSummary } from '@/backend/src/bets';
import { View, Text, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '../../../UserProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';



const RaceHistoryPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [raceHistory, setRaceHistory] = useState<{weeksAgo: number; races: RaceItem[]}[]>([]);
    const [raceWeeksAgo, setRaceWeeksAgo] = useState(1);

    const router = useRouter();
    const screenWidth = Dimensions.get('window').width;
    
    interface RaceItem {
        userID: string;
        gain: number;
        username: string;
        profilePic: string;
        weeksAgo: number;
        steps: number;
    }
    
    // Initial load for yesterday's duels
    useEffect(() => {
        loadMoreRaces();
    }, [groupID, groups]);


    const loadMoreRaces = async () => {
        let moreRaces;
        console.log("raceWeeksAgo here", raceWeeksAgo);
        moreRaces = await getRacesSummary(groupID, raceWeeksAgo, groups);
        if(moreRaces){
            const newRaceWeek = {
                weeksAgo: raceWeeksAgo,
                races: Object.entries(moreRaces.races).map(([userID, raceData]) => ({
                    userID,
                    ...raceData,
                }))
            }

            setRaceHistory(prevRaceHistory => [...prevRaceHistory, newRaceWeek]);
            setRaceWeeksAgo(prevRaceWeeksAgo => prevRaceWeeksAgo + 1);
        }
    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const renderRaceItem = ({ item }: { item: {weeksAgo: number; races: RaceItem[]} }) => (
        <View style={[styles.racesFlatList, { width: screenWidth * 0.9 }]}>
            <View style={{ flex: 1, alignItems: 'flex-start', paddingTop: 3, paddingBottom: 8 }}>
                <Text style={styles.createdAtText}>{`${item.weeksAgo}w ago`}</Text>
            </View>
            <View style={styles.racesContainer}>
                {item.races.map((race) => (
                    <View key={`${race.userID}_${item.weeksAgo}`} style={styles.row}>
                        <Image source={{ uri: race.profilePic }} style={styles.profileImage} />
                        <Text style={styles.playerGain}>{race.username}</Text>
                        <Text style={styles.stepCountText}>{`${race.steps} steps`}</Text>
                        <View style={styles.gainCountContainer}>
                            <Text
                                style={[
                                    race.gain > 0 
                                        ? styles.wonGainEarningsText 
                                        : race.gain < 0 
                                        ? styles.lostGainEarningsText 
                                        : styles.zeroGainEarningsText,
                                ]}
                            >
                                {race.gain > 0 ? `+${race.gain}` : race.gain}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Image
                            source={require('@assets/icons/back.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>
                    <Text style={styles.title}>Race History</Text>
                    <FlatList
                        data={raceHistory} // Replace with your actual data source for races
                        keyExtractor={(item) => item.weeksAgo.toString()}
                        renderItem={renderRaceItem} // Implement this function to render race items
                        onEndReached={loadMoreRaces} // Implement if you want pagination
                        onEndReachedThreshold={0.5}
                    />
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
        marginTop: 50,
        height: '95%',
    },
    spacer: {
        flex: 1,
        marginRight: 10,
    },
    gainCountContainer: {
        width: 30,
        alignItems: 'flex-end',
    },
    statusBar: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    statusText: {
        fontFamily: "Lexend",
        color: 'white',
        fontWeight: '500',
        fontSize: 14,
    },
    winStatus: {
        backgroundColor: '#4CAF50', // Green color
    },
    loseStatus: {
        backgroundColor: '#f44336', // Red color
    },
    drawStatus: {
        backgroundColor: '#9e9e9e', // Gray color
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
    },
    backImage: {
        width: 19,
        height: 19,
    },
    title: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend',
        color: '#fff',
        paddingTop: 20,
        marginBottom: 20,
    },
    header: {
        fontFamily: "Lexend",
        fontSize: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    flatList: {
        borderWidth: 3,
        borderColor: '#ccc',
        borderRadius: 5,
        marginTop: 10,
        paddingBottom: 25,
    },
    racesFlatList: {
        marginTop: 10,
    },
    // racesFlatList: {
    //     borderWidth: 3,
    //     borderColor: '#ccc',
    //     borderRadius: 5,
    //     marginTop: 10,
    //     paddingBottom: 25,
    //     padding: 10,
    // },
    racesContainer: {
        backgroundColor: '#5BE35C32',
        borderRadius: 15,
        padding: 10,
    },
    wonEarningsText: {
        fontFamily: "Lexend",
        marginTop: 10,
        color: 'green',
        fontSize: 30,
    },
    lostEarningsText: {
        fontFamily: "Lexend",
        marginTop: 10,
        color: 'red',
        fontSize: 30,
    },
    wonGainEarningsText: {
        fontFamily: "Lexend",
        color: '#74FF6D',
        fontSize: 11,
    },
    lostGainEarningsText: {
        fontFamily: "Lexend",
        color: '#FF6060',
        fontSize: 11,
    },
    zeroGainEarningsText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 11,
    },
    stepCountText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 11,
        paddingRight: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: '#00000080',
        borderRadius: 10,
        padding: 10,
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
        borderBottomColor: '#ccc',
        borderBottomWidth: 1.5,
        marginVertical: 10,
        width: '90%',
        alignSelf: 'center',
    },
    profileImage: {
        width: 26,
        height: 26,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#D3D3D3",
        marginRight: 10,
    },
    playerContainer: {
        paddingLeft: 25,
        paddingRight: 25,
    },
    player: {
        fontFamily: "Lexend-Bold",
        fontSize: 18,
        flex: 1,
        textAlign: 'left',
    },
    playerGain: {
        fontFamily: "Lexend",
        fontSize: 11,
        color: '#fff',
        flex: 1,
        textAlign: 'left',
    },
    steps: {
        fontFamily: "Lexend",
        marginRight: 30,
        textAlign: 'right',
        fontSize: 28,
    },
    createdAtText: {
        color: '#fff',
    },
    loserText: {
        color: '#808080',
        opacity: 0.7,
    },
    loserImage: {
        opacity: 0.5,
    },
    centeredColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        marginBottom: 10 
    },
    button: {
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        fontFamily: 'Lexend',
        color: 'gray',
        fontSize: 16,
    },
    activeButtonText: {
        color: 'green',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: 'gray', fontFamily: 'Lexend_400Regular' },
});

export default RaceHistoryPage;