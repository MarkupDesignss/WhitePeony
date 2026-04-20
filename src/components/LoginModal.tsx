// components/LoginModal.tsx
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  BackHandler,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CommonLoader } from './CommonLoader/commonLoader';
import { UserService } from '../service/ApiService';
import { Page } from '../types/pageTypes';
import AppBrowser from './AppBrowser';
import Toast from 'react-native-toast-message';
import { UserData, UserDataContext } from '../context/userDataContext';
import { useCart } from '../context/CartContext';
import { LocalStorage } from '../helpers/localstorage';
import TransletText from '../components/TransletText';
import { useAutoTranslate } from '../hooks/useAutoTranslate';
import FCMService from '../service/FCMService';
import { useGetPagesQuery } from '../api/api';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onGoogleLogin?: () => Promise<{ token: string; user: any } | void>;
  onFacebookLogin?: () => Promise<{ token: string; user: any } | void>;
  onSuccess?: (userData: any) => void;
  navigation?: any;
  returnTo?: string;
  returnParams?: any;
}

const EMPTY_OTP = ['', '', '', '', '', ''];
const RESEND_TIMER = 60;

const LoginModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onGoogleLogin,
  onFacebookLogin,
  onSuccess,
  navigation,
  returnTo,
  returnParams,
}) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP);
  const [timer, setTimer] = useState(RESEND_TIMER);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [loading, setLoading] = useState(false);
  const [isSyncingCart, setIsSyncingCart] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isBrowserVisible, setIsBrowserVisible] = useState(false);
  const { data, error: myerr, isLoading } = useGetPagesQuery();
  const privacyPage = data?.find(p => p.slug === 'privacy-policy');
  const termsPage = data?.find(p => p.slug === 'terms-policy');
  const { translatedText: invalidInputText } = useAutoTranslate(
    'Please enter a valid email or 10-digit phone number',
  );
  const { translatedText: otpErrorText } = useAutoTranslate(
    'Invalid or expired OTP. Please try again.',
  );
  const { translatedText: phonePlaceholder } = useAutoTranslate(
    'Enter email or phone number',
  );
  const { translatedText: closeText } = useAutoTranslate('Close');

  const { showLoader, hideLoader } = CommonLoader();
  const { setUserData, setIsLoggedIn, setUserType } =
    useContext<UserData>(UserDataContext);
  const { syncCartAfterLogin } = useCart();

  const inputRefs = useRef<Array<TextInput | null>>([]);

  /* ================= RESET STATE WHEN MODAL OPENS ================= */
  useEffect(() => {
    if (visible) {
      resetModal();
    }
  }, [visible]);

  const resetModal = () => {
    setEmailOrPhone('');
    setOtp([...EMPTY_OTP]);
    setTimer(RESEND_TIMER);
    setError('');
    setStep('login');
    setLoading(false);
    setIsSyncingCart(false);
    inputRefs.current = [];
  };

  /* ================= HANDLE CLOSE ================= */
  const handleClose = useCallback(() => {
    if (isSyncingCart) {
      Alert.alert(
        'Syncing in Progress',
        'Cart sync is in progress. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Close',
            onPress: () => {
              resetModal();
              onClose();
            },
            style: 'destructive',
          },
        ],
      );
    } else {
      resetModal();
      onClose();
    }
  }, [isSyncingCart, onClose]);

  /* ================= BACK BUTTON ================= */
  const handleBackPress = useCallback(() => {
    if (step === 'otp') {
      resetOtpState();
      setStep('login');
      return true;
    }
    handleClose();
    return true;
  }, [step, handleClose]);

  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress,
      );
      return () => backHandler.remove();
    }
  }, [visible, handleBackPress]);

  /* ================= TIMER ================= */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  /* ================= HELPERS ================= */
  const validateEmailOrPhone = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    return emailRegex.test(emailOrPhone) || phoneRegex.test(emailOrPhone);
  };

  const resetOtpState = () => {
    setOtp([...EMPTY_OTP]);
    setTimer(RESEND_TIMER);
    inputRefs.current = [];
  };

  /* ================= OTP INPUT ================= */
  const handleChangeOtp = (text: string, index: number) => {
    if (!/^[0-9]?$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /* ================= REQUEST OTP ================= */
  const requestOTP = async () => {
    setError('');

    if (!emailOrPhone.trim() || !validateEmailOrPhone()) {
      setError(
        invalidInputText ||
        'Please enter a valid email or 10-digit phone number',
      );
      return;
    }

    try {
      setLoading(true);
      showLoader();
      const res = await UserService.requestOtp({
        email_or_phone: emailOrPhone.trim(),
      });
      hideLoader();

      if (res?.data?.success) {
        Toast.show({ type: 'success', text1: res?.data?.message });
        setStep('otp');
        resetOtpState();
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
      } else {
        setError(res?.data?.message || 'Unable to send OTP');
      }
    } catch (err: any) {
      hideLoader();
      setError(err?.response?.data?.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  /* ================= HANDLE POST-LOGIN NAVIGATION ================= */
  const handlePostLoginNavigation = () => {
    if (returnTo && navigation) {
      if (returnParams) {
        navigation.navigate(returnTo, returnParams);
      } else {
        navigation.navigate(returnTo);
      }
    } else {
      navigation?.replace('Home');
    }
  };

  /* ================= VERIFY OTP WITH CART SYNC ================= */
  const verifyOtp = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      showLoader();

      let fcmToken = FCMService.getFCMToken();
      if (!fcmToken) {
        try {
          await FCMService.init();
          fcmToken = FCMService.getFCMToken();
        } catch (fcmError) {
          console.log('⚠️ Could not get FCM token:', fcmError);
        }
      }

      const res = await UserService.verifyOtp({
        email_or_phone: emailOrPhone.trim(),
        otp: enteredOtp,
        fcm_token: fcmToken || '',
      });

      console.log(
        '📱 VERIFY OTP FULL RESPONSE:',
        JSON.stringify(res.data, null, 2),
      );
      hideLoader();

      if (!res || !res.data) {
        setError('No response from server');
        setLoading(false);
        return;
      }

      const responseData = res.data;

      if (responseData.success && responseData.user) {
        const { message, access_token, user, tiertype } = responseData;
        const userType = user?.type;

        try {
          // Clear any existing data first
          await LocalStorage.removeItem('@token');
          await LocalStorage.removeItem('@user');
          await LocalStorage.removeItem('@userType');
          await LocalStorage.removeItem('@tierType');
          await LocalStorage.removeItem('@login');

          // Save new data
          console.log(
            '📝 Saving token:',
            access_token ? 'received' : 'missing',
          );

          // Save each item individually
          await LocalStorage.save('@login', 'true');
          await LocalStorage.save('@user', JSON.stringify(user));
          await LocalStorage.save('@token', access_token || '');
          await LocalStorage.save('@userType', userType || '');
          await LocalStorage.save('@tierType', tiertype || '');

          // Verify token was saved
          const savedToken = await LocalStorage.read('@token');
          const savedUser = await LocalStorage.read('@user');
          console.log(
            '✅ Token saved successfully:',
            savedToken ? 'yes' : 'no',
          );
          console.log('✅ User saved successfully:', savedUser ? 'yes' : 'no');

          // Update context with boolean value (not string)
          setUserData(user);
          setIsLoggedIn(true); // This must be boolean, not string
          setUserType(userType);

          Toast.show({
            type: 'success',
            text1: message || 'Login successful!',
          });

          if (onSuccess) {
            onSuccess(user);
          }

          // Close modal first
          onClose();

          // Now sync cart after login
          setIsSyncingCart(true);

          Toast.show({
            type: 'info',
            text1: 'Syncing your cart...',
            text2: 'Please wait a moment',
          });

          try {
            const syncResult = await syncCartAfterLogin(access_token);

            if (syncResult.success) {
              Toast.show({
                type: 'success',
                text1: 'Cart synced!',
                text2: syncResult.message || 'Your items are ready',
              });
            } else {
              Toast.show({
                type: 'info',
                text1: 'Cart sync incomplete',
                text2: syncResult.message || 'Some items may need review',
              });
            }
          } catch (syncError) {
            console.log('Cart sync error:', syncError);
            // Toast.show({
            //   type: 'info',
            //   text1: 'Cart sync delayed',
            //   text2: 'Your items will sync shortly',
            // });
          } finally {
            setIsSyncingCart(false);
          }

          handlePostLoginNavigation();
        } catch (storageError: any) {
          console.error('❌ Storage error:', {
            message: storageError.message,
            error: storageError,
          });
          setError('Failed to save user data. Please try again.');
          setLoading(false);
        }
      } else {
        setError(
          responseData.message ||
          otpErrorText ||
          'Invalid or expired OTP. Please try again.',
        );
        setLoading(false);
      }
    } catch (err: any) {
      hideLoader();
      console.log('❌ Verify OTP Error:', err);

      if (err.response) {
        setError(err.response.data?.message || 'Server error occurred');
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('Request failed. Please try again.');
      }
      setLoading(false);
    }
  };

  /* ================= GOOGLE LOGIN HANDLER ================= */
  const handleGoogleLogin = async () => {
    if (onGoogleLogin) {
      try {
        setLoading(true);
        showLoader();

        const result = await onGoogleLogin();

        // If social login returns token and user data
        if (result && 'token' in result && 'user' in result) {
          const { token, user } = result;

          // Save user data
          await LocalStorage.removeItem('@token');
          await LocalStorage.removeItem('@user');
          await LocalStorage.save('@login', 'true');
          await LocalStorage.save('@user', JSON.stringify(user));
          await LocalStorage.save('@token', token);
          await LocalStorage.save('@userType', user?.type || '');
          await LocalStorage.save('@tierType', user?.tier?.type || '');

          setUserData(user);
          setIsLoggedIn(true);

          Toast.show({
            type: 'success',
            text1: 'Login successful!',
          });

          onClose();

          // Sync cart
          setIsSyncingCart(true);
          const syncResult = await syncCartAfterLogin(token);
          setIsSyncingCart(false);

          if (syncResult.success) {
            Toast.show({
              type: 'success',
              text1: 'Cart synced successfully!',
            });
          }

          handlePostLoginNavigation();
        }

        hideLoader();
      } catch (error) {
        hideLoader();
        console.log('Google login error:', error);
        Toast.show({
          type: 'error',
          text1: 'Google login failed',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  /* ================= FACEBOOK LOGIN HANDLER ================= */
  const handleFacebookLogin = async () => {
    if (onFacebookLogin) {
      try {
        setLoading(true);
        showLoader();

        const result = await onFacebookLogin();

        // If social login returns token and user data
        if (result && 'token' in result && 'user' in result) {
          const { token, user } = result;

          // Save user data
          await LocalStorage.removeItem('@token');
          await LocalStorage.removeItem('@user');
          await LocalStorage.save('@login', 'true');
          await LocalStorage.save('@user', JSON.stringify(user));
          await LocalStorage.save('@token', token);
          await LocalStorage.save('@userType', user?.type || '');
          await LocalStorage.save('@tierType', user?.tier?.type || '');

          setUserData(user);
          setIsLoggedIn(true);

          Toast.show({
            type: 'success',
            text1: 'Login successful!',
          });

          onClose();

          // Sync cart
          setIsSyncingCart(true);
          const syncResult = await syncCartAfterLogin(token);
          setIsSyncingCart(false);

          if (syncResult.success) {
            Toast.show({
              type: 'success',
              text1: 'Cart synced successfully!',
            });
          }

          handlePostLoginNavigation();
        }

        hideLoader();
      } catch (error) {
        hideLoader();
        console.log('Facebook login error:', error);
        Toast.show({
          type: 'error',
          text1: 'Facebook login failed',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  /* ================= OPEN PAGE BROWSER ================= */
  const openPageBrowser = (page: Page | undefined) => {
    if (page) {
      setSelectedPage(page);
      setIsBrowserVisible(true);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Page not found',
        text2: 'Please try again later',
      });
    }
  };

  const logo = require('../../src/assets/Png/splashlogo.png');

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleBackPress}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.modalContainer}>
                {/* Header with Logo and Close Button */}
                <View style={styles.header}>
                  <View style={styles.handleBar} />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Image source={logo} style={styles.logo} resizeMode="contain" />
                </View>

                {/* Cart Syncing Indicator */}
                {isSyncingCart && (
                  <View style={styles.syncIndicator}>
                    <ActivityIndicator size="small" color="#AEB254" />
                    <TransletText
                      text="Syncing your cart..."
                      style={styles.syncText}
                    />
                  </View>
                )}

                {step === 'login' ? (
                  <>
                    <View style={styles.welcomeSection}>
                      <TransletText text="Welcome Back!" style={styles.title} />
                      <TransletText
                        text="Sign in to continue your tea journey"
                        style={styles.subtitle}
                      />
                    </View>

                    <View style={styles.form}>
                      <View style={styles.inputGroup}>
                        <TransletText
                          text="Email or Phone"
                          style={styles.label}
                        />
                        <View
                          style={[
                            styles.inputWrapper,
                            error && styles.inputError,
                          ]}
                        >
                          <TextInput
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            placeholder={
                              phonePlaceholder || 'Enter email or phone'
                            }
                            placeholderTextColor="#999"
                            editable={!loading && !isSyncingCart}
                          />
                        </View>
                      </View>

                      {!!error && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{error}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.loginButton,
                          (loading || isSyncingCart) && styles.buttonDisabled,
                        ]}
                        onPress={requestOTP}
                        disabled={loading || isSyncingCart}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <TransletText
                            text="Continue"
                            style={styles.loginText}
                          />
                        )}
                      </TouchableOpacity>

                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <TransletText text="Or" style={styles.orText} />
                        <View style={styles.dividerLine} />
                      </View>

                      <View style={styles.socialRow}>
                        <TouchableOpacity
                          style={styles.socialButton}
                          onPress={handleGoogleLogin}
                          disabled={loading || isSyncingCart}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={require('../assets/Png/google.png')}
                            style={styles.socialIcon}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.socialButton}
                          onPress={handleFacebookLogin}
                          disabled={loading || isSyncingCart}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={require('../assets/Png/facebook.png')}
                            style={styles.socialIcon}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.termsContainer}>
                        <TransletText
                          text="By continuing, you agree to our"
                          style={styles.termsText}
                        />
                        <View style={styles.termsLinks}>
                          <TouchableOpacity onPress={() => openPageBrowser(termsPage)}>
                            <Text style={styles.termsLink}>Terms of Service</Text>
                          </TouchableOpacity>
                          <Text style={styles.termsSeparator}> and </Text>
                          <TouchableOpacity onPress={() => openPageBrowser(privacyPage)}>
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.otpHeader}>
                      <TransletText text="Enter Code" style={styles.title} />
                      <View style={styles.otpMessage}>
                        <TransletText
                          text="We've sent a 6-digit code to"
                          style={styles.subtitle}
                        />
                        <Text style={styles.otpDestination}>{emailOrPhone}</Text>
                      </View>
                    </View>

                    <View style={styles.otpRow}>
                      {otp.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={ref => (inputRefs.current[index] = ref)}
                          style={[styles.otpInput, error && styles.otpInputError]}
                          keyboardType="number-pad"
                          maxLength={1}
                          value={digit}
                          onChangeText={text => handleChangeOtp(text, index)}
                          editable={!loading && !isSyncingCart}
                          selectTextOnFocus
                        />
                      ))}
                    </View>

                    {!!error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.changeEmailButton}
                      onPress={() => {
                        resetOtpState();
                        setStep('login');
                      }}
                      disabled={loading || isSyncingCart}
                      activeOpacity={0.7}
                    >
                      <TransletText
                        text="Change email/phone"
                        style={styles.changeEmailText}
                      />
                    </TouchableOpacity>

                    <View style={styles.resendContainer}>
                      <TransletText
                        text="Didn't receive code?"
                        style={styles.resendText}
                      />
                      {timer > 0 ? (
                        <TransletText
                          text={`Resend in ${timer}s`}
                          style={styles.disabled}
                        />
                      ) : (
                        <TouchableOpacity
                          onPress={requestOTP}
                          disabled={loading || isSyncingCart}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.resendLink}>Resend</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.loginButton,
                        (loading || isSyncingCart) && styles.buttonDisabled,
                      ]}
                      onPress={verifyOtp}
                      disabled={loading || isSyncingCart}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <TransletText text="Verify" style={styles.loginText} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.termsContainer}>
                      <TransletText
                        text="By verifying, you agree to our"
                        style={styles.termsText}
                      />
                      <View style={styles.termsLinks}>
                        <TouchableOpacity onPress={() => openPageBrowser(termsPage)}>
                          <Text style={styles.termsLink}>Terms of Service</Text>
                        </TouchableOpacity>
                        <Text style={styles.termsSeparator}> and </Text>
                        <TouchableOpacity onPress={() => openPageBrowser(privacyPage)}>
                          <Text style={styles.termsLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AppBrowser Modal for Terms and Privacy Policy */}
      {selectedPage && (
        <AppBrowser
          visible={isBrowserVisible}
          onClose={() => {
            setIsBrowserVisible(false);
            setSelectedPage(null);
          }}
          title={selectedPage.title}
          content={selectedPage.content}
          image={selectedPage.image}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4D7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: 'center',
  },
  syncText: {
    fontSize: 13,
    color: '#5F621A',
    marginLeft: 8,
    fontWeight: '500',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  input: {
    fontSize: 15,
    color: '#000',
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#DDE35A',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 14,
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: '#f2f2f2',
    padding: 14,
    borderRadius: 45,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  socialIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '400',
    textAlign: 'center',
  },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  termsLink: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsSeparator: {
    fontSize: 11,
    color: '#999',
    fontWeight: '400',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  otpMessage: {
    alignItems: 'center',
    marginTop: 6,
  },
  otpDestination: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 48,
    height: 58,
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  otpInputError: {
    borderColor: '#ff4444',
  },
  changeEmailButton: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  changeEmailText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  resendText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  disabled: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default LoginModal;