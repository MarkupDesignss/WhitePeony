import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalStorage } from './localstorage';
import DocumentPicker, { types } from '@react-native-documents/picker';
//To Sigout of User

export const handleSignout = (setIsLoggedIn: (value: boolean) => void,) => {
  setTimeout(() => {
    setIsLoggedIn(false);
    LocalStorage.save('@login', false);
    LocalStorage.save('@user', null);
    LocalStorage.flushQuestionKeys();
  }, 700);
};

export const documentPicker = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [types.allFiles],
    });

    return result;
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      console.log('User cancelled the picker');
    } else {
      console.log('Unknown error: ', err);
    }
  }
}

export const convertTo12Hour = (time24h: string): string => {
  if (!time24h || typeof time24h !== 'string') return '';

  const [hourStr, minuteStr] = time24h.split(':');
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  const modifier = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12; // Midnight or Noon

  const hh = String(hours);
  const mm = String(minutes).padStart(2, '0');

  return `${hh}:${mm} ${modifier}`;
};

export const addOneDay = (dateStr: string): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1); // Add 1 day

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
};

export const setFirstLaunch = async () => {
  await AsyncStorage.setItem('isFirstLaunch', 'false');
};

export const checkFirstLaunch = async () => {
  const value = await AsyncStorage.getItem('isFirstLaunch');
  return value === null; // true means first time
};

export const formatDate =  (dateString) => {
  const date = new Date(dateString);

  const options = {
    month: 'short',  // "Sep"
    day: '2-digit',  // "23"
    year: 'numeric', // "2025"
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,   // "10:00 PM"
  };

  // Example: "Sep 23, 2025, 10:00 PM"
  const formatted = date.toLocaleString('en-US', options);

  // Add dash between date and time
  return formatted.replace(',', '') // remove comma after day
    .replace(' ', ', ')             // add comma after month
    .replace(',', ' -');            // final dash before time
}




