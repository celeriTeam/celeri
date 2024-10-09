import React from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type RegisterPageNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;
type RegisterPageRouteProp = RouteProp<RootStackParamList, 'Register'>;

type Props = {
    navigation: RegisterPageNavigationProp;
    route: RegisterPageRouteProp;
};


// const RegisterPage: React.FC<Props> = ({ navigation }) => {
//     const insets = useSafeAreaInsets()

//     return (
        
//         <View style={[
//             styles.container, {
//                 paddingTop: insets.top, 
//                 paddingBottom: insets.bottom,
//             }
//         ]}>
//             <Text style={styles.text}>FLEX</Text>
//             <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SignUp')}>
//                 <Text style={styles.buttonText}>Register</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
//                 <Text style={styles.buttonText}>Login</Text>
//             </TouchableOpacity>
//         </View>
//     );
// };

const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 20 : StatusBar.currentHeight;
const HEADER_HEIGHT = Platform.OS === "ios" ? 44 : 56;

const RegisterPage: React.FC<Props> = ({ navigation }) => {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ height: STATUS_BAR_HEIGHT, backgroundColor: "#5E8D48" }}>
                    <StatusBar
                        translucent
                        backgroundColor="transparent"
                        barStyle="dark-content"
                    />
                </View>
                <Text style={styles.text}>FLEX</Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SignUp')}>
                    <Text style={styles.buttonText}>Register</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    };

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#A6D49F'
      },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#A6D49F', // Background color
        width: '100%', // Ensure full width
        height: '100%',
    },
    text: {
        fontSize: 24,
        marginBottom: 20,
    },
    button: {
        backgroundColor: 'black', // Button color
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 25, // Rounded corners
        marginVertical: 10,
    },
    buttonText: {
        color: 'white', // Text color
        fontSize: 18,
    },
});

export default RegisterPage;
