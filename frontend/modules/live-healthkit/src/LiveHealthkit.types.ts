// import type { StyleProp, ViewStyle } from 'react-native';

// // Event payload types
// export type ChangeEventPayload = { value: string };
// export type MinuteStepsEventPayload = { value: number };
// export type OnLoadEventPayload = { url: string };

// // Event name and payload mapping
// export type EventName = 'onChange' | 'onMinuteSteps' | 'onLoad';
// export interface EventsPayload {
//   onChange: ChangeEventPayload;
//   onMinuteSteps: MinuteStepsEventPayload;
//   onLoad: OnLoadEventPayload;
// }

// // Native method surface (keep in sync with Swift)
// export interface LiveHealthkitNative {
//   // Constants
//   PI: number;
//   HAS_WORKOUT_API: boolean;

//   // Methods
//   hello: () => Promise<string>;
//   emitTest: () => Promise<void>;
//   requestAuthorization: () => Promise<boolean>;
//   startWorkoutSession: () => Promise<void>;
//   stopWorkoutSession: () => Promise<void>;
//   simulateSteps?: (steps: number) => Promise<void>;
// }

// // React component props
// export type LiveHealthkitViewProps = {
//   url: string;
//   onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
//   style?: StyleProp<ViewStyle>;
// };
