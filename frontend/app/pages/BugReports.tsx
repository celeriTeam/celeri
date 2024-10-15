import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { User } from "firebase/auth";
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getUserName } from '@backend/src/users';
import { useUser } from '../UserProvider';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'HomePage'>;
};

const BugReportsPage: React.FC<Props> = () => {
    const { userID, username } = useUser();
    const [subject, setSubject] = useState<string>('');
    const [issue, setIssue] = useState<string>('');

    const handleSubmit = () => {
        if (!subject.trim() || !issue.trim()) {
            Alert.alert('Error', 'Both fields are required.');
            return;
        }
        // Handle form submission here
        setSubject('');
        setIssue('');
        Alert.alert('Success', `Thank you for your feedback, ${username}!`);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                    <Text style={styles.titleText}>Bug Reports</Text>
                </View>
                <Text style={styles.text}>We want to hear your feedback. If you have any questions, comments, or issues with our app,
                    please feel free to let us know here!
                </Text>

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
                    numberOfLines={8}
                />

                <TouchableOpacity 
                    onPress={handleSubmit}
                    style={[styles.button_container]}
                >
                    <Text style={styles.button_text}>Submit Form</Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', 
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
        marginBottom: 20,
        marginTop: 20,
        marginLeft: 10,
        marginRight: 10,
        textAlign: 'center',
        fontFamily: 'Lexend',

    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        height: 50,
        width: 350,
        fontSize: 18,
        paddingHorizontal: 12,
        marginVertical: 12,
        fontWeight: "100",
        fontFamily: 'Lexend'
    },
    
    textArea: {
        height: 300,
        width: 350,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        fontSize: 18,
        paddingHorizontal: 12,
        fontFamily: "Lexend"
    },
    titleContainer: {
        marginBottom: 0,
        paddingTop: 20,
        justifyContent: "flex-start"
    },
    titleText: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
    },

    button_text: {
        textAlign: "center",
        fontSize: 15,
        color: 'white',
        fontFamily: 'Lexend',
    },
    button_container: {
        borderRadius: 30,
        width: 175,
        flexDirection: "row",
        marginVertical: 8,
        paddingVertical: 18, // Reduce padding to make it smaller
        paddingHorizontal: 20,
        justifyContent: "center",
        backgroundColor: '#1976d2'
    },
});

export default BugReportsPage;