import React, {useState, useRef, useEffect} from 'react';
import { View, Text, Image, Button, StyleSheet, Alert, Pressable, Keyboard, TouchableOpacity, 
    SafeAreaView, TextInput, 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, auth, db} from "../../../firebaseConfig";
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { CTAButton } from "../../../components/CTAButton";


type CreateGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGroup'>;

type Props = {
    navigation: CreateGroupPageNavigationProp;
};

const CreateGroupPage: React.FC<Props> = ({ navigation }) => {

    const [groupName, setGroupName] = useState<string | undefined>();
    const [groupImage, setGroupImage] = useState<string | undefined>();
    const [users, setUsers] = useState<Map<string, Map<string, any>> | undefined>();

    const storage = getStorage(app);
    const route = useRoute();
    //const { userID } = route.params as { userID: string };

    const createGroup = async () => {
        try{
            const user = auth.currentUser;
            let userID = user?.uid || '';
            console.log("userID here: ", userID);
            const profileImageUrl = await uploadProfileImage(userID);
            await addDoc(collection(db, 'groups'), { 
                groupName,
                "users": {
                    [userID]: {
                        "placedBet": false,
                        "tokens": 0,
                    },
                },
                "createdAt": serverTimestamp(),
                "updatedAt": serverTimestamp(),
                profileImageUrl,
            })
            console.log('Group created on Firebase.');
        } catch (error) {
            console.error("Error creating user profile:", error);
            Alert.alert('Error', 'Failed to create user profile.');
        }
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

    const uploadProfileImage = async (userId: string): Promise<string | null> => {
        if (!groupImage) return null;
    
        try {
          const response = await fetch(groupImage);
          const blob = await response.blob();
          const storageRef = ref(storage, `profileImages/${userId}`);
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);
    
          return url;
        } catch (error) {
          console.error('Error uploading profile image:', error);
          Alert.alert('Error', 'Failed to upload profile image.');
          return null;
        }
    };

    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.contentView}>
          <View style={styles.container}>
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Fill out group info!</Text>
            </View>
            <View style={styles.mainContent}>
              <TextInput
                style={styles.loginTextField}
                placeholder="Group Name"
                value={groupName}
                onChangeText={setGroupName}
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
              onPress={createGroup}
              variant="primary"
            />

            <Button title="Back" onPress={() => navigation.goBack()} />
          </View>
        </SafeAreaView>
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
      text: {
          fontWeight:"bold",
          textAlign:"center",
          fontSize:24,
      },
      button_text: {
          textAlign:"center",
          fontSize:24,
          color:"#1976d2"
      },
      button_text2: {
          color: 'white',
          fontSize: 16,
        },
      button_container: {
          borderRadius: 15,
          flexDirection: "row",
          margin: 16,
          padding:24,
          justifyContent:"center",
          backgroundColor:"#e6e6e6"
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
          fontSize: 45,
          textAlign: "center",
          fontWeight: "200",
        },
        loginTextField: {
          borderBottomWidth: 1,
          height: 60,
          fontSize: 30,
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
