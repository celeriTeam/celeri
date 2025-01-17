import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '../../../UserProvider';
import { createNudge } from '@/backend/src/notifs';
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';


const ProfilePage: React.FC = () => {
    const { username, groups, loading } = useUser();
    const { selectedUserIDTemp, groupIDTemp } = useLocalSearchParams();

    // Convert parameters to strings
    const selectedUserID = selectedUserIDTemp ? String(selectedUserIDTemp) : '';
    const groupID = groupIDTemp ? String(groupIDTemp) : '';

    console.log('selectedUserID: ', selectedUserID);
    const currentProfilePic = groups[groupID]?.users[selectedUserID]?.profilePic || '';
    const currentUserName = groups[groupID]?.users[selectedUserID]?.username || '';
    const currentUserTokens = groups[groupID]?.users[selectedUserID]?.tokens || 0;
    const currentSteps = groups[groupID]?.users[selectedUserID]?.steps || 0;
    const [nudgeMessage, setNudgeMessage] = useState<string>('');
    const [modalVisible, setModalVisible] = useState<boolean>(false);

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
            const userRef = firestore().collection('users').doc(selectedUserID);
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
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
                {/* Nudge Button */}
                <TouchableOpacity style={styles.nudgeButton} onPress={() => setModalVisible(true)}>
                    <Text style={styles.nudgeButtonText}>Nudge</Text>
                </TouchableOpacity>

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
    );

}

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
        fontFamily: "Lexend-Bold",
        fontSize: 34,
        marginBottom: 40,
    },
    groupsLabel: {
        fontFamily: "Lexend-Bold",
        fontSize: 24,
        marginBottom: 10,
    },
    text: {
        fontFamily: "Lexend",
        fontSize: 18,
        marginBottom: 20,
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
    nudgeButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginTop: 20 },
    nudgeButtonText: { color: '#fff', fontWeight: 'bold' },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { width: 300, padding: 20, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    textInput: { height: 100, borderColor: '#ccc', borderWidth: 1, width: '100%', padding: 10, marginBottom: 10, textAlignVertical: 'top' },
});

export default ProfilePage;
