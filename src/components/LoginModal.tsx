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
} from 'react-native';
import { CommonLoader } from './CommonLoader/commonLoader';
import { UserService } from '../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { UserData, UserDataContext } from '../context/userDataContext';
import { useCart } from '../context/CartContext';
import { Colors } from '../constant';
import { heightPercentageToDP } from '../constant/dimentions';
import { LocalStorage } from '../helpers/localstorage';
import TransletText from '../components/TransletText';
import { useAutoTranslate } from '../hooks/useAutoTranslate';
import FCMService from '../service/FCMService';
interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;
  onSuccess?: (userData: any) => void; // Add this prop
}

const EMPTY_OTP = ['', '', '', '', '', ''];
const RESEND_TIMER = 60;

const LoginModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onGoogleLogin,
  onFacebookLogin,
  onSuccess, // Add this
}) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP);
  const [timer, setTimer] = useState(RESEND_TIMER);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [loading, setLoading] = useState(false);
  const { translatedText: invalidInputText } = useAutoTranslate(
    'Please enter a valid email or 10-digit phone number',
  );
  const { translatedText: otpErrorText } = useAutoTranslate(
    'Invalid or expired OTP. Please try again.',
  );
  const { translatedText: phonePlaceholder } = useAutoTranslate(
    'Enter email or phone number',
  );

  const { showLoader, hideLoader } = CommonLoader();
  const { setUserData, setIsLoggedIn, setUserType } =
    useContext<UserData>(UserDataContext);
  const { syncCartAfterLogin } = useCart();

  const inputRefs = useRef<Array<TextInput | null>>([]);

  /* ================= RESET STATE WHEN MODAL OPENS ================= */
  useEffect(() => {
    if (visible) {
      setEmailOrPhone('');
      setOtp([...EMPTY_OTP]);
      setTimer(RESEND_TIMER);
      setError('');
      setStep('login');
      setLoading(false);
      inputRefs.current = [];
    }
  }, [visible]);

  /* ================= BACK BUTTON ================= */
  const handleBackPress = useCallback(() => {
    if (step === 'otp') {
      resetOtpState();
      setStep('login');
      return true;
    }
    onClose();
    return true;
  }, [step, onClose]);

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

  /* ================= VERIFY OTP - UPDATED ================= */
  /* ================= VERIFY OTP - DEBUGGED VERSION ================= */
  const verifyOtp = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      showLoader();

      // Get FCM token
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

      console.log('Full API Response:', JSON.stringify(res, null, 2));

      hideLoader();

      // Check response structure - simplified
      if (!res || !res.data) {
        setError('No response from server');
        return;
      }

      const responseData = res.data;

      if (responseData.success && responseData.user) {
        const { success, message, access_token, user, tiertype } = responseData;

        const userType = user?.type;

        try {
          // STRINGIFY ALL OBJECTS BEFORE SAVING TO LOCALSTORAGE
          await LocalStorage.save('@login', 'true');
          await LocalStorage.save('@user', JSON.stringify(user)); // Stringify the object
          await LocalStorage.save('@token', access_token || '');
          await LocalStorage.save('@userType', userType || '');
          await LocalStorage.save('@tierType', tiertype || '');

          console.log('✅ Data saved successfully');

          // Update context
          setUserData(user);
          setIsLoggedIn('true');
          setUserType(userType);

          // Sync cart if needed
          if (syncCartAfterLogin) {
            syncCartAfterLogin();
          }

          Toast.show({
            type: 'success',
            text1: message || 'Login successful!',
          });

          if (onSuccess) {
            onSuccess(user);
          }

          onClose();
        } catch (storageError: any) {
          console.error('❌ Storage error:', {
            message: storageError.message,
            error: storageError,
          });
          setError('Failed to save user data. Please try again.');
        }
      } else {
        setError(
          responseData.message ||
          otpErrorText ||
          'Invalid or expired OTP. Please try again.',
        );
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
    } finally {
      setLoading(false);
    }
  };
  const logo = require('../../src/assets/Png/splashlogo.png');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

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
              {/* Header with Logo */}
              <View style={styles.header}>
                <View style={styles.handleBar} />
                <Image source={logo} style={styles.logo} resizeMode="contain" />
                {/* <TransletText
                  text="White Peony"
                  style={styles.brandName}
                />
                <TransletText
                  text="Premium Tea Collection"
                  style={styles.brandTagline}
                /> */}
              </View>

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
                          placeholder="Enter email or phone"
                          placeholderTextColor="#999"
                          editable={!loading}
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
                        loading && styles.buttonDisabled,
                      ]}
                      onPress={requestOTP}
                      disabled={loading}
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
                        onPress={onGoogleLogin}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('../assets/Png/google.png')}
                          style={styles.socialIcon}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.socialButton}
                        onPress={onFacebookLogin}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('../assets/Png/facebook.png')}
                          style={styles.socialIcon}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Terms and Privacy Policy */}
                    <View style={styles.termsContainer}>
                      <TransletText
                        text="By continuing, you agree to our"
                        style={styles.termsText}
                      />
                      <View style={styles.termsLinks}>
                        <Text style={styles.termsLink}>Terms of Service</Text>
                        <Text style={styles.termsSeparator}> and </Text>
                        <Text style={styles.termsLink}>Privacy Policy</Text>
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
                        editable={!loading}
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
                    disabled={loading}
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
                        activeOpacity={0.7}
                      >
                        <Text style={styles.resendLink}>Resend</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={verifyOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <TransletText text="Verify" style={styles.loginText} />
                    )}
                  </TouchableOpacity>

                  {/* Terms and Privacy Policy for OTP screen */}
                  <View style={styles.termsContainer}>
                    <TransletText
                      text="By verifying, you agree to our"
                      style={styles.termsText}
                    />
                    <View style={styles.termsLinks}>
                      <Text style={styles.termsLink}>Terms of Service</Text>
                      <Text style={styles.termsSeparator}> and </Text>
                      <Text style={styles.termsLink}>Privacy Policy</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default LoginModal;

/* ================= STYLES ================= */
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
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 16,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.3,
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
  bold: {
    fontWeight: '600',
    color: '#000',
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
