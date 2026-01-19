import React, { useEffect } from 'react'
import { StyleSheet, Text, View, StatusBar, Platform, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CommonLoader } from './components/CommonLoader/commonLoader'

const SplashScreens = () => {
  const { showLoader, hideLoader } = CommonLoader()
  const logo = require('../src/assets/Png/splashlogo.png')
  const navigation = useNavigation<any>()

  useEffect(() => {
    showLoader()
    const t = setTimeout(() => {
      hideLoader()
      navigation.replace('SelectLanguageScreen')
    }, 3000)

    return () => {
      clearTimeout(t)
      hideLoader()
    }
  }, [navigation, showLoader, hideLoader]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />

      <Image source={logo} style={styles.logo} resizeMode="contain" />
    </View>
  )
}

export default SplashScreens

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: '60%',
    height: undefined,
    aspectRatio: 1,
    marginBottom: 20,
  },
  appNameContainer: {
    marginTop: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
})