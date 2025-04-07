import { useEffect, useState, useCallback, useRef } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { getAverageSteps, getStepsLastUpdate, getSteps, setStepsFirebase, setStepsLastUpdate } from '../users'; 
import { getAuth } from "firebase/auth";

import AppleHealthKit, {
    HealthInputOptions,
    HealthKitPermissions,
    HealthObserver,
    HealthUnit,
} from "react-native-health";
import { newsFunctions } from '../news';

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
    const [prevData, setPrevData] = useState<any>(null);
    const [steps, setSteps] = useState(0);
    const [averageSteps, setAverageSteps] = useState<number[]>([]);
    const [stepsFromWeekBefore, setStepsFromWeekBefore] = useState(0);
    const [flights, setFlights] = useState(0);
    const [distance, setDistance] = useState(0);
    const [loadingStepsFromWeekBefore, setLoadingStepsFromWeekBefore] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [isLoading, setLoading] = useState(true);

    const updateLock = useRef(false);
    const LOCK_TIMEOUT = 30000;

    const getDailySteps = async (): Promise<number> => {
        // console.log("getDailySteps -- start");
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
                const flooredSteps = Math.floor(results.value);
                setSteps(flooredSteps);
                resolve(flooredSteps);
            });
        });
    };

    const getStepsFiveHoursAgo = async (stepsLastUpdate: Date): Promise<number> => {

        const currentDate = new Date();

        return new Promise((resolve, reject) => {
            // Define the options for querying step data
            const options = {
                startDate: stepsLastUpdate.toISOString(),
                endDate: currentDate.toISOString(),
            };

            AppleHealthKit.getDailyStepCountSamples(options, (err, results) => {
                if (err) {
                    console.log('Error getting step samples:', err);
                    reject(err);
                    return;
                }

                // console.log("Step samples received:", results);

                // We need to manually check for 5-hour periods with 5k+ steps
                let maxStepsIn5Hours = 0;

                // Sort samples by start date
                const sortedSamples = [...results].sort((a, b) =>
                    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                );

                // Process each sample
                for (let i = 0; i < sortedSamples.length; i++) {
                    const startTime = new Date(sortedSamples[i].startDate).getTime();
                    let totalSteps = Math.floor(sortedSamples[i].value);

                    // Look for samples within 5 hours of this one
                    for (let j = i + 1; j < sortedSamples.length; j++) {
                        const nextTime = new Date(sortedSamples[j].startDate).getTime();

                        // If within 5 hours, add to total
                        if (nextTime - startTime <= 5 * 60 * 60 * 1000) {
                            totalSteps += Math.floor(sortedSamples[j].value);
                        } else {
                            break; // Past 5-hour window
                        }
                    }

                    // Update max steps if this period has more
                    if (totalSteps > maxStepsIn5Hours) {
                        maxStepsIn5Hours = totalSteps;
                    }
                }

                // Return steps if over 5k, otherwise 0
                if (maxStepsIn5Hours >= 5000) {
                    resolve(maxStepsIn5Hours);
                } else {
                    resolve(0);
                }
            });
        });
    };

    const getWeeklyAverageOfSteps = async (): Promise<number[]> => {
        // console.log("getWeeklyAverageOfSteps -- start");
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
                            resolve(Math.floor(results.value));
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

    const getStepsFromWeekBefore = async(): Promise<number> => {

        if (loadingStepsFromWeekBefore) {
            // console.log('Already loading steps from week before, skipping this call');
            return stepsFromWeekBefore;
        }
    
        setLoadingStepsFromWeekBefore(true);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);
        sevenDaysAgo.setHours(23, 59, 59, 999); // End of yesterday
    
        const fourteenDaysAgo = new Date(sevenDaysAgo);
        fourteenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Go back 6 more days from yesterday
        fourteenDaysAgo.setHours(0, 0, 0, 0); // Start of that day

        let stepsFromWeekBeforeTemp = 0;
        const currentDate = new Date(fourteenDaysAgo);
    
        while (currentDate <= sevenDaysAgo) {
            const options: HealthInputOptions = {
                date: currentDate.toISOString(),
            };

            // console.log("before everyuthing", stepsFromWeekBeforeTemp);
            // console.log("currentDate: ", currentDate);
    
            try {
                const result = await new Promise<number>((resolve, reject) => {
                    AppleHealthKit.getStepCount(options, (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(Math.floor(results.value));
                        }
                    });
                });

                // console.log("stepsFromWeeksBefore day: ", result);
    
                stepsFromWeekBeforeTemp += result;
                // console.log("stepsFromWeeksBefore after added: ", stepsFromWeekBeforeTemp);
            } catch (error) {
                console.log("Error getting steps for date:", currentDate.toISOString(), error);
            }
    
            currentDate.setDate(currentDate.getDate() + 1); // Move to next day
        }

        setStepsFromWeekBefore(stepsFromWeekBeforeTemp); // Update state
        // console.log("StepsFromWeekBefore: ", stepsFromWeekBeforeTemp);

        setLoadingStepsFromWeekBefore(false);
        return stepsFromWeekBeforeTemp; // Return the calculated value
    };

    // Grabbing all health data
    const fetchAllHealthData = async (userID: string) => {
        try {
            setLoading(true);
            // Get previous data from Firebase
            const prevSteps = await getSteps(userID);
            const prevAverageSteps = await getAverageSteps(userID);
            const stepsLastUpdate = await getStepsLastUpdate(userID) || new Date();

            // Fetch current health data
            const dailySteps = await getDailySteps();
            const fiveHoursSteps = await getStepsFiveHoursAgo(stepsLastUpdate);
            const weeklyAverageSteps = await getWeeklyAverageOfSteps();
            const stepsFromWeekBefore = await getStepsFromWeekBefore();

            // Update state
            setSteps(dailySteps);
            setAverageSteps(weeklyAverageSteps);
            setStepsFromWeekBefore(stepsFromWeekBefore);

            return {
                prevData: { prevSteps, prevAverageSteps, stepsLastUpdate, fiveHoursSteps },
                currentData: {
                    dailySteps,
                    weeklyAverageSteps,
                    stepsFromWeekBefore
                }
            };
        } catch (error) {
            console.error("Error fetching health data:", error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // For foreground/UI updates
    const fetchHealthData = useCallback(async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const userID = user ? user.uid : "unknown_user";

        const healthData = await fetchAllHealthData(userID);
        if (healthData) {
            try {
                setLoading(true);

                // Update Firebase and news
                await setStepsFirebase(
                    userID,
                    healthData.currentData.dailySteps,
                    healthData.currentData.weeklyAverageSteps,
                    healthData.currentData.stepsFromWeekBefore
                );
    
                console.log("UPDATING NEWS");
                await newsFunctions(
                    userID,
                    healthData.prevData.prevSteps,
                    healthData.prevData.prevAverageSteps,
                    healthData.prevData.fiveHoursSteps,
                    healthData.prevData.stepsLastUpdate
                );
    
                await setStepsLastUpdate(userID, new Date());

            } catch (error) {
                console.error("Error updating Firebase and news:", error);
            } finally {
                setLoading(false);
            }
        }
    }, [setLoading, setSteps, setAverageSteps, setStepsFromWeekBefore]);

    // For background updates
    const fetchHealthDataBackground = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const userID = user ? user.uid : "unknown_user";

        const healthData = await fetchAllHealthData(userID);
        if (healthData) {
            // Update Firebase and news
            await setStepsFirebase(
                userID,
                healthData.currentData.dailySteps,
                healthData.currentData.weeklyAverageSteps,
                healthData.currentData.stepsFromWeekBefore
            );

            await newsFunctions(
                userID,
                healthData.prevData.prevSteps,
                healthData.prevData.prevAverageSteps,
                healthData.prevData.fiveHoursSteps,
                healthData.prevData.stepsLastUpdate
            );

            await setStepsLastUpdate(userID, new Date());

            return healthData.currentData;
        }
        return null;
    };
  
    // Check permissions
    const checkAndRequestPermissions = () => {
        return new Promise((resolve) => {
            AppleHealthKit.initHealthKit(permissions, (err) => {
                if (err) {
                    console.log('Error getting permissions', err);
                    resolve(false);
                    return;
                }
                console.log('Apple Health Data: Permissions received!');
                setHasPermissions(true);
                resolve(true);
            });
        });
    };

    useEffect(() => {
        const setupHealthKit = async () => {
            const permissionsGranted = await checkAndRequestPermissions();
            if (!permissionsGranted) return;

            // Set up observers
            const healthKitEventEmitter = new NativeEventEmitter(NativeModules.AppleHealthKit);

            const successListener = healthKitEventEmitter.addListener(
                'healthKit:StepCount:setup:success',
                () => console.log('StepCount Observer Setup Success')
            );

            const failureListener = healthKitEventEmitter.addListener(
                'healthKit:StepCount:setup:failure',
                () => console.log('StepCount Observer Setup Failure')
            );

            const updateListener = healthKitEventEmitter.addListener(
                'healthKit:StepCount:new',
                () => {
                    if (!updateLock.current) {
                        console.log('StepCount Observer Triggered');
                        updateLock.current = true;
                        fetchHealthData().finally(() => {
                            setTimeout(() => {
                                updateLock.current = false;
                            }, LOCK_TIMEOUT);
                        });
                    }
                }
            );

            // Firebase Messaging Handlers
            const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
                if (remoteMessage.data?.type === "silent" && remoteMessage.data?.action === "fetchSteps") {
                    if (!updateLock.current) {
                        updateLock.current = true;
                        console.log("Fetching HealthKit data from silent notification (foreground)...");
                        fetchHealthData();
                        setTimeout(() => {
                            updateLock.current = false;
                        }, LOCK_TIMEOUT);
                    }
                }
            });

            messaging().setBackgroundMessageHandler(async (remoteMessage) => {
                if (remoteMessage.data?.type === "silent" && remoteMessage.data?.action === "fetchSteps") {
                    if (!updateLock.current) {
                        updateLock.current = true;
                        console.log("Fetching HealthKit data from silent notification (background)...");
                        const permissionsValid = await checkAndRequestPermissions();
                        if (permissionsValid) {
                            await fetchHealthDataBackground();
                        }
                        setTimeout(() => {
                            updateLock.current = false;
                        }, LOCK_TIMEOUT);
                    }
                }
            });

            // Initial data fetch
            // fetchHealthData();

            return () => {
                successListener.remove();
                failureListener.remove();
                updateListener.remove();
                unsubscribeForeground();
            };
        };

        setupHealthKit();
    }, [setLoading, setSteps, setAverageSteps, setStepsFromWeekBefore, fetchHealthData]);
    


    return { steps, averageSteps, stepsFromWeekBefore, flights, distance, fetchHealthData, isLoading, hasPermissions };
};

export default useHealthData;