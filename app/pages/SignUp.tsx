import React, {useState, useRef, useEffect} from 'react';
import { SafeAreaView, Pressable, Keyboard,
    View, Text, TouchableOpacity, Button, TextInput, Alert, StyleSheet } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, User, AuthError } from "firebase/auth";
import firebase from '@react-native-firebase/app';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { app, auth, db} from "../../firebaseConfig";
import { doc, setDoc } from 'firebase/firestore';
import { CTAButton } from "../../components/CTAButton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { FirebaseError } from 'firebase/app';
//import db from "@react-native-firebase/firestore";

type RootStackParamList = {
    SignUp: undefined;
    FLEX: undefined;
};

type SignUpPageNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
type SignUpPageRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

type Props = {
    navigation: SignUpPageNavigationProp;
    route: SignUpPageRouteProp;
};


const SignUpPage: React.FC<Props> = ({navigation}) => {

    const [name, setName] = useState<string | undefined>();
    const [email, setEmail] = useState<string | undefined>();
    const [password, setPassword] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);

    const auth = getAuth(app);
    const nav = useNavigation<NativeStackNavigationProp<any>>();

    const createProfile = async (user: any) => {
        try{
            await setDoc(doc(db, 'users', user.uid), { name })
        } catch (error) {
            console.error("Error creating user profile:", error);
        }
        
    };

    useEffect(() => {
        const authInstance = getAuth();
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
          setUser(currentUser);
        });
    
        return () => unsubscribe(); // Cleanup subscription on unmount
      }, []);
    
      const handleLogout = async () => {
        const authInstance = getAuth();
        try {
          await signOut(authInstance);
          Alert.alert("Success", "You have been logged out.");
        } catch (error: unknown) {
          if (error instanceof Error) {
            Alert.alert("Error", error.message);
          } else {
            Alert.alert("Error", "An unknown error occurred");
          }
        }
      };
    
      const registerAndGoToMainFlow = async () => {
        if (email && password){
            try {
                console.log("Trying to register user...");
                const response = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                console.log("User registration response: ", response);

                if (response.user){
                    await createProfile(response.user);
                    // nav.replace("Main");
                    navigation.navigate("FLEX");
                }
            } catch (e: unknown) {
                if (e instanceof FirebaseError) {
                  console.error("Firebase Error Code:", e.code);
                  console.error("Firebase Error Message:", e.message);
                  Alert.alert("Error", e.message);
                } else if (e instanceof Error) {
                  console.error("General Error Message:", e.message);
                  Alert.alert("Error", e.message);
                } else {
                  console.error("Unknown Error:", e);
                  Alert.alert("Error", "An unknown error occurred");
                }
              }
            } else {
              Alert.alert("Error", "Please enter both email and password.");
            }
      };
    

    return ( 
    <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.contentView}>
          <View style={styles.container}>
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Register</Text>
            </View>
            <View style={styles.mainContent}>
              <TextInput
                style={styles.loginTextField}
                placeholder="Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.loginTextField}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                inputMode="email"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.loginTextField}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            
            <CTAButton
              title="Sign Up"
              onPress={registerAndGoToMainFlow}
              variant="primary"
            />
            <CTAButton title="Go Back" onPress={nav.goBack} variant="secondary" />
          </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {user ? (
                <>
                <Text>Welcome, {user.email}</Text>
                <Button title="Log Out" onPress={handleLogout} />
                </>
            ) : (
                <Text>You are not logged in</Text>
            )}
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
        fontWeight:"bold",
        textAlign:"center",
        fontSize:24,
    },
    button_text: {
        textAlign:"center",
        fontSize:24,
        color:"#1976d2"
    },
    button_container: {
        borderRadius: 15,
        flexDirection: "row",
        margin: 16,
        padding:24,
        justifyContent:"center",
        backgroundColor:"#e6e6e6"
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
});

export default SignUpPage;