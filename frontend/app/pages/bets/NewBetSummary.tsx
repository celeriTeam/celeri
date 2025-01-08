import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import StorePage from './Store';
import BetHistoryPage from './BetHistory';
import { getAverageSteps, getProfilePic, getSteps, getUserName, getWeeklySteps } from '@/backend/src/users';
import { getCurrentPlayersInGame, getCycleCount, getCycle, getGroupIsFirstDay, getGroupName, getGroupProfilePic, getGameType, getTodaysBetTokens, getTotalCycles, getUserDiamonds, getUsersInGroup, getUserTokens, addPropBet, getPropBet, getResetDay } from '@/backend/src/groups';
import { getPowerups } from '@/backend/src/store';
import { Dimensions } from 'react-native';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { addToFinishedPropBet, checkFinishedPropBet } from '@/backend/src/bets';

const db = getFirestore(app);

type newBetSummaryPageNavigationProp = StackNavigationProp<RootStackParamList, 'NewBetSummaryPage'>;
type newBetSummaryPageRouteProp = RouteProp<RootStackParamList, 'NewBetSummaryPage'>;

type Props = {
    navigation: newBetSummaryPageNavigationProp;
};

const NewBetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups } = useUser();
    const route = useRoute<newBetSummaryPageRouteProp>();
    const { groupID } = route.params;
    const [selectedTab, setSelectedTab] = useState('Tokens');
    const groupName = groups[groupID]?.groupName;
    const groupPfp = groups[groupID]?.groupProfileUrl;
    const userList = groups[groupID]?.userList; // userList is a list of userIDs
    const users = groups[groupID]?.users; // users contains username, profileImageUrl, steps, and tokens

    // Mock data
    const mockData = {
        tokens: 1000,
        timeLeft: 50,
        diamonds: 3,
        steps: [
            { id: '1', steps: 10357 },
            { id: '2', steps: 7489 },
            { id: '3', steps: 7205 },
            { id: '4', steps: 5046 },
            { id: '5', steps: 4293 }
        ],
        liveDuel: {
            player1: { name: 'locus', steps: 5046, tokens: 50 },
            player2: { name: 'aidan', steps: 10357, tokens: 0 }
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.groupInfo}>
                    <Image 
                        source={groups[groupID]?.groupImageUrl ? 
                            { uri: groups[groupID]?.groupImageUrl } : 
                            require('@components/blank-profile-picture.png')
                        }
                        style={styles.groupImage}
                    />
                    <Text style={styles.groupName}>{groups[groupID]?.groupName || 'Group Name'}</Text>
                    <Text style={styles.timeLeft}>{`${mockData.timeLeft} weeks left`}</Text>
                </View>

                {/* Stats Container */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        
                        <Text style={styles.statValue}>{mockData.tokens}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>50</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{mockData.diamonds}</Text>
                    </View>
                </View>
            </View>

            {/* Live Duel Section */}
            <View style={styles.duelContainer}>
                <Text style={styles.sectionTitle}>Live Duel</Text>
                <View style={styles.duelCard}>
                    <Text style={styles.liveTag}>• LIVE</Text>
                    <View style={styles.duelInfo}>
                        <View style={styles.playerInfo}>
                            <Image 
                                source={require('@components/blank-profile-picture.png')}
                                style={styles.playerImage}
                            />
                            <Text style={styles.playerName}>{mockData.liveDuel.player1.name}</Text>
                            <Text style={styles.playerSteps}>{mockData.liveDuel.player1.steps} steps</Text>
                            <Text style={styles.playerTokens}>{mockData.liveDuel.player1.tokens}</Text>
                        </View>
                        <Text style={styles.versus}>0 : 0</Text>
                        <View style={styles.playerInfo}>
                            <Image 
                                source={require('@components/blank-profile-picture.png')}
                                style={styles.playerImage}
                            />
                            <Text style={styles.playerName}>{mockData.liveDuel.player2.name}</Text>
                            <Text style={styles.playerSteps}>{mockData.liveDuel.player2.steps} steps</Text>
                            <Text style={styles.playerTokens}>{mockData.liveDuel.player2.tokens}</Text>
                        </View>
                    </View>
                    <View style={styles.betAmount}>
                        <Text style={styles.betText}>$ 50</Text>
                    </View>
                </View>
            </View>

            {/* Leaderboard Section */}
            <View style={styles.leaderboardContainer}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, selectedTab === 'Tokens' && styles.activeTab]}
                        onPress={() => setSelectedTab('Tokens')}
                    >
                        <Text style={styles.tabText}>Tokens</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, selectedTab === 'Steps' && styles.activeTab]}
                        onPress={() => setSelectedTab('Steps')}
                    >
                        <Text style={styles.tabText}>Steps</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.leaderboard}>
                    {mockData.steps.map((user, index) => (
                        <View key={user.id} style={styles.leaderboardRow}>
                            <Image 
                                source={require('@components/blank-profile-picture.png')}
                                style={styles.leaderboardImage}
                            />
                            <View style={styles.leaderboardBar}>
                                <View style={[styles.barFill, { width: `${(user.steps / mockData.steps[0].steps) * 100}%` }]} />
                            </View>
                            <Text style={styles.leaderboardSteps}>{user.steps}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        padding: 20,
    },
    groupInfo: {
        alignItems: 'center',
    },
    groupImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    groupName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
    },
    timeLeft: {
        color: '#4CAF50',
        fontSize: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#1E1E1E',
        borderRadius: 15,
        padding: 10,
        marginTop: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
    },
    duelContainer: {
        padding: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    duelCard: {
        backgroundColor: '#4CAF50',
        borderRadius: 15,
        padding: 20,
    },
    liveTag: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 10,
    },
    duelInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerInfo: {
        alignItems: 'center',
    },
    playerImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    playerName: {
        color: '#fff',
        fontSize: 16,
        marginTop: 5,
    },
    playerSteps: {
        color: '#fff',
        fontSize: 14,
    },
    playerTokens: {
        color: '#fff',
        fontSize: 14,
    },
    versus: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    betAmount: {
        alignItems: 'center',
        marginTop: 10,
    },
    betText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    leaderboardContainer: {
        flex: 1,
        padding: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#4CAF50',
    },
    tabText: {
        color: '#fff',
        fontSize: 16,
    },
    leaderboard: {
        flex: 1,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    leaderboardImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    leaderboardBar: {
        flex: 1,
        height: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 10,
    },
    barFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
    },
    leaderboardSteps: {
        color: '#fff',
        fontSize: 14,
        width: 60,
    },
});

export default NewBetSummaryPage;