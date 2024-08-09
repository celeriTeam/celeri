import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Button } from 'react-native';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRoute } from '@react-navigation/native';
import { getUserGroups, getGroupName, getUserName } from '../../database';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'ProfileTab'>;
};


const ProfileTab: React.FC<Props> = ({ navigation }) => {
    const route = useRoute();
    const { userID } = route.params as { userID: string };
    const [user, setUser] = useState<User | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
    const [currentUserGroups, setCurrentUserGroups] = useState<string[] | undefined>(undefined);

    useEffect(() => {
        const authInstance = getAuth();
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            setUser(currentUser);
        });

        const fetchUserData = async () => {
            try {
                const name = await getUserName(userID);
                setCurrentUserName(name);
                const groups = await getUserGroups(userID);
                setCurrentUserGroups(groups);
                console.log(name)
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, [userID]);

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

    return (
        <View style={styles.container}>
            <Text style={styles.name}>{currentUserName}</Text>
            <Text style={styles.text}>Groups:</Text>

            {currentUserGroups === null || currentUserGroups === undefined ? (
                <Text style={styles.text}>No groups found</Text>
            ) : (
                currentUserGroups.map((groupName) => (
                    <Text key={groupName} style={styles.text}>{groupName}</Text>
                ))
            )}

            <Button title="Log Out" onPress={handleLogout} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 18,
        marginBottom: 8,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        paddingHorizontal: 8,
        marginBottom: 16,
        width: '100%',
        maxWidth: 300,
    },
    text: {
        fontSize: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 34,
        marginBottom: 16,
    }
});

export default ProfileTab;
