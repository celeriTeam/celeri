import { useEffect, useState } from 'react';

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
        AppleHealthKit.initHealthKit(permissions, (err) => {
            if (err) {
                console.log('Error getting permissions', err);
                return;
            }
            console.log('Apple Health Data: Permissions received!');
            setHasPermission(true);
        });
    }, []);

    useEffect(() => {
        if (!hasPermissions) return;

        getDailySteps();
        getWeeklySteps();
        getWeeklyAverageOfSteps();
        
        const intervalId = setInterval(() => {
            getDailySteps();
        }, 300000);

        return () => clearInterval(intervalId);
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