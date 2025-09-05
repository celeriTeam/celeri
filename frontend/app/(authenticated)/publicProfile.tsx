import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, Button, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '../UserProvider';
import { useRouter, useLocalSearchParams, RelativePathString } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';

import { fetchPublicProfileData, PublicProfileData, requestFriend, acceptRequest, cancelRequest, removeFriend } from '@/backend/src/friends'

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type ActionState =
    | 'idle'      // normal, use profile.friendStatus for label
    | 'requested' // after you’ve sent a request
    | 'accepted'  // after you’ve accepted a request
    | 'removed'   // after you’ve removed a friend
    | 'canceled'  // after you’ve canceled a request

const ProfilePage: React.FC = () => {

    const { from, id } = useLocalSearchParams<{
        from?: RelativePathString
        id: string
    }>()
    const { userID } = useUser();
    const router = useRouter();

    const [profile, setProfile] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });

    const [actionState, setActionState] = useState<ActionState>('idle');


    const loadProfile = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await fetchPublicProfileData(userID, id);
            if (data) {
                setProfile(data);
            } else {
                setError('Profile not found.');
            }
        } catch (err: any) {
            setError(err.message || 'Error loading profile.');
        } finally {
            setLoading(false);
        }
    }, [userID])

    useEffect(() => {
        loadProfile();
    }, [loadProfile])

    // when profile first loads, sync actionState to reflect their status
    useEffect(() => {
        if (!loading && profile) {
            switch (profile.friendStatus) {
                case 'request':
                    setActionState('idle');
                    break;
                case 'cancel':
                    setActionState('requested');
                    break;
                case 'accept':
                    setActionState('idle');
                    break;
                case 'remove':
                    setActionState('accepted');
                    break;
            }
        }
    }, [loading, profile])

    const handleFriendPress = async () => {
        if (!profile) return;

        try {
            switch (profile.friendStatus) {
                case 'request':
                    await requestFriend(userID, id);
                    setActionState('requested');
                    break;
                case 'cancel':
                    await cancelRequest(userID, id);
                    setActionState('canceled');
                    break;
                case 'accept':
                    await acceptRequest(userID, id);
                    setActionState('accepted');
                    break;
                case 'remove':
                    await removeFriend(userID, id);
                    setActionState('removed');
                    break;
            }
        } catch (err) {
            Alert.alert('Error', 'Couldn\'t update friendship status. Please try again.');
        }
    }

    const handleBack = () => {
        if (from) {
            router.replace(from);
        } else if (router.canGoBack()) {
            router.back();
        } else {
            router.push('/');   // or `/friends` if that’s your real home
        }
    }

    const StepsChart = ({ weeklySteps, steps }: { weeklySteps: number[], steps: number }) => {
        const screenWidth = Dimensions.get('window').width;

        const getLast8DaysLabels = () => {
            const today = new Date();
            const labels = [];

            for (let i = 7; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            }

            return labels;
        };

        const data = {
            labels: getLast8DaysLabels(),
            datasets: [{
                data: weeklySteps.length === 7 ? [...weeklySteps, steps] : weeklySteps
            }]
        };

        return (
            <LineChart
                data={data}
                width={screenWidth - 40}
                height={verticalScale(240)}
                yAxisInterval={1}
                fromZero={true}
                withVerticalLabels={true}
                chartConfig={{
                    backgroundColor: 'rgba(2, 68, 5, 1)',
                    backgroundGradientFrom: 'rgba(2, 68, 5, 1)',
                    backgroundGradientTo: 'rgba(2, 68, 5, 1)',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(81, 186, 81, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    propsForBackgroundLines: {
                        strokeWidth: 1,
                        stroke: "rgba(0, 255, 0, 0.3)",
                        strokeDasharray: "" // Solid lines
                    },
                    style: {
                        borderRadius: 16
                    },
                    propsForDots: {
                        r: "6",
                        strokeWidth: "2",
                        stroke: "#00FF00"
                    },
                    propsForLabels: {
                        fontFamily: 'Lexend',
                        fontSize: 11,
                    },
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

    if (loading) {
        return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Image
                            source={require('@assets/icons/back.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>

                    <Image
                        source={profile?.profileImageUrl != '' ? { uri: profile?.profileImageUrl } : require('@components/blank-profile-picture.png')}
                        style={styles.profileImage}
                    />
                    <Text style={styles.name}>{profile?.name ? profile?.name : 'Loading...'}</Text>
                    <Text style={styles.username}>@{profile?.username ? profile?.username : 'Loading...'}</Text>

                    {/* Friend Button */}
                    <TouchableOpacity
                        disabled={actionState !== 'idle'}
                        style={[
                            styles.friendButton,
                            actionState !== 'idle' && styles.addFriendButtonDisabled,
                        ]}
                        onPress={handleFriendPress}
                    >
                        <Text style={styles.friendButtonText}>
                            {{
                                idle: profile!.friendStatus === 'accept'
                                    ? 'Accept'
                                    : profile!.friendStatus === 'remove'
                                        ? 'Remove'
                                        : profile!.friendStatus === 'cancel'
                                            ? 'Cancel'
                                            : 'Request',
                                requested: 'Requested',
                                accepted: 'Friends',
                                removed: 'Removed',
                                canceled: 'Canceled',
                            }[actionState]}
                        </Text>
                    </TouchableOpacity>

                    {profile?.friendStatus === 'remove' && (
                        <>
                            <Text style={styles.groupsLabel}>Steps This Week</Text>
                            {profile?.averageSteps.length !== 0 ? (
                                profile?.averageSteps.length === 1 && profile?.averageSteps[0] === 0 ? (
                                    <Text style={styles.text}>0</Text>
                                ) : (
                                    <StepsChart weeklySteps={profile?.averageSteps} steps={profile?.steps} />
                                )
                            ) : (
                                <Text style={styles.text}>Loading...</Text>
                            )}
                        </>
                    )}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
    },
    backImage: {
        width: 24,
        height: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        margin: 30,
        marginBottom: 20,
        gap: 10,
    },
    profileImage: {
        marginTop: 0,
        width: 110,
        height: 110,
        borderRadius: 60,
        marginBottom: 10,
        borderColor: '#74FF6D',
        borderWidth: 2,
    },
    name: {
        fontFamily: "Lexend",
        fontSize: 25,
        color: '#fff',
    },
    username: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#74FF6D',
    },
    groupsLabel: {
        alignSelf: 'flex-start',
        left: 5,
        fontFamily: "Lexend",
        fontSize: 16,
        marginTop: 20,
        marginBottom: 5,
        color: '#fff',
    },
    text: {
        fontFamily: "Lexend",
        fontSize: 18,
        marginBottom: 20,
        color: '#fff',
    },
    characterCountContainer: {
        position: 'absolute',
        bottom: 45,
        right: 20,
    },
    characterCountText: {
        fontSize: 12,
        color: '#999',
    },
    friendButton: {
        marginTop: 20,
        borderWidth: 1,
        borderRadius: 25,
        padding: 10,
        width: '40%',
        borderColor: '#fff',
    },
    addFriendButtonDisabled: {
        opacity: 0.5,
    },
    friendButtonText: {
        fontFamily: "Lexend",
        fontSize: 14,
        textAlign: 'center',
        color: '#fff',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#65656580',
        paddingHorizontal: 20,
        borderRadius: 20,
        padding: 15,
        marginBottom: 5,
        width: '100%',
        gap: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000080',
        borderRadius: 15,
        padding: 10,
        width: '30%',
    },
    statValue: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 13,
    },
    tokensIcon: {
        width: 16,
        height: 16,
    },
    betTokensIcon: {
        width: 15,
        height: 15,
    },
    diamondsIcon: {
        width: 14,
        height: 12,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10
    },
    textInput: {
        height: 100,
        borderColor: '#ccc',
        borderWidth: 1,
        width: '100%',
        padding: 10,
        marginBottom: 10,
        textAlignVertical: 'top'
    },
});

export default ProfilePage;