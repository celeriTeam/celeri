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
        if (!hasPermissions) {
            return;
        }
        
        // Query Health data
        const options: HealthInputOptions = {
            date: new Date().toISOString(),
        };
        
        AppleHealthKit.getStepCount(options, (err, results) => {
            if (err) {
                console.log('Error getting the steps');
                return;
            }
            setSteps(results.value);
        });

        // Fetch step counts for the past week
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 7 days ago
        const endDate = new Date();

        const weeklyOptions = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            type: 'Walking' as HealthObserver,
        };

        AppleHealthKit.getSamples(weeklyOptions, (err, results) => {
            if (err) {
                console.log('Error getting weekly steps', err);
                return;
            }

            if (results && results.length > 0) {
                const totalSteps = results.reduce((sum, sample) => sum + sample.value, 0);
                const avgSteps = totalSteps / results.length;
                setAverageSteps(avgSteps);
            } else {
                setAverageSteps(0);
            }
        });
        

    }, [hasPermissions]);


    return { steps, averageSteps, flights, distance };
};

export default useHealthData;