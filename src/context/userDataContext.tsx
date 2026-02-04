import React, {
  FC,
  createContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { LocalStorage } from '../helpers/localstorage';

/* ================= TYPES ================= */

export interface UserData {
  isLoggedIn: string | null;
  setIsLoggedIn: (value: boolean | any) => void;

  userData: any;
  setUserData: (data: any) => void;

  // EXISTING (do not remove)
  userType: 'b2c' | 'b2b' | null;
  setUserType: (type: 'b2c' | 'b2b' | null) => void;

  // NEW (tier.type -> "browns")
  tierType: string | null;
  setTierType: (type: string | null) => void;
}

/* ================= CONTEXT ================= */

const UserDataContext = createContext<UserData>({
  isLoggedIn: null,
  setIsLoggedIn: () => { },
  userData: null,
  setUserData: () => { },

  userType: null,
  setUserType: () => { },

  tierType: null,
  setTierType: () => { },
});

type Props = {
  children?: ReactNode;
};

/* ================= PROVIDER ================= */

const UserDataContextProvider: FC<Props> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // EXISTING
  const [userType, setUserType] = useState<'b2c' | 'b2b' | null>(null);

  // NEW
  const [tierType, setTierType] = useState<string | null>(null);

  useEffect(() => {
    setContextDataFromStorage();
  }, []);

  const setContextDataFromStorage = async () => {
    try {
      const login = await LocalStorage.read('@login');
      const user = await LocalStorage.read('@user');

      const storedUserType = await LocalStorage.read('@userType');
      const storedTierType = await LocalStorage.read('@tierType');


      setIsLoggedIn(login || null);
      setUserData(user || null);

      /* ---------- userType (b2c / b2b) ---------- */
      if (storedUserType === 'b2c' || storedUserType === 'b2b') {
        setUserType(storedUserType);
      } else if (user?.type === 'b2c' || user?.type === 'b2b') {
        setUserType(user.type);
        await LocalStorage.save('@userType', user.type);
      } else {
        setUserType(null);
      }

      /* ---------- tierType (tier.type) ---------- */
      if (storedTierType) {
        setTierType(storedTierType);
      } else if (user?.tier?.type) {
        setTierType(user.tier.type);
        await LocalStorage.save('@tierType', user.tier.type);
      } else {
        setTierType(null);
      }
    } catch (error) {
      console.error('Storage error:', error);
      setUserType(null);
      setTierType(null);
    }
  };

  /* ================= SAFE SETTERS ================= */

  const setUserTypeSafe = (type: 'b2c' | 'b2b' | null) => {
    setUserType(type);
    if (type) {
      LocalStorage.save('@userType', type);
    } else {
      LocalStorage.remove('@userType');
    }
  };

  const setTierTypeSafe = (type: string | null) => {
    setTierType(type);
    if (type) {
      LocalStorage.save('@tierType', type);
    } else {
      LocalStorage.remove('@tierType');
    }
  };

  /* ================= PROVIDER ================= */

  return (
    <UserDataContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,

        userType,
        setUserType: setUserTypeSafe,

        tierType,
        setTierType: setTierTypeSafe,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export { UserDataContextProvider, UserDataContext };
