import { EventEmitter, requireNativeModule, } from 'expo-modules-core';
// Get native module with the newer API
const LiveHealthkitModule = requireNativeModule('LiveHealthkit');
const Native = requireNativeModule('LiveHealthkit');
const emitter = new EventEmitter(Native);
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
    simulateSteps: (steps) => {
        if (LiveHealthkitModule.simulateSteps) {
            return LiveHealthkitModule.simulateSteps(steps);
        }
        // Fallback to manually emit for testing
        emitter.emit('onMinuteSteps', { value: steps });
        return Promise.resolve();
    },
    // Event handling
    addListener(eventName, listener) {
        return emitter.addListener(eventName, listener);
    },
    removeAllListeners(eventName) {
        emitter.removeAllListeners(eventName);
    },
};
//# sourceMappingURL=LiveHealthkitModule.js.map