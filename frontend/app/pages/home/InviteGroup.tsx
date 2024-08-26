import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getGroupCode, getGroupName } from '../../database';

type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

const InvitePage: React.FC = () => {
    const route = useRoute<InviteGroupRouteProp>();
    const { groupID } = route.params;
    const [currentGroupName, setCurrentGroupName] = useState<string | undefined>(undefined);
    const [currentGroupCode, setCurrentGroupCode] = useState<string | undefined>(undefined);

    const fetchGroupData = async () => {
        try {
            const groupName = await getGroupName(groupID);
            setCurrentGroupName(groupName);
            const groupCode = await getGroupCode(groupID);
            setCurrentGroupCode(groupCode);
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, []);

    return (
        <View style={styles.container}>
            <Text>{currentGroupName} has been successfully created!</Text>
            <Text>Your group code is {currentGroupCode}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    contentView: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    textInput: {
        width: '80%',
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        fontSize: 18,
    },
});

export default InvitePage;
