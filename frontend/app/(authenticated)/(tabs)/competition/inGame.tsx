import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCurrentCompetition, users, getUserInfo } from '@/backend/src/api';
import { useUser } from '@/app/UserProvider';
import { getUserProfilesBatch } from '@/backend/src/competition';

const CompetitionGamePage: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [selectedTab, setSelectedTab] = useState<'ViewOne' | 'ViewTwo'>('ViewOne');
    const { userID, username, profileImageUrl } = useUser();

    // Timer update helper
    const updateTimer = (endTimeStr: string) => {
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
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const allUsers = await users();
                if (!allUsers) return;
                const userIds = allUsers.map((u: any) => u.user_id || u.id);

                // Batch fetch profiles
                const profiles = await getUserProfilesBatch(userIds);

                // Get user info (steps, rank) for each
                const userInfos = await Promise.all(
                    userIds.map(async (userId: string) => {
                        const info = await getUserInfo(userId);
                        type Profile = { username?: string; profileImageUrl?: string };
                        const profile: Profile = profiles.find((p: any) => p.userId === userId) || {};
                        return {
                            ...info,
                            username: profile.username || '',
                            profileImageUrl: profile.profileImageUrl || '',
                            userId,
                        };
                    })
                );
                userInfos.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
                setLeaderboard(userInfos);
            } catch (e) {
                console.error('Error fetching leaderboard:', e);
            }
        };
        fetchLeaderboard();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const setup = async () => {
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
    }, []);

    // Find current user's leaderboard entry
    const currentUserEntry = leaderboard.find(u => u.userId === userID);
    const currentUserRank = leaderboard.findIndex(u => u.userId === userID) + 1;
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
                            selectedTab === 'ViewOne' && styles.tabButtonActive
                        ]}
                        onPress={() => setSelectedTab('ViewOne')}
                        activeOpacity={1}
                    >
                        <Text style={[
                            styles.tabButtonText,
                            selectedTab === 'ViewOne' && styles.tabButtonTextActive
                        ]}>Game View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === 'ViewTwo' && styles.tabButtonActive
                        ]}
                        onPress={() => setSelectedTab('ViewTwo')}
                        activeOpacity={1}
                    >
                        <Text style={[
                            styles.tabButtonText,
                            selectedTab === 'ViewTwo' && styles.tabButtonTextActive
                        ]}>List View</Text>
                    </TouchableOpacity>
                </View>
                {/* Line for showing selected tab */}
                <View style={[
                    styles.tabUnderline,
                    selectedTab === 'ViewTwo'
                        ? styles.tabUnderlineRight
                        : styles.tabUnderlineLeft
                ]} />
                {/* Content Container */}
                <View style={styles.tabContentContainer}>
                    {selectedTab === 'ViewOne' ? (
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'flex-end',
                                paddingBottom: 20,
                            }}
                            horizontal={false}
                        >
                            {leaderboard.map((user, idx) => (
                                <View key={user.userId || user.id || idx} style={styles.stickFigureContainer}>
                                    <View style={styles.stickFigureWrapper}>
                                        <Image
                                            source={require('@assets/images/stickfigure.png')}
                                            style={{ width: 70, height: 110 }}
                                        />
                                        <Image
                                            source={
                                                user.profileImageUrl
                                                    ? { uri: user.profileImageUrl }
                                                    : require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.stickFigureFace}
                                        />
                                    </View>
                                    <Text style={styles.stickFigureUsername}>
                                        {user.username?.slice(0, 10) || user.userId}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Podium for Top 3 */}
                            <View style={styles.podiumRow}>
                                {[1, 0, 2].map((podiumIdx, i) => {
                                    const user = leaderboard[podiumIdx];
                                    if (!user) return <View key={i} style={styles.podiumEmpty} />;
                                    return (
                                        <View key={user.userId || user.id || i} style={[
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
                                            <Text style={styles.podiumUsername}>{user.username?.slice(0, 10) || user.userId}</Text>
                                            <Text style={styles.podiumSteps}>{user.steps ?? 0} steps</Text>
                                        </View>
                                    );
                                })}
                            </View>
                            {/* Rest of leaderboard */}
                            <View>
                                {leaderboard.slice(3).map((user, idx) => (
                                    <View
                                        key={user.userId || user.id || idx}
                                        style={[
                                            styles.leaderboardRow,
                                            user.userId === userID && styles.leaderboardRowCurrent
                                        ]}
                                    >
                                        <Text style={[
                                            styles.leaderboardRank,
                                            user.userId === userID && styles.leaderboardRankCurrent
                                        ]}>{idx + 4}</Text>
                                        <Image
                                            source={
                                                user.profileImageUrl
                                                    ? { uri: user.profileImageUrl }
                                                    : require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.leaderboardAvatar}
                                        />
                                        <Text style={styles.leaderboardUsername}>{user.username?.slice(0, 12) || user.userId}</Text>
                                        <Text style={[
                                            styles.leaderboardSteps,
                                            user.userId === userID && styles.leaderboardStepsCurrent
                                        ]}>{user.steps ?? 0} steps</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
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
        borderBottomWidth: 1,
        borderBottomColor: '#74FF6D',
        width: '47%',
        top: -1,
    },
    tabUnderlineLeft: {
        alignSelf: 'flex-start',
        left: 10,
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
        width: '100%',
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