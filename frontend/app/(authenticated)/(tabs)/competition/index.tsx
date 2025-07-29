import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Alert, Button, ActivityIndicator, TouchableOpacity, ScrollView, TextInput, Modal, StyleSheet } from 'react-native';
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
import { StyleSheet as ScaledStyleSheet } from 'react-native-size-scaling';
import RaceRulesPager from './rules';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const CompetitionLandingPage: React.FC = () => {
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={styles.container}
        >
            <View style={styles.content}>
                <Button
                    title="Open Modal"
                    onPress={() => setModalVisible(true)}
                />
            </View>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                {/* Modal content goes here */}
                
                <View style={styles.modalOverlay} >
                    <View style={[styles.modalContainer, { height: '75%', }]}>
                        {/* Close button */}
                        <LinearGradient
                            colors={['#000000', '#024405']}
                            style={styles.insideContainer}
                        >
                            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                                <Image
                                    source={require('@assets/icons/x.png')}
                                    style={styles.closeButtonIcon}
                                />
                            </TouchableOpacity>
                            <RaceRulesPager closeModal={() => setModalVisible(false)} />
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
};

const styles = ScaledStyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    insideContainer: {
        flex: 1,
        width: '100%',
        borderWidth: moderateScale(1),
        borderRadius: moderateScale(15),
    },
    content: {
        padding: moderateScale(50),
    },
    modalContent: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 20,
        margin: 20,
        
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
        
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'black',
        position: 'relative',
        borderColor: '#4A4A4A',
        borderWidth: moderateScale(1),
        borderRadius: moderateScale(15),
    },
    modalCloseButton: {
        position: 'absolute',
        top: verticalScale(10),
        right: scale(10),
        zIndex: 1,
    },
    closeButtonIcon: {
        width: scale(20),
        height: scale(20),
    },
});

export default CompetitionLandingPage;
