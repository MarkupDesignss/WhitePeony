import React, {
  FC,
  createContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { LocalStorage } from '../helpers/localstorage';

export interface UserData {
  isLoggedIn: string | null;
  setIsLoggedIn: (value: boolean | any) => void;
  userData: any;
  setUserData: (data: any) => void;
  userType: 'b2c' | 'b2b' | null;
  setUserType: (type: 'b2c' | 'b2b' | null) => void;
}

const UserDataContext = createContext<UserData>({
  isLoggedIn: null,
  setIsLoggedIn: () => { },
  userData: null,
  setUserData: () => { },
  userType: null,
  setUserType: () => { },
});

type Props = {
  children?: ReactNode;
};

const UserDataContextProvider: FC<Props> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>('');
  const [userType, setUserType] = useState<'b2c' | 'b2b' | null>(null);

  useEffect(() => {
    setContextDataFromStorage();
  }, []);

  const setContextDataFromStorage = async () => {
    try {
      let val = await LocalStorage.read('@login');
      let user = await LocalStorage.read('@user');
      let userTypeFromStorage = await LocalStorage.read('@userType');

      setUserData(user || null);
      setIsLoggedIn(val || null);

      // Validate and set userType
      if (userTypeFromStorage === 'b2c' || userTypeFromStorage === 'b2b') {
        setUserType(userTypeFromStorage);
      } else {
        // If user is logged in but userType is invalid, default based on user data
        if (user?.type === 'b2c' || user?.type === 'b2b') {
          setUserType(user.type);
          await LocalStorage.save('@userType', user.type);
        } else {
          setUserType(null);
        }
      }
    } catch (error) {
      console.error('Error reading from storage:', error);
      setUserData(null);
      setIsLoggedIn(null);
      setUserType(null);
    }
  };

  // Create a safe setter for userType
  const setUserTypeSafe = (type: 'b2c' | 'b2b' | null) => {
    setUserType(type);
    // Also save to storage
    if (type) {
      LocalStorage.save('@userType', type);
    } else {
      LocalStorage.remove('@userType');
    }
  };

  return (
    <UserDataContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        userType,
        setUserType: setUserTypeSafe, // Use the safe setter
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export { UserDataContextProvider, UserDataContext };