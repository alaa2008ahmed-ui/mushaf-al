import { useEffect } from 'react';
import { KeepAwake } from '@capacitor-community/keep-awake';

export function useWakeLock() {
  useEffect(() => {
    let wakeLock: any = null;
    let isNativeWakeLockActive = false;

    // --- Web Wake Lock API ---
    const requestWebWakeLock = async () => {
      if (isNativeWakeLockActive || document.visibilityState !== 'visible') {
        return;
      }
      
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Web Wake Lock is active.');

          wakeLock.addEventListener('release', () => {
            console.log('Web Wake Lock was released.');
          });

        } catch (err: any) {
          console.warn(`Could not acquire screen wake lock: ${err.message}`);
        }
      } else {
        console.log('Web Wake Lock API is not supported in this environment.');
      }
    };

    // --- Capacitor KeepAwake ---
    const requestCapacitorWakeLock = async () => {
        try {
            await KeepAwake.keepAwake();
            console.log('Capacitor KeepAwake is active.');
            isNativeWakeLockActive = true;
        } catch (e) {
            console.log('Capacitor KeepAwake not available, falling back.');
            requestWebWakeLock();
        }
    };

    // --- Cordova Insomnia Plugin ---
    const setupNativeWakeLock = () => {
        const win = window as any;
        if (win.plugins && win.plugins.insomnia) {
            win.plugins.insomnia.keepAwake(
                () => {
                    console.log("Insomnia (native) wake lock enabled.");
                    isNativeWakeLockActive = true;
                },
                () => {
                    console.warn("Insomnia (native) wake lock failed. Falling back to Web API.");
                    requestWebWakeLock();
                }
            );
        } else {
            console.log("Insomnia plugin not found. Using Web Wake Lock API.");
            requestWebWakeLock();
        }
    };
    
    if ((window as any).Capacitor && (window as any).Capacitor.isNativePlatform()) {
        requestCapacitorWakeLock();
    } else if ((window as any).cordova && (window as any).cordova.platformId !== 'browser') {
        document.addEventListener('deviceready', setupNativeWakeLock, false);
    } else {
        requestWebWakeLock();
        document.addEventListener('visibilitychange', requestWebWakeLock);
    }
    
    return () => {
        if ((window as any).Capacitor && (window as any).Capacitor.isNativePlatform()) {
            KeepAwake.allowSleep().catch(() => {});
        } else if ((window as any).cordova && (window as any).cordova.platformId !== 'browser') {
            document.removeEventListener('deviceready', setupNativeWakeLock, false);
            const win = window as any;
            if (win.plugins && win.plugins.insomnia && win.plugins.insomnia.allowSleepAgain) {
                win.plugins.insomnia.allowSleepAgain(() => console.log("Insomnia: Allowed screen to sleep."), () => {});
            }
        } else {
            document.removeEventListener('visibilitychange', requestWebWakeLock);
            if (wakeLock !== null) {
                wakeLock.release();
                wakeLock = null;
            }
        }
    };
  }, []);
}
