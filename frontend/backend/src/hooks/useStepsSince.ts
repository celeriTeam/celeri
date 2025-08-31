import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';

export function useStepsSince(startAtMs: number) {
    const [steps, setSteps] = useState(0);
    const baselineRef = useRef(0); // holds past steps from startAtMs -> now 
    // stores the watchStepCount subscription so we can cleanly remove it when startAtMs changes or the component unmounts
    const subRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);


    // Gives you a baseline step count 
    async function primeBaseline() {
        const now = new Date();
        const past = await Pedometer.getStepCountAsync(new Date(startAtMs), now);
        baselineRef.current = past?.steps ?? 0;
        setSteps(baselineRef.current);
    }

    async function startWatcher() {
        const isAvail = await Pedometer.isAvailableAsync();
        if (!isAvail) return;
        await primeBaseline();
        subRef.current = Pedometer.watchStepCount(({ steps: liveDelta }) => {
            setSteps(baselineRef.current + liveDelta);
        });
    }

    function stopWatcher() {
        subRef.current?.remove();
        subRef.current = null;
    }

    useEffect(() => {             // mount / startAtMs change
        startWatcher();
        return () => stopWatcher();
    }, [startAtMs]);

    useEffect(() => {             // foreground → restart watcher
        const onChange = (s: AppStateStatus) => {
        if (s === 'active') startWatcher();
        };
        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, [startAtMs]);;

    // Re-baseline after background → foreground so totals don’t drift
    useEffect(() => {
        const sub = AppState.addEventListener('change', s => {
        if (s === 'active') primeBaseline();
        });
        return () => sub.remove();
    }, [startAtMs]);

    return steps;
}
