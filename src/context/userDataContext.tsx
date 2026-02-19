import React, { FC, createContext, ReactNode, useState, useEffect } from 'react';
import { LocalStorage } from '../helpers/localstorage';
import { UserService } from '../service/ApiService';
import { HttpStatusCode } from 'axios';

/* ================= TYPES ================= */

export interface UserData {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  userData: any;
  setUserData: (data: any) => void;
  userType: 'b2c' | 'b2b' | null;
  setUserType: (type: 'b2c' | 'b2b' | null) => void;
  tierType: string | null;
  setTierType: (type: string | null) => void;
  isLoading: boolean;
  refetchProfile: () => Promise<void>;
}

/* ================= CONTEXT ================= */

const UserDataContext = createContext<UserData>({
  isLoggedIn: false,
  setIsLoggedIn: () => { },
  userData: null,
  setUserData: () => { },
  userType: null,
  setUserType: () => { },
  tierType: null,
  setTierType: () => { },
  isLoading: true,
  refetchProfile: async () => { },
});

type Props = {
  children?: ReactNode;
};

/* ================= PROVIDER ================= */

const UserDataContextProvider: FC<Props> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const [userType, setUserType] = useState<'b2c' | 'b2b' | null>(null);
  const [tierType, setTierType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check login status on mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      setIsLoading(true);

      // Check if token exists
      const token = await LocalStorage.read('@token');

      if (token) {
        console.log('🔑 Token found, fetching profile...');
        await fetchUserProfile();
      } else {
        console.log('🚫 No token found, user is logged out');
        setIsLoggedIn(false);
        setUserData(null);
        setUserType(null);
        setTierType(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error checking login status:', error);
      setIsLoggedIn(false);
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      console.log('📡 Calling UserService.profile()...');

      const response = await UserService.profile();

      console.log('📥 Profile API Response Status:', response?.status);
      console.log('📥 Profile API Full Response:', JSON.stringify(response?.data, null, 2));

      // Check if response is successful
      if (response?.status === HttpStatusCode.Ok && response?.data) {

        // Based on your API response structure:
        // {
        //   "success": true,
        //   "user": {
        //     "id": 38,
        //     "email": "peter@yopmail.com",
        //     "name": "Peter",
        //     "phone": "9876543211",
        //     "type": "b2c",
        //     "profile_image": null,
        //     "created_at": "2026-01-22T09:36:17.000000Z",
        //     "address": { ... },
        //     "tier": { "id": 1, "type": "browns" }
        //   }
        // }

        // Extract user data from response (handle both structures)
        const profileData = response.data.user || response.data;

        console.log('✅ Profile data extracted:', {
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          type: profileData.type,
          profile_image: profileData.profile_image,
          tier: profileData.tier?.type,
          address: profileData.address ? 'exists' : 'none',
          created_at: profileData.created_at
        });

        // Set all user data
        setUserData(profileData);
        setIsLoggedIn(true);

        // Set user type from the 'type' field (b2c/b2b)
        if (profileData.type === 'b2c' || profileData.type === 'b2b') {
          setUserType(profileData.type);
          console.log('✅ User type set to:', profileData.type);
        }

        // Set tier type from tier.type (browns, etc.)
        if (profileData.tier?.type) {
          setTierType(profileData.tier.type);
          console.log('✅ Tier type set to:', profileData.tier.type);
        }

      } else {
        console.log('❌ Profile fetch failed - invalid response');
        console.log('Response data:', response?.data);
        setIsLoggedIn(false);
        setUserData(null);
        setUserType(null);
        setTierType(null);

        // Clear invalid token
        await LocalStorage.remove('@token');
      }
    } catch (error: any) {
      console.error('❌ Error in fetchUserProfile:', error);

      // Log detailed error information
      if (error.response) {
        console.error('❌ Error response:', {
          status: error.response.status,
          data: error.response.data
        });

        // Check if error is due to invalid token (401)
        if (error.response.status === 401) {
          console.log('🔑 Token invalid or expired, clearing...');
          await LocalStorage.remove('@token');
        }
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
      } else {
        console.error('❌ Error message:', error.message);
      }

      setIsLoggedIn(false);
      setUserData(null);
      setUserType(null);
      setTierType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setIsLoggedInSafe = (value: boolean) => {
    console.log('🔐 Setting isLoggedIn:', value);
    setIsLoggedIn(value);

    if (!value) {
      // Clear all data on logout
      setUserData(null);
      setUserType(null);
      setTierType(null);
    }
  };

  const setUserDataSafe = (data: any) => {
    setUserData(data);
    if (data) {
      if (data.type === 'b2c' || data.type === 'b2b') {
        setUserType(data.type);
      }
      if (data.tier?.type) {
        setTierType(data.tier.type);
      }
    }
  };

  const refetchProfile = async () => {
    await fetchUserProfile();
  };

  // Show loading while checking status
  if (isLoading) {
    return null; // Or a loading spinner component
  }

  return (
    <UserDataContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn: setIsLoggedInSafe,
        userData,
        setUserData: setUserDataSafe,
        userType,
        setUserType,
        tierType,
        setTierType,
        isLoading,
        refetchProfile,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export { UserDataContextProvider, UserDataContext };