import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

type NetworkContextType = {
  isOffline: boolean;
  retryCheck: () => void;
};

const NetworkContext = createContext<NetworkContextType>({
  isOffline: false,
  retryCheck: () => {},
});

const CHECK_URL = 'https://www.google.com/generate_204';
const LATENCY_THRESHOLD_MS = 3000;
const FETCH_TIMEOUT_MS = 6000;

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOffline, setIsOffline] = useState(false);
  const lastToastTime = useRef(0);

  const checkNetwork = async (state?: NetInfoState) => {
    const netState = state ?? (await NetInfo.fetch());

    // OFFLINE: SIM + WIFI both off
    const noNetwork =
      netState.type === 'none' || netState.isConnected === false;

    if (noNetwork) {
      setIsOffline(true);
      return;
    }

    setIsOffline(false);

    // SLOW INTERNET → TOAST
    const latency = await measureLatency(
      CHECK_URL,
      FETCH_TIMEOUT_MS
    );

    if (latency > LATENCY_THRESHOLD_MS) {
      showSlowInternetToast(lastToastTime);
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
