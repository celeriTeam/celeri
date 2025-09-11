import React, { useState } from 'react';
import { View, Text, Alert, Button, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '@/app/UserProvider';
import { createNudge } from '@backend/src/notifs';
import { doc } from '@react-native-firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';
import { db } from '@firebaseConfig';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const ProfilePage: React.FC = () => {
    const { username, groups, loading } = useUser();
    const {
        selectedUserIDTemp,
        groupIDTemp,
        averageStepsTemp,
        stepsTemp
    } = useLocalSearchParams();

    // Convert parameters to strings
    const selectedUserID = selectedUserIDTemp ? String(selectedUserIDTemp) : '';
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const averageSteps = Array.isArray(averageStepsTemp)
        ? averageStepsTemp.map(num => Math.floor(Number(num)))
        : typeof averageStepsTemp === 'string'
            ? averageStepsTemp.split(',').map(num => Math.floor(Number(num)))
            : [];
    const steps = stepsTemp ? Math.floor(Number(stepsTemp)) : 0;

    const currentProfilePic = groups[groupID]?.users[selectedUserID]?.profilePic || '';
    const currentName = groups[groupID]?.users[selectedUserID]?.name || '';
    const currentUserName = groups[groupID]?.users[selectedUserID]?.username || '';
    const currentUserTokens = groups[groupID]?.users[selectedUserID]?.tokens || 0;
    const currentUserBetTokens = groups[groupID]?.users[selectedUserID]?.betOnTokens || 0;
    const currentUserDiamonds = groups[groupID]?.users[selectedUserID]?.diamonds || 0;
    const currentSteps = groups[groupID]?.users[selectedUserID]?.steps || 0;
    const [nudgeMessage, setNudgeMessage] = useState<string>('');
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });

    const router = useRouter();

    // Function to handle sending the nudge notification
    const handleSendNudge = async () => {
        if (nudgeMessage.length > 250) {
            Alert.alert("Message too long", "Please keep the message within 250 characters.");
            return;
        }

        // Close the modal after sending the notification
        setModalVisible(false);

        try {
            // Assume userID has already been set and tokens are saved in Firestore
            const userRef = doc(db, 'users', selectedUserID);
            const userDoc = await userRef.get();
            const tokens = userDoc.data()?.tokens || [];

            createNudge(username, groupID, nudgeMessage, tokens);


            Alert.alert("Nudge sent!", "Your nudge message was successfully sent.");
        } catch (error) {
            console.error("Error sending nudge notification:", error);
            Alert.alert("Error", "Failed to send nudge notification.");
        }

        // Reset the message
        setNudgeMessage('');
    };

    const StepsChart = ({ weeklySteps }: { weeklySteps: number[] }) => {
        const screenWidth = Dimensions.get('window').width;
        console.log('weeklySteps: ', weeklySteps);

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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
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
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Image
                            source={require('@assets/icons/back.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>

                    <Image
                        source={currentProfilePic != '' ? { uri: currentProfilePic } : require('@components/blank-profile-picture.png')}
                        style={styles.profileImage}
                    />
                    <Text style={styles.name}>{currentName ? currentName : 'Loading...'}</Text>
                    <Text style={styles.username}>@{currentUserName ? currentUserName : 'Loading...'}</Text>

                    {/* Nudge Button */}
                    <TouchableOpacity style={styles.nudgeButton} onPress={() => setModalVisible(true)}>
                        <Text style={styles.nudgeButtonText}>Nudge</Text>
                    </TouchableOpacity>

                    <Text style={styles.groupsLabel}>Total Stats</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Image
                                source={require('@assets/icons/tokens.png')}
                                style={styles.tokensIcon}
                            />
                            <Text style={styles.statValue}> {currentUserTokens}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Image
                                source={require('@assets/icons/betTokens.png')}
                                style={styles.betTokensIcon}
                            />
                            <Text style={styles.statValue}> {currentUserBetTokens}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Image
                                source={require('@assets/icons/diamonds.png')}
                                style={styles.diamondsIcon}
                            />
                            <Text style={styles.statValue}> {currentUserDiamonds}</Text>
                        </View>
                    </View>

                    <Text style={styles.groupsLabel}>Steps This Week</Text>
                    {averageSteps.length !== 0 ? (
                        averageSteps.length === 1 && averageSteps[0] === 0 ? (
                            <Text style={styles.text}>0</Text>
                        ) : (
                            StepsChart({ weeklySteps: averageSteps })
                        )
                    ) : (
                        <Text style={styles.text}>Loading...</Text>
                    )}

                    {/* Nudge Message Modal */}
                    <Modal
                        // animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Send a Nudge</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Type your message here..."
                                    value={nudgeMessage}
                                    onChangeText={(text) => setNudgeMessage(text)}
                                    maxLength={250}
                                />
                                {/* Character Count */}
                                <View style={styles.characterCountContainer}>
                                    <Text style={styles.characterCountText}>
                                        {nudgeMessage.length}/250
                                    </Text>
                                </View>
                                <Button title="Send Nudge" onPress={handleSendNudge} />
                                <Button title="Cancel" color="red" onPress={() => setModalVisible(false)} />
                            </View>
                        </View>
                    </Modal>
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
    nudgeButton: {
        marginTop: 20,
        borderWidth: 1,
        borderRadius: 25,
        padding: 10,
        width: '40%',
        borderColor: '#fff',
    },
    nudgeButtonText: {
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