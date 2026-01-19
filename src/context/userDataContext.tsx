import React, { FC, createContext, ReactNode, useState, useEffect } from 'react';
import { LocalStorage } from '../helpers/localstorage';

// const UserDataContext = createContext({});
export interface UserData {
  isLoggedIn: string | null;
  setIsLoggedIn: (value: boolean | any) => void;
  userData: any;
  setUserData: (data: any) => void;
}

const UserDataContext = createContext<UserData>({
  isLoggedIn: null,
  setIsLoggedIn: () => { },
  userData: null,
  setUserData: () => { },
});
type Props = {
  children?: ReactNode;
};

const UserDataContextProvider: FC<Props> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>('');

  useEffect(() => {
    setContextDataFromStorage();
  }, []);

  const setContextDataFromStorage = async () => {
    let val = await LocalStorage.read('@login');
    let user = await LocalStorage.read('@user');
    setUserData(user);
    setIsLoggedIn(val);
  };

  return (
    <UserDataContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
      }}>
      {children}
    </UserDataContext.Provider>
  );
};

export { UserDataContextProvider, UserDataContext };
