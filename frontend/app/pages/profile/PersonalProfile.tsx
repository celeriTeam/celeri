import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import EditProfilePage from './EditProfile';
import { useUser } from '../../UserProvider';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'PersonalProfilePage'>;
};

const PersonalProfilePage: React.FC<Props> = ({ navigation }) => {
    const { profileImageUrl, username, steps, groupNames, loading } = useUser();

    const handleLogout = async () => {
        const authInstance = getAuth();
        try {
            await signOut(authInstance);
            Alert.alert("Success", "You have been logged out.");
            navigation.navigate("Register");
        } catch (error: unknown) {
            if (error instanceof Error) {
                Alert.alert("Error", error.message);
            } else {
                Alert.alert("Error", "An unknown error occurred");
            }
        }
    };

    const handleEditProfile = () => {
        navigation.navigate('EditProfile');
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
            {groupNames === undefined || groupNames.length === 0 ? (
                <Text style={styles.text}>No groups found</Text>
            ) : (
                groupNames.map((groupName) => (
                    <Text key={groupName} style={styles.text}>{groupName}</Text>
                ))
            )}

            <View style={styles.logoutButtonContainer}>
            <Button title="Edit Profile" onPress={handleEditProfile} />
                <Button title="Log Out" onPress={handleLogout} />
            </View>
        </View>
    );

}


const ProfileStack = createStackNavigator();

const ProfileTab: React.FC = () => {
    return (
        <ProfileStack.Navigator>
            <ProfileStack.Screen name="ProfilePage" component={PersonalProfilePage} options={{ headerShown: false }} />
            <ProfileStack.Screen name="EditProfile" component={EditProfilePage} options={{ headerShown: false }} />
        </ProfileStack.Navigator>
    );
};

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
        borderRadius: 50,
        marginBottom: 20,
    },
    name: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    groupsLabel: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 10,
    },
    text: {
        fontSize: 18,
        marginBottom: 20,
    },
    logoutButtonContainer: {
        position: 'absolute',
        bottom: 30,
        width: '100%',
        alignItems: 'center',
    },
});

export default ProfileTab;
