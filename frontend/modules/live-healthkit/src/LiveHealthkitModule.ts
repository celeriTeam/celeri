import { EventEmitter, requireNativeModule, Subscription, } from 'expo-modules-core';
import type { NativeModule } from 'expo-modules-core';
import { EventName, EventsPayload, LiveHealthkitNative } from './LiveHealthkit.types';

// Get native module with the newer API
const LiveHealthkitModule = requireNativeModule<LiveHealthkitNative>('LiveHealthkit');

// Create emitter
// Minimal shape EventEmitter expects
type EmitterTarget = {
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

// Your full module surface as seen from JS
type LiveModule = LiveHealthkitNative & EmitterTarget;

const Native = requireNativeModule<LiveModule>('LiveHealthkit');
const emitter = new EventEmitter(Native as EmitterTarget);

export default {
  // Constants
  PI: LiveHealthkitModule.PI,
  HAS_WORKOUT_API: LiveHealthkitModule.HAS_WORKOUT_API || false,

  // Methods
  hello: () => LiveHealthkitModule.hello(),
  emitTest: () => LiveHealthkitModule.emitTest(),
  requestAuthorization: () => LiveHealthkitModule.requestAuthorization(),
  startWorkoutSession: () => LiveHealthkitModule.startWorkoutSession(),
  stopWorkoutSession: () => LiveHealthkitModule.stopWorkoutSession(),
  simulateSteps: (steps: number) => {
    if (LiveHealthkitModule.simulateSteps) {
      return LiveHealthkitModule.simulateSteps(steps);
    }
    // Fallback to manually emit for testing
    emitter.emit('onMinuteSteps', { value: steps });
    return Promise.resolve();
  },

  // Event handling
  addListener<T extends EventName>(eventName: T, listener: (event: EventsPayload[T]) => void): Subscription {
    return emitter.addListener(eventName, listener);
  },

  removeAllListeners(eventName: EventName): void {
    emitter.removeAllListeners(eventName);
  },
};
