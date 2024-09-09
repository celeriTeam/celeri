import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, Image, Button, StyleSheet, Alert, Pressable, Keyboard, TouchableOpacity,
    SafeAreaView, TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, auth, db } from "@firebaseConfig";
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { CTAButton } from "@components/CTAButton";
import { generateGroupCode, createGroup, addGroupImage } from '@backend/src/groups';
import { addGroupToUser } from '@backend/src/users';
import { useUser } from '../../UserProvider';


type CreateGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGroup'>;
type CreateGroupRouteProp = RouteProp<RootStackParamList, 'CreateGroup'>;

type Props = {
    navigation: CreateGroupPageNavigationProp;
};

const CreateGroupPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const [groupName, setGroupName] = useState<string | undefined>();
    const [groupImage, setGroupImage] = useState<string | undefined>();
    const [users, setUsers] = useState<Map<string, Map<string, any>> | undefined>();


    const createGroupFnc = async () => {
        const groupCode = await generateGroupCode();
        const groupID: any = await createGroup(userID, groupName || '', groupCode);
        await addGroupImage(groupID, groupImage || '');
        await addGroupToUser(userID, groupID);
        navigation.navigate('InviteGroup', { groupID: groupID, fromCreate: true });
    }

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
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            if (selectedAsset.uri) {
                setGroupImage(selectedAsset.uri);
            }
        }
    };

    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.row}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={require('@components/back-icon.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Fill out group info!</Text>
                    </View>
                </View>
                <View style={styles.mainContent}>
                    <TextInput
                        style={styles.loginTextField}
                        placeholder="Group Name"
                        value={groupName}
                        onChangeText={setGroupName}
                        placeholderTextColor="#999797"
                    />

                    <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
                        <Text style={styles.button_text2}>Pick Group Image</Text>
                    </TouchableOpacity>
                    {groupImage && (
                        <Image source={{ uri: groupImage }} style={styles.groupImage} />
                    )}
                </View>

                <CTAButton
                    title="Create Group"
                    onPress={createGroupFnc}
                    variant="primary"
                />
            </View>
        </Pressable>
    )
};

const styles = StyleSheet.create({
    input: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backImage: {
        width: 30,
        height: 30,
    },
    text: {
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 24,
    },
    button_text: {
        textAlign: "center",
        fontSize: 24,
        color: "#1976d2"
    },
    button_text2: {
        color: 'white',
        fontSize: 16,
    },
    button_container: {
        borderRadius: 15,
        flexDirection: "row",
        margin: 16,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#e6e6e6"
    },
    imagePickerButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#1976d2',
        borderRadius: 5,
    },
    contentView: {
        flex: 1,
        backgroundColor: "white",
    },
    titleContainer: {
        flex: 1.2,
        justifyContent: "center",
    },
    titleText: {
        fontSize: 36,
        textAlign: "center",
        fontWeight: "200",
    },
    loginTextField: {
        borderBottomWidth: 1,
        height: 60,
        fontSize: 25,
        marginVertical: 10,
        fontWeight: "300",
    },
    mainContent: {
        flex: 6,
    },
    groupImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginVertical: 10,
    },
});

export default CreateGroupPage;
