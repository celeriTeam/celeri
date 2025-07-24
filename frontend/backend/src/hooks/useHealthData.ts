import { useEffect, useState, useCallback, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { getAverageSteps, getStepsLastUpdate, getSteps, setStepsFirebase, setStepsLastUpdate, setLastLogin } from '../users'; 
import { getAuth } from "firebase/auth";
import AppleHealthKit, {
    HealthInputOptions,
    HealthKitPermissions,
    HealthObserver,
    HealthUnit,
} from "react-native-health";
import { 
  initialize as healthConnectInitialize,
  requestPermission as healthConnectRequestPermission,
  readRecords
} from 'react-native-health-connect';
import { newsFunctions } from '../news';
import { set } from 'date-fns';
import { get } from 'http';
import { get1v1StartTime, update1v1Steps } from '../1v1';

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
<<<<<<< HEAD
=======
    // console.log("useHealthData is running");
>>>>>>> 54f2f72f (final frontend fixes for 1v1)
    const [prevData, setPrevData] = useState<any>(null);
    const [steps, setSteps] = useState(0);
    const [averageSteps, setAverageSteps] = useState<number[]>([]);
    const [stepsFromWeekBefore, setStepsFromWeekBefore] = useState(0);
    const [flights, setFlights] = useState(0);
    const [distance, setDistance] = useState(0);
    const [loadingStepsFromWeekBefore, setLoadingStepsFromWeekBefore] = useState(false);
    const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
    const [isLoading, setLoading] = useState(true);

    const newsUpdateLock = useRef(false);
    const NEWS_LOCK_TIMEOUT = 30000;

    const getStepCountPlatform = async (options: HealthInputOptions): Promise<number> => {
        if (Platform.OS === 'ios') {
            return new Promise((resolve, reject) => {
                let flooredSteps = 0;
                AppleHealthKit.getStepCount(options, (err, results) => {
                    if (err) {
                        console.log('Error getting the steps');
                        reject(err);
                        return 0;
                    } 
                    flooredSteps = Math.floor(results.value);
                    resolve(flooredSteps);
                });
            });
        } else if (Platform.OS === 'android') {
            try {
                console.log('fetching android steps...');
                const date = new Date(options.date || Date.now());
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
    
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);
    
                // Use readRecords to get steps for today
                const results = await readRecords('Steps', {
                    timeRangeFilter: {
                        operator: 'between',
                        startTime: startOfDay.toISOString(),
                        endTime: endOfDay.toISOString(),
                    }
                });

                console.log('Android steps results:', results);
    
                // Sum up the steps from all records
                const totalSteps = results.records.reduce((sum, record) => sum + record.count, 0);
                return totalSteps;
            } catch (error) {
                console.log('Error reading Android steps:', error);
                return 0;
            }
        }
        return 0;
    };

    const getDailySteps = async (): Promise<number> => {
        // console.log("getDailySteps -- start");
        const today = new Date();
        const options: HealthInputOptions = {
            date: today.toISOString(),
        };

        try {
            const steps = await getStepCountPlatform(options);
            setSteps(steps);
            return steps;
        } catch (error) {
            console.log('Error getting daily steps:', error);
            return 0;
        }
    };

    const getStepsFiveHoursAgo = async (stepsLastUpdate: Date): Promise<number> => {

        const currentDate = new Date();

        if (Platform.OS === 'ios') {
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
        } else if (Platform.OS === 'android') {
            try {
                // Read step records from Health Connect
                const results = await readRecords('Steps', {
                    timeRangeFilter: {
                        operator: 'between',
                        startTime: stepsLastUpdate.toISOString(),
                        endTime: currentDate.toISOString()
                    }
                });

                // Sort records by start time
                const sortedRecords = results.records.sort((a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );

                let maxStepsIn5Hours = 0;

                // Check all possible 5-hour windows
                for (let i = 0; i < sortedRecords.length; i++) {
                    const windowStart = new Date(sortedRecords[i].startTime).getTime();
                    let windowSteps = sortedRecords[i].count;

                    // Check subsequent records
                    for (let j = i + 1; j < sortedRecords.length; j++) {
                        const recordTime = new Date(sortedRecords[j].startTime).getTime();

                        if ((recordTime - windowStart) <= 5 * 60 * 60 * 1000) {
                            windowSteps += sortedRecords[j].count;
                        } else {
                            break;
                        }
                    }

                    if (windowSteps > maxStepsIn5Hours) {
                        maxStepsIn5Hours = windowSteps;
                    }
                }

                return maxStepsIn5Hours >= 5000 ? maxStepsIn5Hours : 0;

            } catch (error) {
                console.error('Android steps fetch error:', error);
                return 0;
            }
        }
        return 0;
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
                const result = await getStepCountPlatform(options);    
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
                const result = await getStepCountPlatform(options);
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

    const getStepCountForRange = async (start: Date, end: Date): Promise<number> => {
        if (Platform.OS === 'ios') {
            return new Promise((resolve, reject) => {
                const options = {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                };
<<<<<<< HEAD
                console.log("start and end", options.startDate, options.endDate);
=======
                console.log('startdate: ', options.startDate);
                console.log('enddate: ', options.endDate);
>>>>>>> 54f2f72f (final frontend fixes for 1v1)

                AppleHealthKit.getDailyStepCountSamples(options, (err, results) => {
                // AppleHealthKit.getSamples(options, (err, results) => {
                    if (err || !results) {
                        console.log("Error fetching steps for range", err);
                        resolve(0);
                    } else {

                        console.log("getDailyStepCountSamples started");

                        const total = results.reduce((sum, s) => {
                            const sStart = new Date(s.startDate).getTime();
                            const sEnd = new Date(s.endDate).getTime();
                            if (sEnd > start.getTime() && sStart < end.getTime()) {
                                return sum + s.value;
                            }
                            console.log("sum, ", sum);
                            return sum;
                        }, 0);
<<<<<<< HEAD

                        console.log("total, ", total);
                        console.log("results, ", results);
=======
                        console.log('results', results);
>>>>>>> 54f2f72f (final frontend fixes for 1v1)
                        resolve(Math.floor(total));
                    }
                });
            });
        } else {
            try {
                const records = await readRecords('Steps', {
                    timeRangeFilter: {
                        operator: 'between',
                        startTime: start.toISOString(),
                        endTime: end.toISOString()
                    }
                });
                return records.records.reduce((sum, r) => sum + r.count, 0);
            } catch (err) {
                console.log("Android steps error:", err);
                return 0;
            }
        }
    };

    const get1v1Steps = async (userID: string) => {
        const { startTime, current1v1ID } = await get1v1StartTime(userID);
        if (startTime === null || current1v1ID === null) return;

        // Calculate time since start
        const now = new Date();
        const hoursSinceStart = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
        const completedIntervals = Math.floor(hoursSinceStart / 4) + 1;

        let stepsMap: { [key: string]: number } = {
            '4': 0,
            '8': 0,
            '12': 0,
            '16': 0,
            '20': 0,
            '24': 0
        };

        let sum = 0;

        for (let interval = 0; interval < 6; interval++) {
            const hourMark = interval * 4;
            const stepsInterval = `${hourMark + 4}`;

            if (interval >= completedIntervals) {
                console.log('adding ', sum, ' steps for interval:', stepsInterval);
                stepsMap[stepsInterval] = sum;
                continue;
            };

            const intervalStart = new Date(startTime.getTime() + hourMark * 60 * 60 * 1000);
            const intervalEnd = new Date(startTime.getTime() + (hourMark + 4) * 60 * 60 * 1000);

            const intervalSteps = await getStepCountForRange(intervalStart, intervalEnd);
            sum += intervalSteps;
            console.log('adding ', intervalSteps, ' steps for interval:', stepsInterval);
            stepsMap[stepsInterval] = sum;
        }

        // Write updated steps to Firestore
        await update1v1Steps(userID, current1v1ID, stepsMap);
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
        if (healthData && !newsUpdateLock.current) {
            try {
                newsUpdateLock.current = true;

                // Update Firebase and news
                // await setStepsFirebase(
                //     userID,
                //     healthData.currentData.dailySteps,
                //     healthData.currentData.weeklyAverageSteps,
                //     healthData.currentData.stepsFromWeekBefore
                // );
    
                console.log("UPDATING NEWS");
                await newsFunctions(
                    userID,
                    healthData.prevData.prevSteps,
                    healthData.prevData.prevAverageSteps,
                    healthData.prevData.fiveHoursSteps,
                    healthData.prevData.stepsLastUpdate
                );
    
                await setStepsLastUpdate(userID, new Date());
                await setLastLogin(userID, new Date());
                await get1v1Steps(userID);

            } catch (error) {
                console.error("Error updating Firebase and news:", error);
            } finally {
                setTimeout(() => {
                    newsUpdateLock.current = false;
                }, NEWS_LOCK_TIMEOUT);
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
            await get1v1Steps(userID);

            return healthData.currentData;
        }
        return null;
    };
  
    // Check permissions
    const checkAndRequestPermissions = async () => {
        if (Platform.OS === 'ios') {
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
        } else if (Platform.OS === 'android') {
            try {
                console.log('trying to initialize Health Connect on android...');
                const initialized = await healthConnectInitialize();
                if (!initialized) {
                    console.log('Health Connect not available');
                    return false;
                }

                const granted = await healthConnectRequestPermission([
                    { accessType: 'read', recordType: 'Steps' }
                ]);
                const hasStepsPermission = granted.some(p => 
                  p.recordType === 'Steps' && p.accessType === 'read'
                );

                // if (!granted) {
                //     console.log('Health Connect permission denied');
                //     return false;
                // }

                setHasPermissions(hasStepsPermission);
                return hasStepsPermission;
            } catch (error) {
                console.log('Android Health Connect error:', error);
                return false;
            }
        }
        return false;
    };

    useEffect(() => {
        const setupHealthKit = async () => {
            const permissionsGranted = await checkAndRequestPermissions();
            if (!permissionsGranted) {
                setLoading(false);
                return;
            }

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
                    console.log('StepCount Observer Triggered');
                    fetchHealthData();
                }
            );

            // Firebase Messaging Handlers
            const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
                if (remoteMessage.data?.type === "silent" && remoteMessage.data?.action === "fetchSteps") {
                    console.log("Fetching HealthKit data from silent notification (foreground)...");
                    fetchHealthData();
                }
            });

            messaging().setBackgroundMessageHandler(async (remoteMessage) => {
                if (remoteMessage.data?.type === "silent" && remoteMessage.data?.action === "fetchSteps") {
                    console.log("Fetching HealthKit data from silent notification (background)...");
                    const permissionsValid = await checkAndRequestPermissions();
                    if (permissionsValid) {
                        await fetchHealthDataBackground();
                    }
                }
            });

            // Initial data fetch
            fetchHealthData();

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