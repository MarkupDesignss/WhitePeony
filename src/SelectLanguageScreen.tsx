import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fonts, Colors, Images } from '../src/constant/index';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "../src/constant/dimentions";
import { useTranslate } from "./hooks/useTranslate";
import T from "./components/T";


const LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
];

const SelectLanguageScreen = ({ navigation }: { navigation: any }) => {
  const { lang, changeLanguage } = useTranslate();
  const [selectedLanguage, setSelectedLanguage] = useState(lang ?? "en");

  useEffect(() => {
    setSelectedLanguage(lang);
  }, [lang]);

  const handleSelectLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    changeLanguage(languageCode);
  };

  const handleNext = async () => {
    await AsyncStorage.setItem("@language_selected", "true");
    navigation.replace('IntroScreen');
    // navigation.navigate("GetStartedScreen");
  };

  return (
    <View style={styles.container}>
      <ImageBackground style={styles.langbg} source={Images.langbg}>

        {/* Page Title */}
        <T style={styles.TopTitle}>Preferred language</T>

        {/* Language Cards */}
        <View style={styles.langList}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageCard,
                selectedLanguage === lang.code && styles.languageCardSelected,
              ]}
              onPress={() => handleSelectLanguage(lang.code)}
              activeOpacity={0.8}
            >
              <View style={styles.radioOuter}>
                {selectedLanguage === lang.code && <View style={styles.radioInner} />}
              </View>

              <Text style={styles.languageText}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* NEXT BUTTON */}
        <TouchableOpacity
          style={[
            styles.nextButton,
          ]}
          onPress={handleNext}
          disabled={!selectedLanguage}
          activeOpacity={0.8}
        >
          <T style={styles.nextButtonText}>Next</T>
        </TouchableOpacity>

      </ImageBackground>
    </View>
  );
};

export default SelectLanguageScreen;

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.text[100],
  },
  langbg: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingTop: hp(60),
  },

  TopTitle: {
    fontSize: 24,
    color: Colors.text[200],
    marginBottom: hp(3),
    textAlign: "center",
  },

  langList: {
    width: "90%",
    justifyContent: 'center',
    alignItems: "center"
  },

  languageCard: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.button[100],
    backgroundColor: Colors.text[100],
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    marginBottom: 16,
  },

  languageCardSelected: {
    backgroundColor: Colors.text[100],
    borderColor: Colors.button[100],
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.button[100],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: Colors.text[100],
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.button[100],
  },

  languageText: {
    marginLeft: 16,
    fontSize: 14,
    color: Colors.text[200],
    textAlign: 'center',
  },

  nextButton: {
    top: hp(3),
    backgroundColor: Colors.button[100],
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 8,
  },

  nextButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
