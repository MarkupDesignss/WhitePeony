import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage, LanguageCode } from '../../redux/slices/languageSlice';
import { RootState } from '../../redux/store';

import { Colors, Images } from '../../../src/constant';
import { heightPercentageToDP as hp } from '../../../src/constant/dimentions';

import T from '../../../src/components/T';

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'cs', label: 'Czech' },
  { code: 'hi', label: 'हिंदी' },
];

const OnBoardingScreen = ({ navigation }: { navigation: any }) => {
  const dispatch = useDispatch();

  const reduxLanguage = useSelector((state: RootState) => state.language.code);

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(
    reduxLanguage ?? 'en',
  );

  useEffect(() => {
    setSelectedLanguage(reduxLanguage);
  }, [reduxLanguage]);

  const handleSelectLanguage = (code: LanguageCode) => {
    setSelectedLanguage(code);
    dispatch(setLanguage(code));
  };

  const handleNext = async () => {
    await AsyncStorage.setItem('@language_selected', 'true');
    navigation.replace('IntroScreen');
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={Images.langbg} style={styles.langbg}>
        {/* Title */}
        <T style={styles.title}>Preferred language</T>

        {/* Language List */}
        <View style={styles.list}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.card,
                selectedLanguage === lang.code && styles.cardSelected,
              ]}
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage(lang.code)}
            >
              <View style={styles.radioOuter}>
                {selectedLanguage === lang.code && (
                  <View style={styles.radioInner} />
                )}
              </View>

              <Text style={styles.label}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          activeOpacity={0.8}
          onPress={handleNext}
        >
          <T style={styles.nextText}>Next</T>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
};

export default OnBoardingScreen;

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.text[100],
  },

  langbg: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: hp(8),
  },

  title: {
    fontSize: 24,
    color: Colors.text[200],
    marginBottom: hp(3),
    textAlign: 'center',
  },

  list: {
    width: '90%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
  },

  card: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.button[100],
    backgroundColor: Colors.text[100],
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    marginBottom: 16,
  },

  cardSelected: {
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.button[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.button[100],
  },

  label: {
    marginLeft: 16,
    fontSize: 14,
    color: Colors.text[200],
  },

  nextButton: {
    marginTop: hp(3),
    backgroundColor: Colors.button[100],
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 10,
  },

  nextText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
