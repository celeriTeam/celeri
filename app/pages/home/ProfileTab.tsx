import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getUserGroups, getGroupName, getUserName } from '../../database';

const ProfileTab: React.FC = () => {
    const route = useRoute();
    const { userID } = route.params as { userID: number };
    const currentUserName = getUserName(userID); // get user name api call
    const currentUserGroups = getUserGroups(userID) || []; // get user groups api call

    return (
        <View style={styles.container} >
            <Text style={styles.name} >{currentUserName}</Text>
            <Text style={styles.title} >Groups:</Text>
            {currentUserGroups.map((groupID: number) => {
                const groupName = getGroupName(groupID); // This function should fetch the group name
                return (
                    <Text style={styles.text} >{groupName}</Text>
                );
            })}
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
