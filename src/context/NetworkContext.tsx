import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

type NetworkContextType = {
  isOffline: boolean;
  retryCheck: () => void;
};

const NetworkContext = createContext<NetworkContextType>({
  isOffline: false,
  retryCheck: () => { },
});

const CHECK_URL = 'https://www.google.com/generate_204';
const LATENCY_THRESHOLD_MS = 3000;
const FETCH_TIMEOUT_MS = 6000;

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOffline, setIsOffline] = useState(false);
  const lastToastTime = useRef(0);

  // Measure latency safely
  const measureLatency = async (url: string, timeout = 6000) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const start = Date.now();
      await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(id);

      return Date.now() - start;
    } catch {
      return Infinity; // timeout or error → treat as very slow
    }
  };

  // Show slow internet toast max once every 10s
  const showSlowInternetToast = (lastTimeRef: React.MutableRefObject<number>) => {
    const now = Date.now();
    if (now - lastTimeRef.current > 10000) {
      Toast.show({
        type: 'info',
        text1: 'Slow Internet Connection',
      });
      lastTimeRef.current = now;
    }
  };

  const checkNetwork = async (state?: NetInfoState) => {
    try {
      const netState = state ?? (await NetInfo.fetch());

      const noNetwork = netState.type === 'none' || netState.isConnected === false;

      if (noNetwork) {
        setIsOffline(true);
        return;
      }

      setIsOffline(false);

      const latency = await measureLatency(CHECK_URL, FETCH_TIMEOUT_MS);
      if (latency > LATENCY_THRESHOLD_MS) {
        showSlowInternetToast(lastToastTime);
      }
    } catch (err) {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(checkNetwork);
    checkNetwork(); // initial check
    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOffline,
        retryCheck: () => checkNetwork(),
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
