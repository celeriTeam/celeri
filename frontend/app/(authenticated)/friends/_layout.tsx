// app/(authenticated)/friends/_layout.tsx
import { Slot, useRouter, usePathname } from 'expo-router'
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function FriendsLayout() {
  const router = useRouter()
  const path = usePathname()
  const [selectedTab, setSelectedTab] = useState('Accept');

  return (
    <LinearGradient
        colors={['#000000', '#024405']}
        style={{
            flex: 1,
            width: '100%',
        }}
    >

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            {/* ─── BACK + TABS HEADER ───────────────── */}
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backBtn}
                        hitSlop={{ top: 50, bottom: 50, left: 50, right: 50 }}
                    >
                        <Image
                            source={require('@assets/icons/back.png')}
                            style={styles.backIcon}
                        />
                    </TouchableOpacity>
                    <View style={styles.titleWrapper}>
                        <Text style={styles.titleText}>Friends</Text>
                    </View>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, { borderBottomColor: selectedTab === 'Accept' ? '#74FF6D' : 'transparent', }]}
                        onPress={() => {
                            setSelectedTab('Accept')
                            router.push('/friends');
                        }}
                    >
                        <Text style={[styles.tabText, { color: selectedTab === 'Accept' ? '#74FF6D' : '#fff', }]}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { borderBottomColor: selectedTab === 'List' ? '#74FF6D' : 'transparent', }]}
                        onPress={() => {
                            setSelectedTab('List')
                            router.push('/friends/list')
                        }}
                        activeOpacity={1}
                    >
                        <Text style={[styles.tabText, { color: selectedTab === 'List' ? '#74FF6D' : '#fff', }]}>List</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { borderBottomColor: selectedTab === 'Add' ? '#74FF6D' : 'transparent', }]}
                        onPress={() => {
                            setSelectedTab('Add')
                            router.push('/friends/add')
                        }}
                        activeOpacity={1}
                    >
                        <Text style={[styles.tabText, { color: selectedTab === 'Add' ? '#74FF6D' : '#fff', }]}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── PAGE CONTENT ─────────────────────── */}
            <View style={{ flex: 1 }}>
                <Slot />
            </View>
        </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
    header: {
        justifyContent: 'flex-start',
        //flexDirection: 'row',
        //alignItems: 'center',
        //backgroundColor: '#024405',
        //paddingVertical: 12,
        //paddingHorizontal: 8,
        height: '12%',
        width: '90%',
        alignSelf: 'center',
        marginTop: 30,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,

    },
    backBtn: {
        padding: 8,
        width: 44,
        height: 44,
    },
    backIcon: {
        width: 24,
        height: 24,
        tintColor: '#fff',
        resizeMode: 'contain',
    },
    titleWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 16,        // same vertical offset as backBtn padding
        alignItems: 'center',
        zIndex: 5,      // behind the backBtn so the button remains tappable
    },
    titleText: {
        fontFamily: 'Lexend',
        textAlign: "center",
        fontSize: 20,
        color: '#fff',
    },
    tabContainer: {
        //flex: 1,
        backgroundColor: '#65656580',
        borderRadius: 10,
        flexDirection: 'row',
        //justifyContent: 'space-around',
    },
    tab: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 15,
    },
    tabLink: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    tabText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    tabActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    })
