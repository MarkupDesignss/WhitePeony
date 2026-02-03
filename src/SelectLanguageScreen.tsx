import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage, LanguageCode } from './redux/slices/languageSlice';
import { RootState } from './redux/store';
import { useNavigation } from '@react-navigation/native';

const languages: { code: LanguageCode; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'cs', label: 'Czech', flag: '🇨🇿' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' }, // Added Hindi
];

export default function SelectLanguageScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const selectedLanguage = useSelector((state: RootState) => state.language.code);

  const handleSelectLanguage = (code: LanguageCode) => {
    dispatch(setLanguage(code));
   navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language</Text>

      {languages.map(lang => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.button,
            selectedLanguage === lang.code && styles.selectedButton,
          ]}
          onPress={() => handleSelectLanguage(lang.code)}
        >
          <Text
            style={[
              styles.buttonText,
              selectedLanguage === lang.code && styles.selectedButtonText,
            ]}
          >
            <Text style={styles.flag}>{lang.flag}</Text> {lang.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  selectedButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    fontSize: 18,
    color: '#333',
    marginLeft: 10,
  },
  selectedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  flag: {
    fontSize: 22,
  },
});