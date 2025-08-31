import { Subscription } from 'expo-modules-core';
import { EventName, EventsPayload } from './LiveHealthkit.types';
declare const _default: {
    PI: number;
    HAS_WORKOUT_API: boolean;
    hello: () => Promise<string>;
    emitTest: () => Promise<void>;
    requestAuthorization: () => Promise<boolean>;
    startWorkoutSession: () => Promise<void>;
    stopWorkoutSession: () => Promise<void>;
    simulateSteps: (steps: number) => Promise<void>;
    addListener<T extends EventName>(eventName: T, listener: (event: EventsPayload[T]) => void): Subscription;
    removeAllListeners(eventName: EventName): void;
};
export default _default;
//# sourceMappingURL=LiveHealthkitModule.d.ts.map