import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { getGroupCode, getGroupName } from '../../database';
import { RotateInDownLeft } from 'react-native-reanimated';

type InviteGroupNavigationProp = StackNavigationProp<RootStackParamList, 'InviteGroup'>;
type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

type Props = {
    navigation: InviteGroupNavigationProp;
};

const InvitePage: React.FC<Props> = ({ navigation }) => {
    const route = useRoute<InviteGroupRouteProp>();
    const { groupID, fromCreate } = route.params;
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

    const copyToClipboard = () => {
        Clipboard.setString(currentGroupCode || '');
        Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
    };

    return (
        <View style={styles.contentView}>
            <View style={styles.container}>
                {fromCreate ? (
                    <Text style={styles.groupNameCreated}>
                        <Text style={styles.groupName}>{currentGroupName}</Text> has been successfully created!
                    </Text>
                ) : (
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Image
                                source={require('../../../components/back-icon.png')}
                                style={styles.backImage}
                            />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.groupNameStandalone}>{currentGroupName}</Text>
                        </View>
                    </View>
                )}
                <Text style={styles.text}>
                    You don't have enough members in your group yet. Share the group code below to invite others to join!
                </Text>
                <View style={styles.centeredGroupCode}>
                    <Text style={styles.groupCode}>{currentGroupCode}</Text>
                    <TouchableOpacity onPress={copyToClipboard} style={styles.clipboardIcon}>
                        <MaterialIcons name="content-copy" size={24} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    contentView: {
        flex: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        left: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    backImage: {
        width: 24,
        height: 24,
    },
    groupNameCreated: {
        marginTop: 40,
        fontSize: 20,
        marginBottom: 40,
    },
    groupName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    groupNameStandalone: {
        marginTop: 40,
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    text: {
        fontSize: 18,
    },
    centeredGroupCode: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupCode: {
        fontSize: 45,
        color: '#a34395',
        backgroundColor: '#cccacc',
        fontWeight: 'bold',
        padding: 15,
        borderRadius: 5,
    },
    clipboardIcon: {
        marginLeft: 10,
    },
});

export default InvitePage;
