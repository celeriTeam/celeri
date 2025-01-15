import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Pressable, TouchableOpacity, Keyboard, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { getGroupFromCode, addUserToGroup, getGroupIsGameActive } from '@backend/src/groups';
import { addGroupToUser } from '@backend/src/users';
import { useUser } from '../../../UserProvider';
import { useRouter } from 'expo-router'


const JoinGroupPage: React.FC= () => {
    const { userID } = useUser();
    const [groupCode, setGroupCode]= useState('');
    const [currrentGroupInUserResponse, setCurrentGroupInUserResponse] = useState<string | undefined>(undefined);

    const router = useRouter();
    
    const ToGroupFromJoin = async () => {
        console.log("Enter button pressed");
        console.log("Group Code Entered: ", groupCode)
        try {
            const groupID = await getGroupFromCode(groupCode);

            if(groupID) {
                await addUserToGroup( userID, groupID );
                const groupInUserResponse = await addGroupToUser( userID, groupID );
                const isGameActive = await getGroupIsGameActive(groupID);
                console.log('isgameactive: ', isGameActive);
                if (groupInUserResponse === 'Group added successfully!') {
                    if (isGameActive) {

                        // Replace current route with 'HomeTab'
                        router.replace('/(authenticated)/home'); // Replace with your HomeTab route

                        // Navigate to 'InviteGroup' with parameters
                        router.push({
                            pathname: '/(authenticated)/home/bets/HeadToHeadTutorial',
                            params: { groupID, fromCreate: "true" },
                        });

                        // navigation.reset({
                        //     index: 1,
                        //     routes: [
                        //         { name: 'HomeTab' },
                        //         { name: 'HeadToHeadTutorialPage', params: { groupID: groupID } }
                        //     ],
                        // });
                    } else {
                        // Replace current route with 'HomeTab'
                        router.replace('/(authenticated)/home'); // Replace with your HomeTab route

                        // Navigate to 'InviteGroup' with parameters
                        router.push({
                            pathname: '/(authenticated)/home/groups/InviteGroup',
                            params: { groupID, fromCreate: "true" },
                        });
                        // navigation.reset({
                        //     index: 1,
                        //     routes: [
                        //         { name: 'HomeTab' },
                        //         { name: 'InviteGroup', params: { groupID: groupID, fromCreate: false } }
                        //     ],
                        // });
                    }
                };
                setCurrentGroupInUserResponse(groupInUserResponse);
                
            } else {
                setCurrentGroupInUserResponse('Group code invalid. Try again.');
            }

        } catch (error) {
            console.error("Error with group code: ", error);
        }
    }
    
    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                    <Text style={styles.titleText}>Join Group</Text>
                </View>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Image
                        source={require('@components/back-icon.png')}
                        style={styles.backImage}
                    />
                </TouchableOpacity>
                <Text style={styles.label}>Enter group code:</Text>
                <TextInput
                    style={styles.input}
                    value={groupCode}
                    onChangeText={setGroupCode}
                    id="groupCode"
                    placeholder="Group Code"
                />
                <TouchableOpacity 
                    onPress={ToGroupFromJoin}
                    style={[styles.buttonContainer]}
                >
                    <Text style={styles.button_text}>Submit</Text>
                </TouchableOpacity>
                {currrentGroupInUserResponse !== undefined && (
                    <Text style={styles.errorText}>{currrentGroupInUserResponse}</Text>
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: "white",
    },
    contentView: {
        flex: 1,
        backgroundColor: "white",
    },
    backImage: {
        width: 40,
        height: 40,
    },
    titleContainer: {
        justifyContent: "flex-start",
    },
    titleText: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
    },
    label: {
      fontSize: 18,
      marginBottom: 8,
      paddingTop: 40,
      paddingLeft: 20,
      fontFamily: 'Lexend'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        height: 50,
        fontSize: 20,
        paddingHorizontal: 12,
        marginVertical: 5,
        marginBottom: 40,
        marginHorizontal: 20,
        fontWeight: "100",
        fontFamily: 'Lexend'
    },
    text: {
        fontSize: 24,
    },
    errorText: {
        fontSize: 16,
        textAlign: "center",
        color: 'red',
        marginTop: 30,
    },
    backButton: {
        position: 'absolute',
        top: 22,
        left: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    button_text: {
        textAlign: "center",
        fontSize: 15,
        color: 'white',
        fontFamily: 'Lexend',
    },
    buttonContainer: {
        borderRadius: 30,
        flexDirection: "row",
        paddingVertical: 13, // Reduce padding to make it smaller
        justifyContent: "center",
        backgroundColor: '#1976d2',
        alignSelf: "center",
        width: 150,
    },
});

export default JoinGroupPage;