// RaceRulesPager.tsx
import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { StyleSheet as ScaledStyleSheet } from 'react-native-size-scaling';
import { Dimensions } from 'react-native';
import { useUser } from '@/app/UserProvider';
import { collection, getDocs, getDoc, doc } from '@react-native-firebase/firestore';
import { db } from "@firebaseConfig";
import { writeConsentForm, hasUserConsented } from '@/backend/src/competition';

const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = Dimensions.get('window').width;
const MODAL_WIDTH = Math.round(SCREEN_WIDTH * 0.84); //as close as it gets, not 0.9

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

import { useRouter } from 'expo-router';

type User = {
  id: string;
  name: string;
  username: string;
  pfp: string;
};

const RaceRulesPager: React.FC<{ closeModal?: () => void }> = ({ closeModal }) => {
  const { userID } = useUser();
  const [currentPage, setCurrentPage] = useState(0);
  const [payment, setPayment] = useState('');
  const [referral, setReferral] = useState('');
  const [referralId, setReferralId] = useState('');
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkConsent = async () => {
      if (userID) {
        const consented = await hasUserConsented(userID);
        setHasConsented(consented);
      }
    };
    checkConsent();
  }, [userID]);

  // set user list
  useEffect(() => {
    const fetchUsers = async () => {
      // 1) Get current user friends
      const meRef = doc(db, "users", userID);
      const meSnap = await getDoc(meRef);
      const meData = meSnap.data() || {};
      const friendsList: string[] = meData.friendsList || [];
      setFriends(friendsList);

      // 2) Get all users
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersArray: User[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id === userID) return; // skip yourself
        usersArray.push({
          id: docSnap.id,
          name: data.name || "Unknown",
          username: data.username || "Unknown",
          pfp: data.profileImageUrl || "",
        });
      });

      setAllUsers(usersArray);
      setFilteredUsers(usersArray); // initial state
    };

    fetchUsers();
  }, [userID]);

  // 3) Update filtered users on search
  const handleSearch = (text: string) => {
    setReferral(text);
    const foundUser = allUsers.find(u => u.username === text);
    setReferralId(foundUser ? foundUser.id : '');

    if (!text.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const lower = text.toLowerCase();
    const results = allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(lower) ||
        u.name.toLowerCase().includes(lower)
    );

    // Sort so friends appear first
    const sorted = results.sort((a, b) => {
      const aFriend = friends.includes(a.id);
      const bFriend = friends.includes(b.id);
      if (aFriend && !bFriend) return -1;
      if (!aFriend && bFriend) return 1;
      return 0;
    });

    setFilteredUsers(sorted);
  };

  const handleSubmit = async () => {
    if (!payment.trim()) {
      Alert.alert('Missing Info', 'Please enter your Venmo or Zelle username.');
      return;
    }
    try {
      await writeConsentForm(userID, payment, referralId);
      Alert.alert('Success', 'Consent form filled out', [
        {
          text: 'OK',
          onPress: () => {
            if (closeModal) {
              closeModal();
            }
          }
        }
      ]);
    } catch (e) {
      Alert.alert('Error', 'There was a problem submitting the consent form.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={ev => {
          const page = Math.round(
            ev.nativeEvent.contentOffset.x / ev.nativeEvent.layoutMeasurement.width
          );
          setCurrentPage(page);
        }}
      >
        <View style={[styles.slide]}>
          <Text style={styles.titleText}>Rules</Text>
          <Text style={styles.body}>
            1. The race will last one hour long, starting at [7 PM]. {'\n\n'}
            2. You can join at any time during the race by clicking “Join Race.” {'\n\n'}
            3. Only your steps after clicking "Join Race" will count. {'\n\n'}
            4. During the race, we collect step data every minute. If your 
            internet connection is poor, your steps may be invalid. {'\n\n'}
            5. We reserve the right to invalidate steps for any reason, including
            but not limited to suspicion of cheating.
          </Text>
        </View>
        {/* page 2 - awards */}
        <View style={[styles.slide, ]}> 
          <Text style={styles.titleText}>Awards</Text>
           <Text style={styles.body}>
            Step Master Award - The player with the most verified steps at the end of the competition wins [$x] {'\n\n'}
            Halfway Hero Award - The closest player to half the steps of the first-place player wins [$x] {'\n\n'}
            Best Friend Award - The player who refers the most people to this race wins [$x] {'\n\n\n\n'}
            Prizes will be distributed via Venmo or Zelle within 7 days.
            </Text>
        </View>

        {/* page 3 - fields */}
        <View style={[styles.slide, ]}>
          <Text style={styles.titleText}>Your Info</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.questionText}>
              What’s your Venmo or Zelle?<Text style={styles.requiredDot}> •</Text>
            </Text>
            <TextInput
              style={[styles.input, hasConsented ? { opacity: 0.5 } : {}]}
              placeholder="Enter Venmo or Zelle username"
              placeholderTextColor="#ccc"
              value={payment}
              onChangeText={hasConsented ? undefined : setPayment}
              autoCapitalize="none"
              editable={!hasConsented}
              selectTextOnFocus={!hasConsented}
            />

            <Text style={styles.questionText}>
              Did someone refer you? If so, find their username here:
            </Text>
            <TextInput
              style={[styles.input, hasConsented ? { opacity: 0.5 } : {}]}
              placeholder="Start typing..."
              placeholderTextColor="#ccc"
              value={referral}
              onChangeText={hasConsented ? undefined : handleSearch}
              autoCapitalize="none"
              editable={!hasConsented}
              selectTextOnFocus={!hasConsented}
            />

            {/* User list */}
            {!hasConsented && referral.length > 0 && (
            <ScrollView
              style={{
                maxHeight: 200,
                backgroundColor: "#111",
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 10,
                    borderBottomColor: "#333",
                    borderBottomWidth: 1,
                  }}
                  onPress={() => {
                    setReferral(user.username); // pick this user
                    setFilteredUsers([]); // close dropdown
                  }}
                >
                  <Image
                    source={user.pfp ? { uri: user.pfp } : require("@components/blank-profile-picture.png")}
                    style={{ width: 35, height: 35, borderRadius: 20, marginRight: 10 }}
                  />
                  <Text style={{ color: "#fff" }}>
                    {user.username}{" "}
                    {friends.includes(user.id) && (
                      <Text style={{ color: "#7eff77ff" }}> (Friend)</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          </View>
        </View>

        {/* Slide 4: Consent Form */}
        <View style={styles.slide}>
          <Text style={styles.titleText}>Consent Form</Text>
          <View style={styles.consentContainer}>
            <ScrollView style={styles.consentBox}>
              <Text style={styles.consentText}>
                Celeri Step Competition Terms & Conditions{'\n\n'}
                1. Acceptance of Terms{'\n'}
                By registering for or participating in any step competition
                hosted on the Celeri mobile application (“App”), you
                (“Participant”) agree to these Terms & Conditions (“Terms”)
                and our Privacy Policy. If you do not agree, do not enter
                the Race.{'\n\n'}
                2. Eligibility{'\n'}
                You must be at least 18 years old and a resident of the
                United States.{'\n\n'}
                3. Race Period & Entry{'\n'}
                3.1 Each Race runs for exactly one hour from the official
                “Start” time shown in the App.{'\n'}
                3.2 You may register anytime during the Race by clicking
                “Join Race,” but only your steps from that moment onward will
                count in the competition.{'\n'}
                3.3 In order for your steps to count, you must allow Celeri to
                access your steps on whatever step tracker you use.{'\n'}
                3.4 If Celeri cannot connect to your tracker for five straight
                minutes, those steps become invalid.{'\n'}
                3.5 Celeri may invalidate steps for cheating, unverifiable
                data, or other reasons.{'\n\n'}
                4. How to Win & Prize{'\n'}
                4.1 Highest verified steps wins the published cash prize.{'\n'}
                4.2 Closest to half of the first-place steps wins the published
                cash prize.{'\n'}
                4.3 Most referrals wins the published cash prize.{'\n'}
                4.4 Payout instructions will be communicated in‑App within
                seven days.{'\n\n'}
                5. Tie‑Breaker{'\n'}
                If tied for highest steps, Celeri may split, award to earliest
                registrant, or decide in its discretion.{'\n\n'}
                6. Verification & Cheating{'\n'}
                Steps must come through our official integrations. Tampering
                or unauthorized hardware/software results in disqualification.{'\n\n'}
                7. Rule Modifications & Disqualification{'\n'}
                Celeri may modify rules, cancel Races, or disqualify
                Participants at any time without notice.{'\n\n'}
                8. Privacy & Data Use{'\n'}
                Your data will be used per our Privacy Policy. By entering,
                you consent to publication of your name and step‑counts.{'\n\n'}
                9. Limitation of Liability{'\n'}
                Celeri and its officers are not liable for indirect or
                consequential damages.{'\n\n'}
                10. Indemnification{'\n'}
                You agree to indemnify Celeri for claims arising from your
                breach or participation.{'\n\n'}
                11. Contact{'\n'}
                Questions? Email us at appceleri@gmail.com.{'\n\n'}
                By tapping “I agree,” you confirm that you have read,
                understood, and agree to all of the above Terms & Conditions. {'\n\n'}
              </Text>
            </ScrollView>

            {/* Submit button */}

            <TouchableOpacity
              style={[styles.submitButton, hasConsented ? { backgroundColor: '#bbb' } : {}]}
              onPress={hasConsented ? undefined : handleSubmit}
              disabled={!!hasConsented}
            >
              <Text style={[styles.submitButtonText, hasConsented ? { color: '#888' } : {}]}>
                {hasConsented ? 'Already Agreed' : 'I agree'}
              </Text>
            </TouchableOpacity>

            {hasConsented && (
              <Text style={{ color: '#fff', textAlign: 'center', marginTop: 10, fontFamily: 'Lexend' }}>
                (Go to profile to change Venmo details)
              </Text>
            )}

          </View>
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              currentPage === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = ScaledStyleSheet.create({
    container: { 
        flex: 1 
    },
    slide1: { 
        width: MODAL_WIDTH,
        paddingVertical: 10,
        position: 'relative',
        //backgroundColor: 'rgba(255,0,0,0.2)',
    },
    slide: { 
        width: MODAL_WIDTH,
        paddingVertical: 10,
        position: 'relative',
    },
    titleText: {
        position: 'absolute',
        top: 30,
        left: 0,                    // span full width
        right: 0,
        textAlign: 'center',        // center the text
        fontFamily: 'Lexend',
        fontSize: 25,
        color: '#fff',
    },
    
    body: { 
        paddingTop: 70,
        paddingHorizontal: 20,
        fontSize: 20, 
        lineHeight: moderateScale(20),
        fontFamily: 'Lexend',
        color: '#fff',
    },
    consentContainer: {
      paddingTop: 80,
      width: '100%',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentBox: {
      width: '90%',
      height: '75%',
      backgroundColor: '#fff',
      borderRadius: moderateScale(8),
      padding: moderateScale(10),
    },
    consentText: {
      fontFamily: 'Lexend',
      fontSize: moderateScale(14),
      lineHeight: moderateScale(20),
      color: '#000',
    },
    dots: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        paddingVertical: moderateScale(10) 
    },
    dot: { 
      width: moderateScale(8), 
      height: moderateScale(8), 
      borderRadius: moderateScale(4), 
      marginHorizontal: moderateScale(4) 
  },
    dotActive: { 
      backgroundColor: '#000' 
    },
    dotInactive: { 
      backgroundColor: '#ccc' 
    },
    inputContainer: {
      paddingTop: 70,
      paddingHorizontal: 20,
    },
    questionText: {
      fontFamily: 'Lexend',
      fontSize: 20,
      color: '#fff',
      marginTop: 50,
      width: '100%',
    },
    requiredDot: {
      color: 'red',
    },
    input: {
      width: '95%',
      borderWidth: 1,
      borderColor: '#fff',
      borderRadius: moderateScale(4),
      padding: moderateScale(10),
      marginTop: moderateScale(8),
      fontFamily: 'Lexend',
      color: '#fff',
    },

    submitButton: {
        borderRadius: 20,
        padding: 10,
        width: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        alignSelf: 'center',
        backgroundColor: '#fff',
    },
    submitButtonText: {
        fontFamily: 'Lexend',
        fontSize: 13,
    },
});

export default RaceRulesPager;
