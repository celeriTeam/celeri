//@ts-ignore
// Use this if you want to test on web:
// import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';

// Import the functions you need from the SDKs you need
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import firestore, { getFirestore } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage'


const app = getApp();
const db = getFirestore(app);
const auth = () => getAuth(app);
const authInstance = getAuth(app);
export { db, auth, authInstance, firestore, storage };