import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NativeModules } from 'react-native';

const { PedometerModule } = NativeModules;
const UPLOAD_INTERVAL = 60 * 1000;

export function useLiveSteps(onUpload: (steps: number) => void) {
  const lastUploadRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // 1) start live updates in foreground
    PedometerModule.startPedometerUpdates((err, steps) => {
      if (!err) {
        onUpload(steps);
      }
    });

    // 2) every minute submit a snapshot and bump lastUpload
    intervalRef.current = setInterval(() => {
      PedometerModule.queryPedometerData(lastUploadRef.current / 1000)
        .then((steps: number) => {
          onUpload(steps);
        })
        .catch(() => {
          // handle error
        });
      lastUploadRef.current = Date.now();
    }, UPLOAD_INTERVAL);

    // 3) on resume, catch up any missed steps
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        const startTs = lastUploadRef.current / 1000; // seconds since epoch
        try {
          const missed = await PedometerModule.queryPedometerData(startTs);
          onUpload(missed);
        } catch {
          // handle error
        }
        lastUploadRef.current = Date.now();
      }
    });

    return () => {
      clearInterval(intervalRef.current!);
      sub.remove();
    };
  }, [onUpload]);
}
