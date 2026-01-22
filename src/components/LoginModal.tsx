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
      setError('Please enter a valid email or 10-digit phone number');
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
  const verifyOtp = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      showLoader();
      const res = await UserService.verifyOtp({
        email_or_phone: emailOrPhone.trim(),
        otp: enteredOtp,
      });
      hideLoader();

      if (res?.data?.success && res?.data?.user) {
        const user = res.data.user;
        const token = res.data.access_token;
        const userType = user?.type; // Get user type from response

        // Store all user data
        await LocalStorage.save('@login', 'true');
        await LocalStorage.save('@user', user);
        await LocalStorage.save('@token', token);
        await LocalStorage.save('@userType', userType); // Store user type

        // Update context
        setUserData(user);
        setIsLoggedIn('true');
        setUserType(userType); // Set user type in context

        syncCartAfterLogin?.();

        Toast.show({ type: 'success', text1: res.data.message });

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(user);
        }

        onClose();
      } else {
        setError(
          res?.data?.message || 'Invalid or expired OTP. Please try again.',
        );
      }
    } catch (err: any) {
      hideLoader();
      setError(
        err?.response?.data?.message ||
          'Invalid or expired OTP. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <Modal style={{}} visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={styles.flexFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.modalContainer}>
              <Text style={styles.title}>Log in to White Peony! 👋</Text>

              {step === 'login' ? (
                <Text style={styles.subtitle}>
                  Hello again, you’ve been missed!
                </Text>
              ) : (
                <Text style={styles.subtitle}>
                  Enter the OTP sent to{' '}
                  <Text style={styles.bold}>{emailOrPhone}</Text>
                </Text>
              )}

              {step === 'login' && (
                <>
                  <Text style={styles.label}>Email/Phone Number *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                      value={emailOrPhone}
                      onChangeText={setEmailOrPhone}
                      placeholder="+420 605 476 490"
                      placeholderTextColor={Colors.text[200]}
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, loading && { opacity: 0.7 }]}
                    onPress={requestOTP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.loginText}>Login</Text>
                    )}
                  </TouchableOpacity>

                  {!!error && <Text style={{ color: 'red' }}>{error}</Text>}

                  <Text style={styles.orText}>Or</Text>
                  <View style={styles.socialRow}>
                    <TouchableOpacity
                      style={styles.socialButton}
                      onPress={onGoogleLogin}
                      disabled={loading}
                    >
                      <Image
                        source={require('../assets/Png/google.png')}
                        style={{ width: 24, height: 24 }}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.socialButton}
                      onPress={onFacebookLogin}
                      disabled={loading}
                    >
                      <Image
                        source={require('../assets/Png/facebook.png')}
                        style={{ width: 24, height: 24 }}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 'otp' && (
                <>
                  <View style={styles.otpRow}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={ref => (inputRefs.current[index] = ref)}
                        style={styles.otpInput}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={text => handleChangeOtp(text, index)}
                        editable={!loading}
                      />
                    ))}
                  </View>

                  {!!error && (
                    <Text style={{ color: 'red', marginBottom: 10 }}>
                      {error}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.changeEmailButton}
                    onPress={() => {
                      resetOtpState();
                      setStep('login');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.changeEmailText}>
                      Change Email/Phone
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.resendText}>
                    Didn’t receive the code?{' '}
                    {timer > 0 ? (
                      <Text style={styles.disabled}>Resend in {timer}s</Text>
                    ) : (
                      <Text style={styles.resendLink} onPress={requestOTP}>
                        Resend
                      </Text>
                    )}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      loading && { opacity: 0.7 },
                      { marginBottom: 30 },
                    ]}
                    onPress={verifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.loginText}>Verify</Text>
                    )}
                  </TouchableOpacity>
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
  flexFill: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginVertical: 10,
  },
  bold: { fontWeight: '600', color: '#000' },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: heightPercentageToDP(1),
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  input: { fontSize: 16, color: '#000', paddingVertical: 10 },
  loginButton: {
    backgroundColor: '#DDE35A',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 15,
  },
  loginText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  orText: { textAlign: 'center', color: '#666', marginBottom: 10 },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 50,
    marginHorizontal: 10,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    width: 45,
    height: 50,
    textAlign: 'center',
    fontSize: 18,
    color: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 27,
    padding: 16,
    maxHeight: '90%',
    width: '100%',
    alignSelf: 'center',
  },
  resendText: { textAlign: 'center', color: '#666', marginBottom: 15 },
  disabled: { color: '#aaa' },
  resendLink: { color: '#007AFF', fontWeight: '600' },
  changeEmailButton: { marginBottom: 10, alignSelf: 'center' },
  changeEmailText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
