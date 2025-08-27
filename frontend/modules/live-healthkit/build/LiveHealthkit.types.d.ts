import type { StyleProp, ViewStyle } from 'react-native';
export type ChangeEventPayload = {
    value: string;
};
export type MinuteStepsEventPayload = {
    value: number;
};
export type OnLoadEventPayload = {
    url: string;
};
export type EventName = 'onChange' | 'onMinuteSteps' | 'onLoad';
export interface EventsPayload {
    onChange: ChangeEventPayload;
    onMinuteSteps: MinuteStepsEventPayload;
    onLoad: OnLoadEventPayload;
}
export interface LiveHealthkitNative {
    PI: number;
    HAS_WORKOUT_API: boolean;
    hello: () => Promise<string>;
    emitTest: () => Promise<void>;
    requestAuthorization: () => Promise<boolean>;
    startWorkoutSession: () => Promise<void>;
    stopWorkoutSession: () => Promise<void>;
    simulateSteps?: (steps: number) => Promise<void>;
}
export type LiveHealthkitViewProps = {
    url: string;
    onLoad: (event: {
        nativeEvent: OnLoadEventPayload;
    }) => void;
    style?: StyleProp<ViewStyle>;
};
//# sourceMappingURL=LiveHealthkit.types.d.ts.map