import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../UserProvider';
import { buyPowerup } from '../../../../backend/src/store';
import { StyleSheet } from 'react-native-size-scaling';

type Props = {
    groupID: string;
    userDiamonds: number;
    gameType: string;
    currentGroupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined }[];
    setStoreModalVisible: (visible: boolean) => void;
};

const StorePage: React.FC<Props> = ({ groupID, userDiamonds, gameType, currentGroupUsersArray, setStoreModalVisible }) => {
    const { userID, groups, loading } = useUser();
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
    const [isBuying, setIsBuying] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);


    const speedBoots = require('@assets/images/speed_boot.png');
    const secondWind = require('@assets/images/wind_store.jpg');
    const legCramp = require('@assets/images/leg_cramp.png');
    const brickWall = require('@assets/images/brick_wall.png');
    const [items] = useState([
        { id: '1', 
            image: secondWind, 
            title: 'Second Wind',
            price: '1',
            description: '+200 steps to a head to head!'
        },
        { id: '2', 
            image: brickWall, 
            title: 'Brick Wall',
            price: '1',
            description: '-200 steps from a head to head!',
        },
        // { id: '3', 
        //     image: legCramp, 
        //     title: 'Leg Cramp',
        //     price: '2',
        //     description: 'For the next hour, the person you use this on will have their steps halved. Stops at 12:00 AM.',
        // },
        // { id: '4', 
        //     image: speedBoots, 
        //     title: 'Fancy Feet',
        //     price: '4',
        //     description: 'For the next hour, the person you use this on will have 2X steps. Stops at 12:00 AM.'
        // },
    ]);

    const toggleExpand = (id: string) => {
        console.log(`Toggling expand for item ${id}`);
        setExpandedItems((prevState) => ({
            ...prevState,
            [id]: !prevState[id],
        }));
    };

    const renderItem = ({ item }: { item: { id: string; image: string; title: string, price: string, description: string} }) => {
        const isExpanded = expandedItems[item.id] || false;
        console.log(isExpanded, expandedItems[item.id], item.id);

        const handleBuyPowerup = async (targetUserID: string, targetUserName?: string) => {
            console.log("targetUserID: ", targetUserID, "selectedItemId: ", selectedItemId);
            setIsBuying(true);
            let success = false;
    
            try {
                if (selectedItemId) {
                    success = await buyPowerup(userID, groupID, targetUserID, selectedItemId, gameType, targetUserName);
                }
            } catch (error) {
                console.error("Error purchasing item:", error);
            } finally {
                setIsBuying(false);
                setIsModalVisible(false);
    
                setTimeout(() => {
                    if (success) {
                        Alert.alert("Success", "Purchase successful!");
                    } else {
                        Alert.alert("Error", "Failed to purchase item.");
                    }
                }, 200);
            }
        };

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={async () => toggleExpand(item.id)}
                activeOpacity={0.8} // For better click feedback
            >
                {/* <View style={styles.topRow}>
                    <MaterialIcons
                        name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={24}
                        style={styles.carrotIcon}
                    />
                </View> */}
                <Image 
                    source={item.image}
                    style={styles.image} 
                />
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>{item.price}</Text>
                    <Image 
                        source={require('@assets/images/diamond.png')} 
                        style={styles.diamondImage} 
                    />
                </View>
                <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => {
                        setSelectedItemId(item.id);
                        setIsModalVisible(true)
                    }}
                    disabled={isBuying}
                >
                <Text style={styles.buyButtonText}>
                        Buy
                    </Text>
                </TouchableOpacity>
                <Text style={styles.description}>{item.description}</Text>
                <Modal
                    visible={isModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        console.log("Modal close requested");
                        setIsModalVisible(false);
                        setSelectedItemId(null);
                    }}
                >
                    
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select a User</Text>
                            <FlatList
                                data={currentGroupUsersArray}
                                keyExtractor={(user) => user.id.toString()}
                                renderItem={({ item }) => (
                                    <View style={styles.userRow}>
                                        <Text style={styles.username}>{item.name}</Text>
                                        <Button
                                            title="Select"
                                            onPress={() => {
                                                console.log("handleBuyPowerup: ", selectedItemId)
                                                setStoreModalVisible(false);
                                                setIsModalVisible(false);
                                                handleBuyPowerup(item.id, item.name);
                                            }}
                                        />
                                    </View>
                                )}
                            />
                            <Button
                                title="Close"
                                onPress={() => setIsModalVisible(false)}
                            />
                        </View>
                    </View>
                </Modal>
            </TouchableOpacity>
        );
    };

    return (
        <View>
            {/* Title and User Diamonds Row */}
            <View style={styles.titleRow}>
                <Text style={styles.topTitle}>Powerups</Text>
                <View style={styles.diamonds}>
                    <Text style={styles.tokenText}>{userDiamonds}</Text>
                    <Image
                        source={require('@assets/images/diamond.png')}
                        style={styles.diamondIcon}
                    />
                </View>
            </View>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2} 
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    topTitle: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
        marginBottom: 20,
    },
    titleRow: {
        width: "100%", // Ensure full-width container
        alignItems: "center", // Center the child elements
        marginBottom: 20, // Add spacing below the row
    },
    diamonds: {
        position: "absolute", // Absolute positioning for diamonds
        right: 0, // Align to the right-hand corner
        top: 26, // Adjust vertical position relative to title
        flexDirection: "row", // Align text and image horizontally
        alignItems: "center", // Vertically center text and image
    },
    tokenText: {
        fontSize: 20, // Adjust size as needed
        fontFamily: 'Lexend',
        marginRight: 5, // Add spacing between text and image
    },
    diamondIcon: {
        width: 20, // Adjust the size of the image
        height: 20,
    },
    list: {
        // flexWrap: 'wrap', // Enable wrapping to create a grid
        // flexDirection: 'row', // Row layout for wrapping
        // justifyContent: 'center',
        alignItems: 'center',
    },
    itemContainer: {

        //width: Dimensions.get('window').width / 2 - 48, // Half of screen width minus padding
        width: 150,
        margin: 8,
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 8,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 10,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
    },
    price: {
        fontFamily: "Lexend",
        fontSize: 14,
        fontWeight: 'bold',
        paddingRight: 2,
    },
    title: {
        fontFamily: "Lexend",
        fontSize: 14,
        paddingTop: 10,
    },
    diamondImage: {
        width: 15,
        height: 15,
        resizeMode: 'contain',
    },
    buyButton: {
        backgroundColor: '#007bff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    buyButtonText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    description: {
        marginTop: 20,
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    carrotIcon: {
        textAlign: 'right',
        color: '#888',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        width: "80%",
        padding: 20,
        backgroundColor: "white",
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    userRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    username: {
        fontSize: 16,
    },
});

export default StorePage;