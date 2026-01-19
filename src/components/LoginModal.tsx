import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  BackHandler,
  Platform,
  Pressable,
} from "react-native";
import { CommonLoader } from "./CommonLoader/commonLoader";
import { UserService } from "../service/ApiService";
import { HttpStatusCode } from "axios";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { LocalStorage } from "../helpers/localstorage";
import { UserData, UserDataContext } from "../context/userDataContext";
import { useCart } from '../context/CartContext';
import { Colors } from "../constant";
import { heightPercentageToDP } from "../constant/dimentions";


interface AuthModalProps {
  visible: boolean;
  onClose: () => void;

  // login
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;

  // otp
  phoneNumber?: string;
  onVerify?: (otp: string) => void;

}

const LoginModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onGoogleLogin,
  onFacebookLogin,
}) => {
  const navigation = useNavigation();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const { showLoader, hideLoader } = CommonLoader();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const [step, setStep] = useState<"login" | "otp">("login");
  const { setUserData, setIsLoggedIn } = useContext<UserData>(UserDataContext);
  const { syncCartAfterLogin } = useCart();


  // Add useCallback to handle back action
  const handleBackPress = useCallback(() => {
    if (step === "otp") {
      setStep("login");
      return true; // Prevent modal from closing
    }
    onClose(); // Close modal if on login step
    return true;
  }, [step, onClose]);

  // Add effect to handle hardware back press
  useEffect(() => {
    // Only add listener when modal is visible
    if (visible) {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );

      // Cleanup function
      return () => {
        backHandler.remove(); // Correct way to remove listener
      };
    }
  }, [visible, handleBackPress]);

  const validateEmailOrPhone = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (emailRegex.test(emailOrPhone)) return { valid: true, type: 'email' };
    if (phoneRegex.test(emailOrPhone)) return { valid: true, type: 'phone' };
    return { valid: false };
  };


  useEffect(() => {
    if (visible && step === "otp") {
      setOtp(["", "", "", "", "", ""]);
      setTimer(60);
    }
  }, [visible, step]);

  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(countdown);
    }
  }, [step, timer]);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleChangeOtp = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };



  const requestOTP = async () => {
    const result = validateEmailOrPhone(emailOrPhone.trim());
    if (!result.valid) {
      setError('Please enter a valid email or 10-digit phone number');
      return;
    }
    try {
      const payload = {
        email_or_phone: emailOrPhone,
      };
      showLoader();
      await UserService.requestotp(payload)
        .then(async res => {
          hideLoader();
          if (res && res?.data && res?.status === HttpStatusCode.Ok) {
            Toast.show({
              type: 'success',
              text1: res?.data?.message,
            });
            console.log('Login successful:', res.data);
            setStep("otp");
            // Alert.alert('White Peony', JSON.stringify(res.data.otp));
          } else {
            Toast.show({
              type: 'error',
              text1: 'Something went wrong!',
            });
          }
        })
        .catch(err => {
          hideLoader();
          console.log('Error in mobileotp:', JSON.stringify(err));
          Toast.show({
            type: 'error',
            text1: err.response?.data?.message,
          });
        });
    } catch (error) {
      hideLoader();
      Toast.show({
        type: 'error',
        text1: 'Something went wrong! Please try again.',
      });
    }
  };

  const verifyOTP = async () => {
    if (otp.some(digit => digit === "")) {
      setError('Please enter the complete OTP');
      return;
    }
    try {
      const payload = {
        email_or_phone: emailOrPhone,
        otp: otp.join(""),
      };
      showLoader();
      await UserService.verifyotp(payload)
        .then(async res => {
          hideLoader();
          if (res && res?.data && res?.status === HttpStatusCode.Ok) {
            Toast.show({
              type: 'success',
              text1: res?.data?.message,
            });
            console.log("otp verified sucess", res.data)
            Toast.show({ type: 'success', text1: res?.data?.message });
            await LocalStorage.save('@user', res.data?.user);
            await LocalStorage.save('@token', res.data?.access_token);
            setUserData(res.data?.user);
            setStep("login");
            HomeTab();
            // Add try-catch specifically for syncCartAfterLogin
            try {
              await syncCartAfterLogin(res.data?.user?.id || '');
            } catch (syncError: any) {
              console.log('Error syncing cart:', syncError);
              // Optional: Show toast for sync error but don't block login flow
              Toast.show({
                type: 'info',
                text1: 'Cart sync failed, please try refreshing',
              });
            }

            onClose();
            navigation.navigate("BottomTabScreen" as never);
          } else {
            Toast.show({
              type: 'error',
              text1: 'Something went wrong!',
            });
          }
        })
        .catch(err => {
          hideLoader();
          console.log('Error in verify:', err);
          Toast.show({
            type: 'error',
            text1: err.response?.data?.message,
          });
        });
    } catch (error) {
      hideLoader();
      Toast.show({
        type: 'error',
        text1: 'Something went wrong! Please try again.',
      });
    }
  };

  const HomeTab = async () => {
    await LocalStorage.save('@login', JSON.stringify(true));
    setIsLoggedIn(true);
  }


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleBackPress}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.flexFill} onPress={onClose} />
        <View style={styles.modalContainer}>
          {/* Header */}
          <Text style={styles.title}>Log in to white Peony! 👋</Text>
          {step === "login" && (
            <Text style={styles.subtitle}>Hello again, you’ve been missed!</Text>
          )}
          {step === "otp" && (
            <Text style={styles.subtitle}>
              Enter the OTP sent to <Text style={styles.bold}>{emailOrPhone}</Text>
            </Text>
          )}

          {/* LOGIN VIEW */}
          {step === "login" && (
            <>
              <Text style={styles.label}>Email/Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="+420 605 476 490"
                  placeholderTextColor={Colors.text[200]}
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  keyboardType='name-phone-pad'
                />
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => requestOTP()}
              >
                <Text style={styles.loginText}>Login</Text>
              </TouchableOpacity>

              {error ? <Text style={{ color: 'red', marginTop: 5 }}>{error}</Text> : null}


              <Text style={styles.orText}>Or</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialButton} onPress={onGoogleLogin}>
                  <Image source={require('../assets/Png/google.png')} style={{ width: 24, height: 24 }} />
                  {/* <Ionicons name="logo-google" size={24} color="red" /> */}
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} onPress={onFacebookLogin}>
                  <Image source={require('../assets/Png/facebook.png')} style={{ width: 24, height: 24 }} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* OTP VIEW */}
          {step === "otp" && (
            <>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    placeholderTextColor={Colors.text[200]}
                    onChangeText={(text) => handleChangeOtp(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    autoFocus={index === 0}
                    returnKeyLabel="Done"
                    returnKeyType="done"
                  />
                ))}
              </View>
              {error ? <Text style={{ color: 'red', marginTop: -10, bottom: 10 }}>{error}</Text> : null}

              <Text style={styles.resendText}>
                Didn’t receive the code?{" "}
                {timer > 0 ? (
                  <Text style={styles.disabled}>Resend in {timer}s</Text>
                ) : (
                  <Text
                    style={styles.resendLink}
                    onPress={() => {
                      setTimer(60);
                      requestOTP()
                    }}
                  >
                    Resend
                  </Text>
                )}
              </Text>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => verifyOTP()}
              >
                <Text style={styles.loginText}>Login</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </Modal>
  )
};

export default LoginModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  flexFill: { flex: 1 },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderRadius: 27, padding: 16, maxHeight: '90%', width: '95%', alignSelf: 'center', bottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: '500',
    marginVertical: 10,
  },
  bold: { fontWeight: "600", color: "#000" },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6, marginTop: heightPercentageToDP(1) },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  input: { fontSize: 16, color: "#000", paddingVertical: 10 },
  loginButton: {
    backgroundColor: "#DDE35A",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 15,
  },
  loginText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  orText: { textAlign: "center", color: "#666", marginBottom: 10 },
  socialRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  socialButton: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 50,
    marginHorizontal: 10,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    width: 45,
    height: 50,
    textAlign: "center",
    fontSize: 18,
    color: "#000",
  },
  resendText: { textAlign: "center", color: "#666", marginBottom: 15 },
  disabled: { color: "#aaa" },
  resendLink: { color: "#007AFF", fontWeight: "600" },
  createAccount: { marginTop: 10, alignItems: "center" },
  createText: { fontSize: 14, color: "#666" },
  link: { color: "#007AFF", fontWeight: "600" },

});

