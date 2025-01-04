import { useEffect, useState } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { setStepsFirebase } from '../users'; 
import { getAuth } from "firebase/auth";

import AppleHealthKit, {
    HealthInputOptions,
    HealthKitPermissions,
    HealthObserver,
    HealthUnit,
} from "react-native-health";

const { Permissions } = AppleHealthKit.Constants;

const permissions: HealthKitPermissions = {
    permissions: {
        read: [
        Permissions.Steps,
        // Permissions.FlightsClimbed,
        // Permissions.DistanceWalkingRunning,
        ],
        write: [],
    },
};


const useHealthData = () => {
    console.log("useHealthData is running");
    const [steps, setSteps] = useState(0);
    const [averageSteps, setAverageSteps] = useState(0);
    const [weeklySteps, setWeeklySteps] = useState(0);
    const [flights, setFlights] = useState(0);
    const [distance, setDistance] = useState(0);

    const [hasPermissions, setHasPermission] = useState(false);

    useEffect(() => {
        console.log("inside useHealthData, useEFfect");

        // const enableBackgroundDelivery = () => {
        //     NativeModules.AppleHealthKit.enableBackgroundDeliveryForType(
        //         { type: "StepCount", frequency: AppleHealthKit.Constants.Frequency.IMMEDIATE },
        //         (err, success) => {
        //             if (err) {
        //                 console.log("Error enabling background delivery:", err);
        //                 return;
        //             }
        //             console.log("Background delivery enabled for StepCount:", success);
        //         }
        //     );
        // };

        AppleHealthKit.initHealthKit(permissions, (err) => {
            if (err) {
                console.log('Error getting permissions', err);
                return;
            }
            console.log('Apple Health Data: Permissions received!');
            setHasPermission(true);

            // Only register observers after permissions are confirmed
            console.log("Setting up observers...");

            const healthKitEventEmitter = new NativeEventEmitter(NativeModules.AppleHealthKit);
            healthKitEventEmitter.addListener('healthKit:StepCount:setup:success', () => {
                console.log('StepCount Observer Setup Success');
            });
            healthKitEventEmitter.addListener('healthKit:StepCount:setup:failure', () => {
                console.log('StepCount Observer Setup Failure');
            });
            healthKitEventEmitter.addListener('healthKit:StepCount:new', () => {
                console.log('StepCount Observer Triggered');
            });

            // Firebase Messaging Handlers
            const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
                console.log("Silent push notification received in foreground:", remoteMessage);

                if (remoteMessage.data?.type === "silent" && remoteMessage.data?.action === "fetchSteps") {
                    console.log("Fetching HealthKit data from silent notification (foreground)...");
                    fetchHealthData();

                }
            });

            messaging().setBackgroundMessageHandler(async (remoteMessage) => {
                console.log("Silent push notification received in background:", remoteMessage);

                if (remoteMessage.data?.type === "silent" && remoteMessage.data?.action === "fetchSteps") {
                    console.log("Fetching HealthKit data from silent notification (background)...");
                    fetchHealthData();

                    const auth = getAuth();
                    const user = auth.currentUser;
                    let userID = "";

                    if (user) {
                    userID = user.uid; // Get the user's unique ID
                    console.log("User ID:", userID);
                    } else {
                    console.log("No user is signed in.");
                    }

                    // now that it's fetched, set it
                    console.log("userID is ", userID);
                    console.log("Fetched HealthKit data, steps is ", steps, " and averageSteps is ", averageSteps);
                    setStepsFirebase(userID, steps, averageSteps);
                }
            });

            return () => {
                unsubscribeForeground();
            };
        });
    }, []);

    const fetchHealthData = () => {
        if (!hasPermissions) return;

        getDailySteps();
        getWeeklySteps();
        getWeeklyAverageOfSteps();
    };

    useEffect(() => {
        if (hasPermissions) {
            fetchHealthData(); // Fetch data initially
        }
    }, [hasPermissions]);

    const getDailySteps = async () => {
        // Query Health data
        const today = new Date();
        const options: HealthInputOptions = {
            date: today.toISOString(),
        };
        
        AppleHealthKit.getStepCount(options, (err, results) => {
            if (err) {
                console.log('Error getting the steps');
                return;
            }
            setSteps(results.value);
        });
        

        

    };

    const getWeeklyAverageOfSteps = async () => {
        // Fetch step counts for the past week
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 8); // 8 days ago; you don't want today because the steps may be unfinished, decreasing avg
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Initialize sum
        let totalSteps = 0;
        const currentDate = new Date(startDate);

        while(currentDate < yesterday){
            const options: HealthInputOptions = {
                date: currentDate.toISOString(),
            };
            
            // Get steps for current date
            try {
                const result = await new Promise((resolve, reject) => {
                    AppleHealthKit.getStepCount(options, (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results.value);
                        }
                    });
                });
                
                totalSteps += result as number;
            } catch (error) {
                console.log('Error getting steps for date:', currentDate);
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);

        }

        setAverageSteps(Math.round(totalSteps / 7));
    }

    // Weekly steps minus current day
    const getWeeklySteps = async () => {
        const today = new Date();
    
        // Find the most recent Sunday
        const startDate = new Date(today);
        while (startDate.getDay() !== 0) { // 0 is Sunday
            startDate.setDate(startDate.getDate() - 1);
        }
        
        // Initialize sum
        let totalSteps = 0;
        
        // Loop through each day from Sunday to today
        const currentDate = new Date(startDate);
        while (currentDate < today) {
            const options: HealthInputOptions = {
                date: currentDate.toISOString(),
            };
            
            // Get steps for current date
            try {
                const result = await new Promise((resolve, reject) => {
                    AppleHealthKit.getStepCount(options, (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results.value);
                        }
                    });
                });
                
                totalSteps += result as number;
            } catch (error) {
                console.log('Error getting steps for date:', currentDate);
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setWeeklySteps(totalSteps);
    };


    return { steps, weeklySteps, averageSteps, flights, distance };
};

export default useHealthData;