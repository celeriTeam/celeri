import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useUser } from '../../UserProvider';
import messaging from '@react-native-firebase/messaging';
import { getActiveUserGroupIDs } from '@/backend/src/users';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const PersonalProfilePage: React.FC = () => {
    const { weeklySteps, averageSteps, distance, flights } = useHealthData();
    const { userID, profileImageUrl, username, steps, groupNames, loading } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });
    const router = useRouter();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const authInstance = getAuth();
        try {
            const token = await messaging().getToken()

            if (!token) {
                console.error("Failed to get a valid Firebase token.");
                return;
              }
          
            console.log("Token retrieved successfully:", token);

            const subscribedTopics = await getActiveUserGroupIDs(userID) || [];

            // Ensure 'allUsers' is always included in the topics list
            if (!subscribedTopics.includes("allUsers")) {
                subscribedTopics.push("allUsers");
            }

            // Unsubscribe from all topics
            for (const topic of subscribedTopics) {
                console.log(`Attempting to unsubscribe from topic: ${topic}`);

                try {
                    await messaging().unsubscribeFromTopic(topic);
                    console.log(`Successfully unsubscribed from topic: ${topic}`);
                } catch (error) {
                    console.error(`Error unsubscribing from topic ${topic}:`, error);
                }
            }

            await signOut(authInstance);
            Alert.alert("Success", "You have been logged out.");
            router.replace("/onboarding");
        } catch (error: unknown) {
            if (error instanceof Error) {
                Alert.alert("Error", error.message);
            } else {
                Alert.alert("Error", "An unknown error occurred");
            }
        }
    };

    const handleEditProfile = () => {
        router.push("/(authenticated)/profile/editProfile")
    };

    const StepsChart = ({ weeklySteps }: { weeklySteps: number[] }) => {
        const screenWidth = Dimensions.get('window').width;

        const getLast7DaysLabels = () => {
            const today = new Date();
            const labels = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            }
            
            return labels;
        };
    
        const data = {
            labels: getLast7DaysLabels(),
            datasets: [{
                data: [...weeklySteps, steps]
            }]
        };
    
        return (
            <LineChart
                data={data}
                width={screenWidth - 40} // Account for padding
                height={220}
                chartConfig={{
                    backgroundColor: '#1b2c1c',
                    backgroundGradientFrom: '#1b2c1c',
                    backgroundGradientTo: '#1b2c1c',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(81, 186, 81, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                        borderRadius: 16
                    },
                    propsForDots: {
                        r: "6",
                        strokeWidth: "2",
                        stroke: "#51ba51"
                    }
                }}
                bezier // Makes the line curved
                style={{
                    marginVertical: 8,
                    borderRadius: 16
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
                            <Text style={{ fontFamily: 'Lexend', fontSize: 16, color: '#fff' }}>
                                {tooltipPos.value}
                            </Text>
                        </View>
                    ) : null;
                }}
                onDataPointClick={({x, y, value}) => {
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
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.row}>
                    <Image
                    source={profileImageUrl ? { uri: profileImageUrl } : require('@components/blank-profile-picture.png')}
                    style={styles.profileImage}
                    />
                    <Text style={styles.name}>{username ? username : 'Loading...'}</Text>
                </View>

                <Text style={styles.groupsLabel}>Steps: </Text>
                {averageSteps.length !== 0 ? (
                    StepsChart({ weeklySteps: averageSteps })
                ) : (
                    <Text style={styles.text}>Loading...</Text>
                )}
                
                <Text style={styles.groupsLabel}>Groups:</Text>
                <ScrollView style={styles.scrollContainer}>
                    {groupNames === undefined || groupNames.length === 0 ? (
                        <Text style={styles.text}>No groups found</Text>
                    ) : (
                        groupNames.map((groupName) => (
                            <Text key={groupName} style={styles.text}>{groupName}</Text>
                        ))
                    )}
                </ScrollView>

                <View style={styles.logoutButtonContainer}>
                <TouchableOpacity onPress={handleEditProfile}>
                    <Text style={[styles.buttonText, {color: 'blue'}]}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} disabled={isLoggingOut}>
                    <Text style={[styles.buttonText, {color: 'red'}]}>Log Out</Text>
                </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );

};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        // flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
        marginTop: 50,
        height: '100%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        margin: 30,
        gap: 10,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    name: {
        fontFamily: "Lexend-Bold",
        fontSize: 34,
    },
    groupsLabel: {
        fontFamily: "Lexend-Bold",
        fontSize: 22,
        marginBottom: 10,
    },
    scrollContainer: {
        maxHeight: 150, // Adjust based on your needs
        marginVertical: 10,
        backgroundColor: 'white',
        width: '50%',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: 'gray',
    },
    text: {
        fontFamily: "Lexend",
        fontSize: 18,
        marginBottom: 20,
        // center
        textAlign: 'center',
    },
    buttonText: {
        marginTop: 25,
        fontFamily: "Lexend",
        textAlign: 'center',
        fontSize: 16,
    },
    logoutButtonContainer: {
        position: 'absolute',
        bottom: 30,
        width: '100%',
        alignItems: 'center',
    },
});

// export default ProfileTab;
export default PersonalProfilePage;