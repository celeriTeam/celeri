import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useUser } from '../../UserProvider';
import messaging from '@react-native-firebase/messaging';
import { getActiveUserGroupIDs } from '@/backend/src/users';
import { useRouter } from 'expo-router';

const PersonalProfilePage: React.FC = () => {
    const { userID, profileImageUrl, username, steps, groupNames, loading } = useUser();
    const router = useRouter();

    const handleLogout = async () => {
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

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {profileImageUrl ? (
                <Image
                source={{ uri: profileImageUrl }}
                style={styles.profileImage}
                />
            ) : (
                <Image
                source={require('@components/blank-profile-picture.png')}
                style={styles.profileImage}
                />
            )}
            {username ? (
                <Text style={styles.name}>{username}</Text>
            ) : (
                <Text style={styles.name}>Loading...</Text>
            )
            }

            <Text style={styles.groupsLabel}>Steps: </Text>
            {steps != undefined ? (
                <Text style={styles.text}>{steps}</Text>
            ) : (
                <Text style={styles.text}>Loading...</Text>
            )
            }
            
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
            <TouchableOpacity onPress={handleLogout}>
                <Text style={[styles.buttonText, {color: 'red'}]}>Log Out</Text>
            </TouchableOpacity>
            </View>
        </View>
    );

}


// const ProfileStack = createStackNavigator();

// const ProfileTab: React.FC = () => {
//     return (
//         <ProfileStack.Navigator>
//             <ProfileStack.Screen name="ProfilePage" component={PersonalProfilePage} options={{ headerShown: false }} />
//             <ProfileStack.Screen name="EditProfile" component={EditProfilePage} options={{ headerShown: false }} />
//         </ProfileStack.Navigator>
//     );
// };

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
    },
    profileImage: {
        marginTop: 40,
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 20,
    },
    name: {
        fontFamily: "Lexend-Bold",
        fontSize: 34,
        marginBottom: 40,
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