import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, Image } from 'react-native';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRoute } from '@react-navigation/native';
import { getProfilePic, getUserGroups, getUserName } from '../../database';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useFocusEffect } from '@react-navigation/native';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'ProfileTab'>;
};


const ProfileTab: React.FC<Props> = ({ navigation }) => {
    const route = useRoute();
    const { userID } = route.params as { userID: string };
    const [user, setUser] = useState<User | null>(null);
    const [currentProfilePic, setCurrentProfilePic] = useState<string | undefined>(undefined);
    const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
    const [currentUserGroups, setCurrentUserGroups] = useState<string[] | undefined>(undefined);

    const fetchUserData = async () => {
        try {
            const profilePic = await getProfilePic(userID);
            setCurrentProfilePic(profilePic);
            const name = await getUserName(userID);
            setCurrentUserName(name);
            const groups = await getUserGroups(userID);
            setCurrentUserGroups(groups);
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    useEffect(() => {
        const authInstance = getAuth();
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            setUser(currentUser);
        });

        fetchUserData();

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, [userID]);

    useFocusEffect(
        useCallback(() => {
            fetchUserData();
        }, [])
    );

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
        navigation.navigate('EditProfile', { userID, profilePic: currentProfilePic || '', username: currentUserName || '' });
    };

    return (
        <View style={styles.container}>
            {currentProfilePic ? (
                <Image
                source={{ uri: currentProfilePic }}
                style={styles.profileImage}
                />
            ) : (
                <Image
                source={require('../../../components/blank-profile-picture.png')}
                style={styles.profileImage}
                />
            )}
            {currentUserName ? (
                <Text style={styles.name}>{currentUserName}</Text>
            ) : (
                <Text style={styles.name}>Loading...</Text>
            )
            }
            
            <Text style={styles.groupsLabel}>Groups:</Text>
            {currentUserGroups === undefined || currentUserGroups.length === 0 ? (
                <Text style={styles.text}>No groups found</Text>
            ) : (
                currentUserGroups.map((groupName) => (
                    <Text key={groupName} style={styles.text}>{groupName}</Text>
                ))
            )}

            <View style={styles.logoutButtonContainer}>
            <Button title="Edit Profile" onPress={handleEditProfile} />
                <Button title="Log Out" onPress={handleLogout} />
            </View>
        </View>
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
        width: 100,
        height: 100,
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
        marginBottom: 5,
    },
    logoutButtonContainer: {
        position: 'absolute',
        bottom: 30,
        width: '100%',
        alignItems: 'center',
    },
});

export default ProfileTab;
