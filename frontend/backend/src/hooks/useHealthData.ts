import { useEffect, useState, useCallback } from 'react';
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
    const [averageSteps, setAverageSteps] = useState<number[]>([]);
    const [weeklySteps, setWeeklySteps] = useState(0);
    const [flights, setFlights] = useState(0);
    const [distance, setDistance] = useState(0);

    const [hasPermissions, setHasPermissions] = useState(false);

    const getDailySteps = async (): Promise<number> => {
        console.log("getDailySteps -- start");
        return new Promise((resolve, reject) => {
            const today = new Date();
            const options: HealthInputOptions = {
                date: today.toISOString(),
            };
    
            AppleHealthKit.getStepCount(options, (err, results) => {
                if (err) {
                    console.log('Error getting the steps');
                    reject(err);
                    return;
                }
                console.log("getDailySteps succeeded -- getStepCount: ", results.value);
                setSteps(results.value);
                resolve(results.value);
            });
        });
    };

    const getWeeklyAverageOfSteps = async (): Promise<number[]> => {
        console.log("getWeeklyAverageOfSteps -- start");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999); // End of yesterday
    
        const sevenDaysAgo = new Date(yesterday);
        sevenDaysAgo.setDate(yesterday.getDate() - 6); // Go back 6 more days from yesterday
        sevenDaysAgo.setHours(0, 0, 0, 0); // Start of that day
    
        let averageSteps = [];
        const currentDate = new Date(sevenDaysAgo);
    
        while (currentDate <= yesterday) {
            const options: HealthInputOptions = {
                date: currentDate.toISOString(),
            };
    
            try {
                const result = await new Promise<number>((resolve, reject) => {
                    AppleHealthKit.getStepCount(options, (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results.value);
                        }
                    });
                });
    
                averageSteps.push(result);
            } catch (error) {
                console.log("Error getting steps for date:", currentDate.toISOString(), error);
                averageSteps.push(0); // Push 0 for days with errors
            }
    
            currentDate.setDate(currentDate.getDate() + 1); // Move to next day
        }
    
        // const averageSteps = Math.round(totalSteps / 7);
        setAverageSteps(averageSteps); // Update state
        return averageSteps; // Return the calculated value
    };
    

    // Weekly steps minus current day
    const getWeeklySteps = async (): Promise<number> => {
        const today = new Date();
    
        const startDate = new Date(today);
        while (startDate.getDay() !== 0) { // Find the most recent Sunday
            startDate.setDate(startDate.getDate() - 1);
        }
    
        let totalSteps = 0;
        const currentDate = new Date(startDate);
    
        while (currentDate < today) {
            const options: HealthInputOptions = {
                date: currentDate.toISOString(),
            };
    
            try {
                const result = await new Promise<number>((resolve, reject) => {
                    AppleHealthKit.getStepCount(options, (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results.value);
                        }
                    });
                });
    
                totalSteps += result;
            } catch (error) {
                console.log("Error getting steps for date:", currentDate.toISOString(), error);
            }
    
            currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
        }
    
        setWeeklySteps(totalSteps); // Update state
        return totalSteps; // Return the total steps
    };

    const fetchHealthData =  useCallback(async ()  => {
        //if (!hasPermissions) return;
        console.log("fetchhealthData -- start");
        getDailySteps();
        getWeeklySteps();
        getWeeklyAverageOfSteps();
    }, []);

    useEffect(() => {
        if (hasPermissions) {
            console.log("hasPermissions -- fetchHealthData");
            fetchHealthData();
        }
    }, [hasPermissions]);
    

    // if(hasPermissions){
    //     console.log("hasPermissions -- fetchHealthData");
    //     fetchHealthData();
    // }
    
    useEffect(() => {
        console.log("inside useHealthData, useEFfect");

        AppleHealthKit.initHealthKit(permissions, (err) => {
            if (err) {
                console.log('Error getting permissions', err);
                return;
            }
            console.log('Apple Health Data: Permissions received!');
            setHasPermissions(true);

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
                    console.log("Has permissions: ", hasPermissions);

                    const permissionsGranted = await checkPermissions();
                    if (!permissionsGranted) {
                        console.log("Permissions not granted. Exiting.");
                        return;
                    }

                    console.log("Permissions are granted. Fetching data...");
                    const healthData = await fetchHealthDataBackground();

                    if (healthData) {
                        const auth = getAuth();
                        const user = auth.currentUser;
                        const userID = user ? user.uid : "unknown_user";
            
                        console.log("Fetched HealthKit data:", healthData);
                        setStepsFirebase(userID, healthData.dailySteps, healthData.avgSteps);
                    }
                }
            });

            return () => {
                unsubscribeForeground();
            };
        });
    }, []);



    const fetchHealthDataBackground = async () => {
        try {
            const dailySteps = await getDailySteps();
            const weeklySteps = await getWeeklySteps();
            const avgSteps = await getWeeklyAverageOfSteps();
    
            console.log("Fetched data: ", { dailySteps, weeklySteps, avgSteps });
    
            // Update state explicitly after fetching
            setSteps(dailySteps);
            setWeeklySteps(weeklySteps);
            setAverageSteps(avgSteps);
    
            return { dailySteps, weeklySteps, avgSteps };
        } catch (error) {
            console.error("Error fetching health data in background:", error);
            return null;
        }
    };
    

    const checkPermissions = async () => {
        return new Promise((resolve, reject) => {
            AppleHealthKit.initHealthKit(permissions, (err) => {
                if (err) {
                    console.log('Error checking permissions:', err);
                    resolve(false); // Permissions not granted
                } else {
                    console.log('Permissions are valid.');
                    resolve(true); // Permissions granted
                }
            });
        });
    };
    


    return { steps, weeklySteps, averageSteps, flights, distance, fetchHealthData };
};

export default useHealthData;