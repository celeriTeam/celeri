import { Slot, useRouter } from 'expo-router'
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProvider } from '../../../../UserProvider';
import FriendsAcceptPage from './Accept';
import FriendsListPage from './List';
import FriendsAddPage from './Add';

const FriendsPage: React.FC = () => {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'Accept' | 'List' | 'Add'>('Accept');

    const renderTabContent = () => {
        switch (selectedTab) {
            case 'Accept':
                return <FriendsAcceptPage />;
            case 'List':
                return <FriendsListPage />;
            case 'Add':
                return <FriendsAddPage />;
            default:
                return null;
        }
    };

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <UserProvider>
                    <View style={styles.header}>
                        <View style={styles.topRow}>
                            <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 5, }}>
                                <Image
                                    source={require('@assets/icons/back.png')}
                                    style={styles.backIcon}
                                />
                            </TouchableOpacity>
                            <View style={styles.titleWrapper}>
                                <Text style={styles.titleText}>Friends</Text>
                            </View>
                            <View style={{ paddingHorizontal: 10, }}/> 
                        </View>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'Accept' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => {
                                    setSelectedTab('Accept')
                                }}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'Accept' ? '#74FF6D' : '#fff', }]}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'List' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => {
                                    setSelectedTab('List')
                                }}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'List' ? '#74FF6D' : '#fff', }]}>List</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'Add' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => {
                                    setSelectedTab('Add')
                                }}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'Add' ? '#74FF6D' : '#fff', }]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── PAGE CONTENT ─────────────────────── */}
                    <View style={{ flex: 1, marginTop: 20, }}>
                        {renderTabContent()}
                    </View>
                </UserProvider>
            </SafeAreaView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    header: {
        // justifyContent: 'flex-start',
        //flexDirection: 'row',
        //alignItems: 'center',
        //backgroundColor: '#024405',
        //paddingVertical: 12,
        //paddingHorizontal: 8,
        // height: '12%',
        width: '90%',
        alignSelf: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 25,
        paddingTop: 10,
    },
    backIcon: {
        width: 21,
        height: 21,
    },
    titleWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleText: {
        fontFamily: 'Lexend',
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

export default FriendsPage;