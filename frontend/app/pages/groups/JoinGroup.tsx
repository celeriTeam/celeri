import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Pressable, TouchableOpacity, Keyboard, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { getGroupFromCode, addUserToGroup } from '@backend/src/groups';
import { addGroupToUser } from '@backend/src/users';
import { useUser } from '../../UserProvider';


type JoinGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'JoinGroup'>;

type Props = {
    navigation: JoinGroupPageNavigationProp;
};

const JoinGroupPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const [groupCode, setGroupCode]= useState('');
    const [currrentGroupInUserResponse, setCurrentGroupInUserResponse] = useState<string | undefined>(undefined);

    const ToGroupFromJoin = async () => {
        console.log("Enter button pressed");
        console.log("Group Code Entered: ", groupCode)
        try {
            const groupID = await getGroupFromCode(groupCode);

            if(groupID) {
                await addUserToGroup( userID, groupID );
                const groupInUserResponse = await addGroupToUser( userID, groupID );
                setCurrentGroupInUserResponse(groupInUserResponse);
                
            } else {
                setCurrentGroupInUserResponse('Group code invalid. Try again.');
            }
            if (currrentGroupInUserResponse) {
                navigation.navigate('HomeTab');
            }

        } catch (error) {
            console.error("Error with group code: ", error);
        }
    }
    
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
                        <Text style={styles.titleText}>Join Group Page!</Text>
                    </View>
                </View>
                <Text style={styles.label}>Enter group code:</Text>
                <TextInput
                    style={styles.input}
                    value={groupCode}
                    onChangeText={setGroupCode}
                    id="groupCode"
                    placeholder="Group Code"
                />
                <Button title="Enter" onPress={ToGroupFromJoin} />
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
        padding: 20,
    },
    contentView: {
        flex: 1,
        backgroundColor: "white",
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
    titleContainer: {
        flex: 1.2,
        justifyContent: "center",
    },
    titleText: {
        fontSize: 36,
        textAlign: "center",
        fontWeight: "200",
    },
    label: {
      fontSize: 18,
      marginBottom: 8,
    },
    input: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
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
});

export default JoinGroupPage;