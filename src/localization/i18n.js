import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as RNLocalize from "react-native-localize";

import en from "./languages/en.json";
import fr from "./languages/fr.json";
import sp from "./languages/sp.json";

// FIX → language code must be "es", not "sp"
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: sp },
};

// Get device language safely
const locales = RNLocalize.getLocales();
let languageCode = locales[0]?.languageCode || "en";

// If app doesn't support it → fallback
if (!resources[languageCode]) {
  languageCode = "en";
}


i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v3",
    lng: languageCode,
    fallbackLng: "en",
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
