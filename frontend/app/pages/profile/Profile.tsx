import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import EditProfilePage from './EditProfile';
import { getProfilePic, getSteps, getUserName } from '@backend/src/users';
import { useUser } from '../../UserProvider';
import { getUserTokens } from '@/backend/src/groups';

type profilePageNavigationProp = StackNavigationProp<RootStackParamList, 'ProfilePage'>;
type profilePageRouteProp = RouteProp<RootStackParamList, 'ProfilePage'>;

type Props = {
    navigation: profilePageNavigationProp;
};

const ProfilePage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<profilePageRouteProp>();
    const { selectedUserID, groupID } = route.params;
    const [currentProfilePic, setCurrentProfilePic] = useState<string | undefined>(undefined);
    const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
    const [currentUserTokens, setCurrentUserTokens] = useState<number | undefined>(undefined);
    const [currentSteps, setCurrentSteps] = useState<number | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserData = async () => {
        try {
            console.log('selectedUserID: ', selectedUserID);
            const profilePic = await getProfilePic(selectedUserID);
            setCurrentProfilePic(profilePic);
            const name = await getUserName(selectedUserID);
            setCurrentUserName(name);
            const tokens = await getUserTokens(selectedUserID, groupID);
            setCurrentUserTokens(tokens);
            const steps = await getSteps(selectedUserID);
            setCurrentSteps(steps);
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Image
                    source={require('@components/back-icon.png')}
                    style={styles.backImage}
                />
            </TouchableOpacity>
            {currentProfilePic ? (
                <Image
                source={{ uri: currentProfilePic }}
                style={styles.profileImage}
                />
            ) : (
                <Image
                source={require('@components/blank-profile-picture.png')}
                style={styles.profileImage}
                />
            )}
            {currentUserName ? (
                <Text style={styles.name}>{currentUserName}</Text>
            ) : (
                <Text style={styles.name}>Loading...</Text>
            )
            }

            <Text style={styles.groupsLabel}>Steps: </Text>
            {currentSteps != undefined ? (
                <Text style={styles.text}>{currentSteps}</Text>
            ) : (
                <Text style={styles.text}>Loading...</Text>
            )
            }

            <Text style={styles.groupsLabel}>Tokens: </Text>
            {currentUserTokens != undefined ? (
                <Text style={styles.text}>{currentUserTokens}</Text>
            ) : (
                <Text style={styles.text}>Loading...</Text>
            )
            }
        </View>
    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginBottom: 20,
    },
});

export default ProfilePage;
