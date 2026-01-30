import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RNLocalize from "react-native-localize";
import { translateText } from "../utils/translate";

const DEFAULT_LANG = "en";
const STORAGE_KEY = "app_lang";

const TranslationContext = createContext({
  lang: DEFAULT_LANG,
  changeLanguage: async () => { },
  t: async (text) => text,
  isReady: false,
});

export const TranslationProvider = ({ children }) => {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLang) {
          setLang(savedLang);
          return;
        }

        const locales = RNLocalize.getLocales();
        const deviceLang = locales[0]?.languageCode;
        if (deviceLang) {
          setLang(deviceLang);
        }
      } catch (error) {
        hideloader();
        if (error.status === 401) {
         
        }
        else {
          Toast.show({ type: 'error', text1: 'Failed to load wishlist' });
        }
      } finally {
        setIsReady(true);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = useCallback(async (newLang) => {
    try {
      setLang(newLang);
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (error) {
      console.warn("Failed to persist language", error);
    }
  }, []);

  const t = useCallback(
    async (text) => {
      if (!text) {
        return text;
      }
      return translateText(text, lang);
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      changeLanguage,
      t,
      isReady,
    }),
    [lang, changeLanguage, t, isReady]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslate = () => useContext(TranslationContext);
