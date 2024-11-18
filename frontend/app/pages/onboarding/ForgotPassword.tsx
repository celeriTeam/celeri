import React, { useState, useRef, useEffect } from 'react';
import { Text } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { editPassword } from '@/backend/src/users';


type ForgotPasswordPageNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;
type ForgotPasswordPageRouteProp = RouteProp<RootStackParamList, 'ForgotPassword'>;

type Props = {
    navigation: ForgotPasswordPageNavigationProp;
    route: ForgotPasswordPageRouteProp;
};


const ForgotPasswordPage: React.FC<Props> = ({ navigation }) => {
    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.contentView}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Forgot Password</Text>
                    </View>
                    <View style={styles.mainContent}>
                        <TextInput
                            style={styles.loginTextField}
                            placeholder="New Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor="#999797"
                        />
                    </View>

                    <TouchableOpacity 
                        onPress={loginAndGoToMainFlow}
                        style={[styles.button_container]}
                    >
                        <Text style={styles.button_text}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={nav.goBack}
                        style={[styles.button_container2]}
                    >
                        <Text style={styles.button_text2}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Pressable>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    input: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    text: {
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 24,
        fontFamily: "Lexend"
    },
    button_text: {
        textAlign: "center",
        fontSize: 15,
        color: 'white',
        fontFamily: 'Lexend',
    },
    button_text2: {
        color: 'black',
        fontSize: 16,
        fontFamily: 'Lexend',
    },
    button_container: {
        borderRadius: 30,
        flexDirection: "row",
        marginVertical: 8,
        paddingVertical: 18, // Reduce padding to make it smaller
        paddingHorizontal: 20,
        justifyContent: "center",
        backgroundColor: '#1976d2'
    },
    button_container2: {
        flexDirection: "row",
        paddingVertical: 12, // Reduce padding to make it smaller
        paddingHorizontal: 20,
        justifyContent: "center",
        backgroundColor: '#fff'
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
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend',
    },
    loginTextField: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        height: 50,
        fontSize: 20,
        paddingHorizontal: 12,
        marginVertical: 12,
        fontWeight: "100",
        fontFamily: 'Lexend'
        
    },
    mainContent: {
        flex: 6,
    },
});

export default ForgotPasswordPage;