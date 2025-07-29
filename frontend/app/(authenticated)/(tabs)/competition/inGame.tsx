import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Alert, Button, ActivityIndicator, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useUser } from '../../../UserProvider';
import messaging from '@react-native-firebase/messaging';
import { editName, editProfilePic, editUsername, getActiveUserGroupIDs } from '@/backend/src/users';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const databaseUrl = 'https://celeri.onrender.com';

const CompetitionGamePage: React.FC = () => {
    const [data, setData] = useState<string>('');

    const users = async () => {
        const response = await fetch(`${databaseUrl}/data`);
        const response_json = await response.json();
        return response_json;
    };

    const grabData = async () => {
        users().then(data => {
            setData(JSON.stringify(data, null, 2));
        }).catch(error => {
            console.error('Error fetching data:', error);
        });
    };

    useEffect(() => {
        grabData();
    }, []);

    return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={{ padding: 50, }} />
                <Text style={{ color: '#fff' }}>{data}</Text>
            </LinearGradient>
    );
}

export default CompetitionGamePage;