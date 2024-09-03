import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { User } from "firebase/auth";
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getUserName } from '@backend/src/users';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'HomePage'>;
};

const BugReportsPage: React.FC<Props> = () => {
    const route = useRoute();
    const { userID } = route.params as { userID: string };
    const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
    const [subject, setSubject] = useState<string>('');
    const [issue, setIssue] = useState<string>('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const name = await getUserName(userID);
                setCurrentUserName(name);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();
    }, [userID]);

    const handleSubmit = () => {
        if (!subject.trim() || !issue.trim()) {
            Alert.alert('Error', 'Both fields are required.');
            return;
        }
        // Handle form submission here
        setSubject('');
        setIssue('');
        Alert.alert('Success', `Thank you for your feedback, ${currentUserName}!`);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <Text style={styles.text}>Thanks for using our app! If you have found any issue with this app, please fill out the form below.</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Subject"
                    value={subject}
                    onChangeText={setSubject}
                    placeholderTextColor="#888"
                />
                
                <TextInput
                    style={styles.textArea}
                    placeholder="Describe the issue..."
                    value={issue}
                    onChangeText={setIssue}
                    placeholderTextColor="#888"
                    multiline={true}
                    numberOfLines={4}
                />

                <Button title="Submit" onPress={handleSubmit} />
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        marginBottom: 20,
    },
    input: {
        height: 40,
        width: '100%',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        width: '100%',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        fontSize: 16,
    },
});

export default BugReportsPage;