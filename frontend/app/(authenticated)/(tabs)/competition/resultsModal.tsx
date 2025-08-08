import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCurrentCompetition } from '@backend/src/api/competitions';
import { getCompetitionData, getCompetitionUserInfo } from '@backend/src/api/competition_steps';
import { useUser } from '@/app/UserProvider';
import { getUserProfilesBatch } from '@/backend/src/competition';

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 393;
const guidelineBaseHeight = 852;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type Results = {
    competition_id: string,
    start_time: string,
    end_time: string,
    is_active: boolean,
    user_id: string,
    steps: number,
    rank: string
};

type Props = {
    results: Results[];
};

const ResultsModal: React.FC<Props> = ({ results }) => {
    const { userID, name } = useUser();
    const [resultsWithUserInfo, setResultsWithUserInfo] = useState<any[]>([]);
    const [userInfo, setUserInfo] = useState<any>(null);

    const grabUsersInfo = async () => {
        try {
            const userIds = results.map((u: any) => u.user_id || u.id);
            
            // Batch fetch profiles
            const profiles = await getUserProfilesBatch(userIds);

            // Get user info (steps, rank) for each
            const userInfos = await Promise.all(
                userIds.map(async (userId: string) => {
                    type Profile = { username?: string; profileImageUrl?: string };
                    const profile: Profile = profiles.find((p: any) => p.userId === userId) || {};
                    if (userId === userID) {
                        setUserInfo({
                            username: profile.username || '',
                            profileImageUrl: profile.profileImageUrl || '',
                            steps: results.find((r: Results) => r.user_id === userId)?.steps || 0,
                            rank: results.find((r: Results) => r.user_id === userId)?.rank || '-1'
                        });
                    }
                    return {
                        user_id: userId,
                        username: profile.username || '',
                        profileImageUrl: profile.profileImageUrl || '',
                        steps: results.find((r: Results) => r.user_id === userId)?.steps || 0,
                        rank: results.find((r: Results) => r.user_id === userId)?.rank || '-1'
                    };
                })
            );
            setResultsWithUserInfo(userInfos);
        } catch (err) {
            console.error('Error fetching user info in results modal:', err);
        }
    };

    useEffect (() => {
        grabUsersInfo();
    }, [results, userID]);

    return (
        <View style={{ marginTop: 20, }}>
            {/* Competition times (based on first item) */}
            {/* {results[0] && (
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <Text>Competition Start: {formatTime(leaderboard[0].start_time)}</Text>
                    <Text>Competition End: {formatTime(leaderboard[0].end_time)}</Text>
                </View>
            )} */}

            <Text style={styles.header}>Hey {name}! Here are the results of the competition:</Text>

            <View style={styles.profileRow}>
                <Image
                    source={
                        userInfo?.profileImageUrl
                            ? { uri: userInfo?.profileImageUrl }
                            : require('@components/blank-profile-picture.png')
                    }
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                        {userInfo?.username}
                    </Text>
                    <Text style={styles.profileSteps}>
                        {userInfo?.steps ?? 0} steps
                    </Text>
                    <Text style={styles.profileRank}>
                        {userInfo?.rank !== '-1' ? `Rank: ${userInfo?.rank}` : 'Rank: N/A'}
                    </Text>
                </View>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Podium for Top 3 */}
                <View style={styles.podiumRow}>
                    {[1, 0, 2].map((podiumIdx, i) => {
                        const user = resultsWithUserInfo[podiumIdx];
                        if (!user) return <View key={i} style={styles.podiumEmpty} />;
                        return (
                            <View key={user?.user_id || i} style={[
                                styles.podiumUser,
                                podiumIdx === 0 && styles.podiumUserFirst
                            ]}>
                                <Image
                                    source={
                                        user?.profileImageUrl
                                            ? { uri: user?.profileImageUrl }
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
                                <Text style={styles.podiumUsername}>{user?.username?.slice(0, 10) || user?.user_id}</Text>
                                <Text style={styles.podiumSteps}>{user?.steps ?? 0} steps</Text>
                            </View>
                        );
                    })}
                </View>
                <View>
                    {resultsWithUserInfo.slice(3).map((user, idx) => (
                        <View
                            key={user.user_id || idx}
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
                            <Text style={styles.leaderboardUsername}>{user.username?.slice(0, 12) || user.user_id}</Text>
                            <Text style={[
                                styles.leaderboardSteps,
                                user.user_id === userID && styles.leaderboardStepsCurrent
                            ]}>{user.steps ?? 0} steps</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 15,
        paddingBottom: 25,
        marginHorizontal: 5,
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
    scrollView: {
        width: '100%',
        backgroundColor: '#00000080',
        borderRadius: 10,
        marginTop: 20,
        maxHeight: '70%',
        padding: 10,
        paddingTop: 25,
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
});

export default ResultsModal;