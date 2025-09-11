import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { getAuth, signOut } from "@react-native-firebase/auth";
import { useUser } from '../../../UserProvider';
import messaging from '@react-native-firebase/messaging';
import { editName, editProfilePic, editUsername, getActiveUserGroupIDs } from '@/backend/src/users';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const PersonalProfilePage: React.FC = () => {
    const { averageSteps, distance, flights } = useHealthData();
    const { userID, profileImageUrl, username, name, steps, groupNames, loading } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [editProfileModal, setEditProfileModal] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });
    const inputRef = useRef<TextInput>(null);
    const [currentName, setCurrentName] = useState(name);
    const [currentUsername, setCurrentUsername] = useState(username);
    const [currentPic, setCurrentPic] = useState(profileImageUrl);
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

    useEffect(() => {
        if (editProfileModal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editProfileModal]);

    const handleCloseEdit = () => {
        setEditProfileModal(false);
        setCurrentName(name);
        setCurrentUsername(username);
        setCurrentPic(profileImageUrl);
    }

    const handleEdit = async () => {
        if (currentName !== name) {
            editName(userID, currentName);
        }
        if (currentUsername !== username) {
            editUsername(userID, currentUsername);
        }
        if (currentPic !== profileImageUrl) {
            editProfilePic(userID, currentPic);
        }
        setEditProfileModal(false);
    };

    const pickImage = async () => {
        // Request permission to access the media library
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert('Permission Required', 'Please grant media library permissions to select a profile image.');
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            if (selectedAsset.uri) {
                // Compress and resize the image
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    selectedAsset.uri,
                    [{ resize: { width: 800 } }], // Resize to 800px width
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                setCurrentPic(manipulatedImage.uri);
            }
        }
    };

    const StepsChart = ({ weeklySteps }: { weeklySteps: number[] }) => {
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

    // if (loading) {
    //     return (
    //         <LinearGradient
    //             colors={['#000000', '#024405']}
    //             style={{
    //                 flex: 1,
    //                 width: '100%',
    //             }}
    //         >
    //             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    //                 <ActivityIndicator size="large" />
    //                 <Text style={{ color: '#fff' }}>Loading...</Text>
    //             </View>
    //         </LinearGradient>
    //     );
    // }

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

                    <TouchableOpacity 
                        style={styles.friendsButton}
                        onPress={() => router.push('/profile/friends')}
                    >
                        <Image
                            source={require('@assets/icons/friends.png')}
                            style={styles.friendsIcon}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setEditProfileModal(true)} activeOpacity={0.8}>
                        <Image
                            source={profileImageUrl != '' ? { uri: profileImageUrl } : require('@components/blank-profile-picture.png')}
                            style={styles.profileImage}
                        />
                        {/* <View style={styles.whiteCircle}>
                            <Image
                                source={require('@assets/icons/editBlack.png')}
                                style={styles.editImage}
                            />
                        </View> */}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditProfileModal(true)} activeOpacity={0.8}>
                        <Text style={styles.name}>{name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditProfileModal(true)} style={{ padding: scale(5), }} activeOpacity={0.8}>
                        <Text style={styles.username}>@{username}</Text>
                    </TouchableOpacity>

                    <Text style={styles.groupsLabel}>Steps This Week</Text>
                    {averageSteps.length !== 0 ? (
                        averageSteps.every(step => step === 0) ? (
                            <Text style={styles.healthPermissionsText}>Health data permissions are required to use this app.{`\n`}Go to Settings to enable this.</Text>
                        ) : (
                            StepsChart({ weeklySteps: averageSteps })
                        )
                    ) : (
                        <Text style={styles.text}>Loading...</Text>
                    )}

                    <TouchableOpacity onPress={() => setEditProfileModal(true)} style={[styles.logoutButton, { borderColor: '#fff' }]}>
                        <Text style={[styles.logoutText, { color: '#fff', }]}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleLogout} disabled={isLoggingOut} style={[styles.logoutButton, { borderColor: '#74FF6D' }]}>
                        <Text style={[styles.logoutText, { color: '#74FF6D', }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>
                <Modal
                    transparent={true}
                    visible={editProfileModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.header}>
                                <TouchableOpacity onPress={handleCloseEdit} activeOpacity={1}>
                                    <Text style={styles.headerText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleEdit} style={styles.saveButton} activeOpacity={1}>
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.imageContainer}>
                                <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={1}>
                                    <Image
                                        source={currentPic != '' ? { uri: currentPic } : require('@components/blank-profile-picture.png')}
                                        style={styles.profileImageEdit}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={1}>
                                    <Text style={styles.editImageText}>Change or Upload Profile Photo</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                ref={inputRef}
                                style={styles.nameInput}
                                value={currentName}
                                onChangeText={setCurrentName}
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25, }}>
                                <Text style={{ fontFamily: 'Lexend', color: '#fff', fontSize: 17, width: '5%', marginLeft: 17, }}>@</Text>
                                <TextInput
                                    ref={inputRef}
                                    style={[styles.nameInput, { width: '84%', marginLeft: 5, }]}
                                    value={currentUsername}
                                    onChangeText={setCurrentUsername}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );

};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
    },
    friendsButton: {
        position: 'absolute',
        top: scale(16),     
        right: scale(16),
        width: 32,
        height: 32,
        padding: 8,
    },
    friendsIcon: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
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
        width: 110,
        height: 110,
        borderRadius: 60,
        marginBottom: 20,
        borderColor: '#74FF6D',
        borderWidth: 2,
    },
    profileImageEdit: {
        width: 110,
        height: 110,
        borderRadius: 60,
        borderColor: '#74FF6D',
        borderWidth: 2,
        marginBottom: 20,
    },
    editImageText: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#74FF6D',
        marginBottom: 30,
    },
    whiteCircle: {
        position: 'absolute',
        bottom: 20,
        right: 0,
        width: 34,
        height: 34,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editImage: {
        width: 14,
        height: 14,
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
        textAlign: 'center',
        color: '#fff',
    },
    healthPermissionsText: {
        fontFamily: "Lexend",
        fontSize: 14,
        paddingHorizontal: 20,
        paddingVertical: 10,
        textAlign: 'left',
        color: '#ffffffbb',
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
    logoutText: {
        fontFamily: "Lexend",
        fontSize: 14,
        textAlign: 'center',
    },
    logoutButton: {
        marginTop: 15,
        borderWidth: 1,
        borderRadius: 25,
        padding: 10,
        // paddingHorizontal: 50,
        // set width
        width: '40%',
    },

    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'black',
        position: 'absolute',
        top: '11%',
        borderWidth: 1,
        borderColor: '#A7A7A7',
        borderRadius: 20,
    },
    imageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameInput: {
        fontFamily: "Lexend",
        fontSize: 17,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#656565',
        backgroundColor: '#000', // Light gray input area
        padding: 13,
        marginHorizontal: 17,
        marginVertical: 5,
        borderRadius: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 25,
    },
    headerText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#fff',
    },
    saveText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#74FF6D',
    },
    saveButton: {
        borderColor: '#74FF6D',
        borderWidth: 1,
        borderRadius: 25,
        padding: 5,
        paddingHorizontal: 20
    },
});

export default PersonalProfilePage;