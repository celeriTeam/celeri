//@ts-ignore
// Use this if you want to test on web:
// import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';

// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { Auth, getAuth, initializeAuth, getReactNativePersistence} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';

//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_yns4OqMeee38bGWkvXCR0xQVPXRgg-4",
  authDomain: "flex-22c82.firebaseapp.com",
  projectId: "flex-22c82",
  storageBucket: "flex-22c82.appspot.com",
  messagingSenderId: "921566828983",
  appId: "1:921566828983:web:c5a9d72e36e1fe42d7b032",
  measurementId: "G-RBFK05TFRT"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
})
const db: Firestore= getFirestore(app);

export {app, auth, db};
//const analytics = getAnalytics(app);