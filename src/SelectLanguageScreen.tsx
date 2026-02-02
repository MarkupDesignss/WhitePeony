import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage, LanguageCode } from './redux/slices/languageSlice';
import { RootState } from './redux/store';
import { useNavigation } from '@react-navigation/native';

const languages: { code: LanguageCode; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'cs', label: 'Czech', flag: '🇨🇿' },
];

export default function SelectLanguageScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const selectedLanguage = useSelector((state: RootState) => state.language.code);
  const [loading, setLoading] = useState(false);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLoading(true);
    dispatch(setLanguage(code));

    setTimeout(() => {
      setLoading(false);
      navigation.goBack();
    }, 2000);
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
          disabled={loading}
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

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#28a745" />
          <Text style={styles.loadingText}>Updating Language...</Text>
        </View>
      )}
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#28a745',
    fontWeight: '500',
  },
});
