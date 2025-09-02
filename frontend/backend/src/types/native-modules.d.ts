// src/types/native-modules.d.ts
import { NativeModules } from 'react-native';

declare module 'react-native' {
  interface NativeModulesStatic {
    PedometerModule: {
      startPedometerUpdates(callback: (err: any, steps: number) => void): void;
      queryPedometerData(startTimestamp: number): Promise<number>;
    };
  }
}

// Ensure your tsconfig.json includes this folder in “typeRoots” (or use an /// <reference>)
