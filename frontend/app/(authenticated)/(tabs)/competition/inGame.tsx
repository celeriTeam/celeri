import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCurrentCompetition } from '@backend/src/api/competitions';
import { getCurrentCompetitionData, getCompetitionUserInfo, getReferralsData } from '@backend/src/api/competition_steps';
import { useUser } from '@/app/UserProvider';
import { getUserProfilesBatch } from '@/backend/src/competition';
import messaging from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';

type Results = {
    user_id: string,
    steps: number,
    rank: string
};

type ReferralResults = {
    rank: number,
    user_id: string,
    referral_count: number
};

type Profile = { username?: string; profileImageUrl?: string };

const CompetitionGamePage: React.FC = () => {
    const { userID, username, profileImageUrl } = useUser();
    const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [referralsLeaderboard, setReferralsLeaderboard] = useState<any[]>([]);
    const [selectedTab, setSelectedTab] = useState<'VisualSteps' | 'Steps' | 'Referrals'>('VisualSteps');
    const [refreshing, setRefreshing] = useState(false);
    const [winners, updateWinners] = useState<string[]>([])
    const router = useRouter();

    const resultsToDisplay = selectedTab === 'Referrals'
    ? referralsLeaderboard
    : leaderboard;

    // Timer update helper
    const updateTimer = (endTimeStr: string) => {
        // console.log('end time: ', endTimeStr);
        const endTime = new Date(endTimeStr).getTime();
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
            setTimeLeft("00:00:00");
            return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`
        );
    };

    // Fetch leaderboard
    const fetchLeaderboard = async () => {
        try {
            const allUsers = await getCurrentCompetitionData();
            console.log('all users: ', allUsers);
            if (!allUsers) return;
            const userIds = allUsers.map((u: any) => u.user_id || u.id);

            // Batch fetch profiles
            const profiles = await getUserProfilesBatch(userIds);

            // Get user info (steps, rank) for each
            const userInfos = await Promise.all(
                userIds.map(async (userId: string) => {
                    const profile: Profile = profiles.find((p: any) => p.userId === userId) || {};
                    return {
                        user_id: userId,
                        username: profile.username || '',
                        profileImageUrl: profile.profileImageUrl || '',
                        steps: allUsers.find((r: Results) => r.user_id === userId)?.steps || 0,
                        rank: allUsers.find((r: Results) => r.user_id === userId)?.rank || '-1'
                    };
                })
            );
            setLeaderboard(userInfos);

            // referrals
            const currentCompetition = await fetchCurrentCompetition();
            const referralsData = await getReferralsData(currentCompetition.id);
            if (referralsData) {
                const userIds = referralsData.map((u: any) => u.user_id || u.id);
                const referralProfiles = await getUserProfilesBatch(userIds);
                const referralUserInfos = await Promise.all(
                    userIds.map(async (userId: string) => {
                        const profile: Profile = referralProfiles.find((p: any) => p.userId === userId) || {};
                        return {
                            user_id: userId,
                            username: profile.username || '',
                            profileImageUrl: profile.profileImageUrl || '',
                            referral_count: referralsData.find((r: ReferralResults) => r.user_id === userId)?.referral_count || 0,
                            rank: referralsData.find((r: ReferralResults) => r.user_id === userId)?.rank || '-1'
                        };
                    })
                );
                setReferralsLeaderboard(referralUserInfos);
            }

            if (userInfos.length > 0) {
                const firstPlaceUserId = userInfos[0].user_id;

                // Median index: if even, pick the first in second half
                const medianIndex = Math.floor(userInfos.length / 2);
                const medianUserId = userInfos[medianIndex].user_id;

                console.log('First place user ID:', firstPlaceUserId);
                console.log('Median place user ID:', medianUserId);
                const fetchedWinners = referralsData
                    ? [firstPlaceUserId, medianUserId, referralsData[0].user_id]
                    : [firstPlaceUserId, medianUserId];
                updateWinners(fetchedWinners);
                
            }
        } catch (e) {
            console.error('Error fetching leaderboard:', e);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const refreshGameData = useCallback(async () => {
        const game = await fetchCurrentCompetition();
        if (game.error) {
            router.replace('/(authenticated)/(tabs)/competition');
        }
        if (game && game.end_time) {
            updateTimer(game.end_time);
        }
        await fetchLeaderboard();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshGameData();
        setRefreshing(false);
    };

    useEffect(() => {
        const unsubscribe = messaging().onMessage(remoteMsg => {
            if (remoteMsg.data?.type === 'TOGGLE_COMPETITION') {
                refreshGameData();
            }
        });

        return unsubscribe;
    }, [refreshGameData]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const setup = async () => {
            await refreshGameData();
            const game = await fetchCurrentCompetition();
            if (game && game.end_time) {
                updateTimer(game.end_time);
                interval = setInterval(() => updateTimer(game.end_time), 1000);
            }
        };
        setup();
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [refreshGameData]);

    // Find current user's leaderboard entry
    const currentUserEntry = leaderboard.find(u => u.user_id === userID);
    const currentUserRank = leaderboard.findIndex(u => u.user_id === userID) + 1;
    const totalPlayers = leaderboard.length;

    // Helper for ordinal suffix
    const getOrdinal = (n: number) => {
        if (n <= 0) return '--';
        const s = ["th", "st", "nd", "rd"],
            v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={styles.gradient}
        >
            {/* Timer at the top */}
            <Text style={styles.timer}>
                {timeLeft}
            </Text>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ flex: 1, width: '100%' }}
            >
                {/* User profile row */}
                <View style={styles.profileRow}>
                    <Image
                        source={
                            profileImageUrl
                                ? { uri: profileImageUrl }
                                : require('@components/blank-profile-picture.png')
                        }
                        style={styles.profileImage}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                            {username}
                        </Text>
                        <Text style={styles.profileSteps}>
                            {currentUserEntry?.steps ?? 0} steps
                        </Text>
                        <Text style={styles.profileRank}>
                            {getOrdinal(currentUserRank)} out of {totalPlayers} players
                        </Text>
                    </View>
                </View>
                <View style={styles.leaderboardContainer}>
                    <Text style={styles.leaderboardTitle}>
                        Leaderboard
                    </Text>
                    {/* Tab Switcher */}
                    <View style={styles.tabSwitcher}>
                        <TouchableOpacity
                            style={[
                                styles.tabButton,
                            ]}
                            onPress={() => setSelectedTab('VisualSteps')}
                            activeOpacity={1}
                        >
                            <Text style={[
                                styles.tabButtonText,
                                selectedTab === 'VisualSteps' && styles.tabButtonTextActive
                            ]}>Game View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabButton,
                            ]}
                            onPress={() => setSelectedTab('Steps')}
                            activeOpacity={1}
                        >
                            <Text style={[
                                styles.tabButtonText,
                                selectedTab === 'Steps' && styles.tabButtonTextActive
                            ]}>List View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabButton,
                            ]}
                            onPress={() => setSelectedTab('Referrals')}
                            activeOpacity={1}
                        >
                            <Text style={[
                                styles.tabButtonText,
                                selectedTab === 'Referrals' && styles.tabButtonTextActive
                            ]}>Referrals</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Line for showing selected tab */}
                    <View style={[
                        styles.tabUnderline,
                        selectedTab === 'VisualSteps' && styles.tabUnderlineLeft,
                        selectedTab === 'Steps' && styles.tabUnderlineMiddle,
                        selectedTab === 'Referrals' && styles.tabUnderlineRight
                    ]} />
                    {/* Content Container */}
                    <View style={styles.tabContentContainer}>
                        {selectedTab === 'VisualSteps' ? (
                            <ScrollView
                                style={{ flex: 1, width: '100%' }}
                                contentContainerStyle={{
                                    alignItems: 'center',
                                    paddingVertical: 20,
                                    paddingTop: 120,
                                    minHeight: 400,
                                }}
                                showsVerticalScrollIndicator={true}
                            >
                                {/* Track and Markers */}
                                {(() => {
                                    // Track settings
                                    const TRACK_WIDTH = 100;
                                    const STICK_WIDTH = 70;
                                    const TRACK_LEFT = 50;
                                    const MARKER_INTERVAL = 500;
                                    const BOTTOM_MARGIN = 60;
                                    const TOP_MARGIN = 30;
                                    const STICK_HEIGHT = 110;

                                    // Find max steps
                                    const maxSteps = Math.max(...leaderboard.map(u => u.steps ?? 0), 1000);
                                    // Track height grows with maxSteps, 1 step = 0.15px, but at least 400px
                                    const pxPerStep = 0.15;
                                    const trackHeight = Math.max((maxSteps * pxPerStep) + TOP_MARGIN + BOTTOM_MARGIN, 400);

                                    // Markers
                                    const markerCount = Math.ceil(maxSteps / MARKER_INTERVAL) + 2;

                                    // Generate a consistent random X offset for each user based on their userId
                                    const getRandomX = (userId: string | number) => {
                                        // Simple hash for deterministic "random" based on userId
                                        let hash = 0;
                                        const str = String(userId);
                                        for (let i = 0; i < str.length; i++) {
                                            hash = str.charCodeAt(i) + ((hash << 5) - hash);
                                        }
                                        // Range: -10 to 40 px
                                        return 10 + (Math.abs(hash) % 120);
                                    };

                                    return (
                                        <View style={{
                                            width: TRACK_WIDTH + 80,
                                            height: trackHeight,
                                            flexDirection: 'row',
                                            position: 'relative',
                                        }}>
                                            {/* Step Markers - moved to absolute far left */}
                                            <View style={{
                                                position: 'absolute',
                                                left: -70,
                                                top: 0,
                                                bottom: 0,
                                                width: 50,
                                                justifyContent: 'flex-end',
                                                alignItems: 'flex-end',
                                            }}>
                                                {Array.from({ length: markerCount }).map((_, i) => {
                                                    const steps = i * MARKER_INTERVAL;
                                                    const y = trackHeight - BOTTOM_MARGIN - (steps / maxSteps) * (trackHeight - TOP_MARGIN - BOTTOM_MARGIN);
                                                    return (
                                                        <View key={i} style={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            width: 50,
                                                            top: y - 8,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-end',
                                                        }}>
                                                            <Text style={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                fontFamily: 'Lexend',
                                                                width: 32,
                                                                textAlign: 'right',
                                                                marginRight: 2,
                                                            }}>{steps}</Text>
                                                            <View style={{
                                                                width: 20,
                                                                height: 2,
                                                                backgroundColor: '#74FF6D',
                                                                marginLeft: 2,
                                                            }} />
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                            {/* Stick Figures */}
                                            <View style={{
                                                marginLeft: TRACK_LEFT,
                                                width: TRACK_WIDTH,
                                                height: trackHeight,
                                                position: 'relative',
                                            }}>
                                                {leaderboard.map((user, idx) => {
                                                    const steps = user.steps ?? 0;
                                                    const y = trackHeight - BOTTOM_MARGIN - (steps / maxSteps) * (trackHeight - TOP_MARGIN - BOTTOM_MARGIN);
                                                    const x = getRandomX(user.user_id || user.id);
                                                    return (
                                                        <View
                                                            key={user.user_id || user.id || idx}
                                                            style={{
                                                                position: 'absolute',
                                                                left: x,
                                                                top: y - STICK_HEIGHT,
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Image
                                                                source={require('@assets/images/stickfigure.png')}
                                                                style={{ width: 70, height: 110, tintColor: '#fff' }}
                                                            />
                                                            <Image
                                                                source={
                                                                    user.profileImageUrl
                                                                        ? { uri: user.profileImageUrl }
                                                                        : require('@components/blank-profile-picture.png')
                                                                }
                                                                style={styles.stickFigureFace}
                                                            />
                                                            <Text style={[
                                                                    styles.stickFigureUsername,
                                                                    winners.includes(user.user_id) && {color: '#7eff77ff', fontFamily: 'Lexend-Bold',}
                                                                ]}>
                                                                {user.username?.slice(0, 25) || user.user_id}
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    );
                                })()}
                            </ScrollView>
                        ) : (
                            selectedTab === 'Referrals' && referralsLeaderboard.length === 0 ? (
                                <View>
                                    <Text>No referrals in this competition.</Text>
                                </View>
                            ) : (
                                <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
                                    {/* Podium for Top 3 */}
                                    <View style={styles.podiumRow}>
                                        {[1, 0, 2].map((podiumIdx, i) => {
                                            const user = resultsToDisplay[podiumIdx];
                                            if (!user) return <View key={i} style={styles.podiumEmpty} />;
                                            return (
                                                <View key={user.user_id || user.id || i} style={[
                                                    styles.podiumUser,
                                                    podiumIdx === 0 && styles.podiumUserFirst
                                                ]}>
                                                    <Image
                                                        source={
                                                            user.profileImageUrl
                                                                ? { uri: user.profileImageUrl }
                                                                : require('@components/blank-profile-picture.png')
                                                        }
                                                        style={[
                                                            styles.podiumImage,
                                                            podiumIdx === 0 && styles.podiumImageFirst
                                                        ]}
                                                    />
                                                    <View style={styles.podiumBadge}>
                                                        <Text style={styles.podiumBadgeText}>{podiumIdx + 1}</Text>
                                                    </View>
                                                    <Text style={[
                                                        styles.podiumUsername, 
                                                        winners.includes(user.user_id) && {color: '#7eff77ff', fontFamily: 'Lexend-Bold',}
                                                    ]}>{user.username?.slice(0, 25) || user.user_id}</Text>
                                                    <Text style={styles.podiumSteps}>
                                                        {selectedTab === 'Referrals' ? `${user?.referral_count ?? 0} referrals` : `${user?.steps ?? 0} steps`}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    {/* Rest of leaderboard */}
                                    <View>
                                        {resultsToDisplay.slice(3).map((user, idx) => (
                                            <View
                                                key={user.user_id || user.id || idx}
                                                style={[
                                                    styles.leaderboardRow,
                                                    user.user_id === userID && styles.leaderboardRowCurrent
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.leaderboardRank,
                                                    user.user_id === userID && styles.leaderboardRankCurrent
                                                ]}>{idx + 4}</Text>
                                                <Image
                                                    source={
                                                        user.profileImageUrl
                                                            ? { uri: user.profileImageUrl }
                                                            : require('@components/blank-profile-picture.png')
                                                    }
                                                    style={styles.leaderboardAvatar}
                                                />
                                                <Text style={[
                                                    styles.leaderboardUsername,
                                                    winners.includes(user.user_id) && {color: '#7eff77ff', fontFamily: 'Lexend-Bold',}
                                                ]}>{user.username?.slice(0, 25) || user.user_id}</Text>
                                                <Text style={[
                                                    styles.leaderboardSteps,
                                                    user.user_id === userID && styles.leaderboardStepsCurrent
                                                ]}>{selectedTab === 'Referrals' ? `${user?.referral_count ?? 0} referrals` : `${user?.steps ?? 0} steps`}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            )
                        )}
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    timer: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 60,
        textAlign: 'center',
        marginTop: 40,
        marginBottom: 10,
    },
    profileRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#fff',
        marginTop: 0,
        marginBottom: 10,
    },
    profileInfo: {
        marginLeft: 18,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    profileName: {
        color: '#fff',
        fontFamily: 'Lexend-Bold',
        fontSize: 18,
        textAlign: 'left',
    },
    profileSteps: {
        color: '#BEFFBB',
        fontFamily: 'Lexend-Bold',
        fontSize: 18,
        marginTop: 2,
        textAlign: 'left',
    },
    profileRank: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 16,
        marginTop: 2,
        textAlign: 'left',
    },
    leaderboardContainer: {
        flex: 1,
        padding: 20,
        width: '100%',
    },
    leaderboardTitle: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 24,
        marginBottom: 10,
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#65656580',
        borderRadius: 10,
        width: '100%',
    },
    tabButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 15,
        borderBottomColor: 'transparent',
        borderBottomWidth: 2,
    },
    tabButtonActive: {
        borderBottomColor: '#74FF6D',
        borderBottomWidth: 2,
    },
    tabButtonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    tabButtonTextActive: {
        color: '#74FF6D',
    },
    tabUnderline: {
        borderBottomWidth: 1.5,
        borderBottomColor: '#74FF6D',
        width: '31%',
        top: -2,
    },
    tabUnderlineLeft: {
        alignSelf: 'flex-start',
        left: 10,
    },
    tabUnderlineMiddle: {
        alignSelf: 'center',
    },
    tabUnderlineRight: {
        alignSelf: 'flex-end',
        right: 10,
    },
    tabContentContainer: {
        flex: 1,
        backgroundColor: '#65656580',
        borderRadius: 20,
        paddingHorizontal: 10,
        marginTop: 8,
        paddingVertical: 15,
        minHeight: 120,
        // width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
    },
    viewOneContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    podiumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 15,
    },
    podiumEmpty: {
        width: 60,
        height: 60,
    },
    podiumUser: {
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 15,
    },
    podiumUserFirst: {
        marginTop: 0,
    },
    podiumImage: {
        width: 45,
        height: 45,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#fff',
    },
    podiumImageFirst: {
        width: 60,
        height: 60,
    },
    podiumBadge: {
        backgroundColor: '#74FF6D',
        borderRadius: 9,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -10,
    },
    podiumBadgeText: {
        fontFamily: 'Lexend',
        color: '#000',
        fontSize: 10,
    },
    podiumUsername: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 12,
        marginTop: 2,
    },
    podiumSteps: {
        color: '#BEFFBB',
        fontFamily: 'Lexend-Bold',
        fontSize: 12,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00000080',
        borderRadius: 10,
        marginBottom: 5,
        padding: 10,
    },
    leaderboardRowCurrent: {
        backgroundColor: '#4bff6c99',
    },
    leaderboardRank: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#a7a7a7',
        marginRight: 10,
        width: 20,
        textAlign: 'center',
    },
    leaderboardRankCurrent: {
        color: '#fff',
    },
    leaderboardAvatar: {
        width: 26,
        height: 26,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    leaderboardUsername: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#fff',
        flex: 1,
    },
    leaderboardSteps: {
        fontFamily: 'Lexend-Bold',
        fontSize: 13,
        color: '#BEFFBB',
    },
    leaderboardStepsCurrent: {
        color: '#fff',
    },
    stickFigureContainer: {
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 10,
    },
    stickFigureWrapper: {
        width: 70,
        height: 110,
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
    },
    stickFigureFace: {
        position: 'absolute',
        top: 10,
        left: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#222',
    },
    stickFigureUsername: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
        maxWidth: 70,
    },
});

export default CompetitionGamePage;