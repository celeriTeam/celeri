import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';

type profilePageNavigationProp = StackNavigationProp<RootStackParamList, 'ProfilePage'>;
type profilePageRouteProp = RouteProp<RootStackParamList, 'ProfilePage'>;

type Props = {
    navigation: profilePageNavigationProp;
};

const ProfilePage: React.FC<Props> = ({ navigation }) => {
    const { groups, loading } = useUser();
    const route = useRoute<profilePageRouteProp>();
    const { selectedUserID, groupID } = route.params;

    console.log('selectedUserID: ', selectedUserID);
    const currentProfilePic = groups[groupID]?.users[selectedUserID]?.profilePic || '';
    const currentUserName = groups[groupID]?.users[selectedUserID]?.username || '';
    const currentUserTokens = groups[groupID]?.users[selectedUserID]?.tokens || 0;
    const currentSteps = groups[groupID]?.users[selectedUserID]?.steps || 0;

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
