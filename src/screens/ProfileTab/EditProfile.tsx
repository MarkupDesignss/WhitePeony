import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import LinearGradient from 'react-native-linear-gradient';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { LocalStorage } from '../../helpers/localstorage';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { widthPercentageToDP } from '../../constant/dimentions';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProfileFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  error?: string;
  keyboardType?: string;
  multiline?: boolean;
  editable?: boolean;
}

// Memoized ProfileField component to prevent unnecessary re-renders
const ProfileField: React.FC<ProfileFieldProps> = React.memo(
  ({
    label,
    required,
    value,
    onChangeText,
    onBlur,
    error,
    keyboardType,
    multiline,
    editable = true,
  }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.labelContainer}>
        <TransletText text={label} style={styles.fieldLabel} />
        {required && <Text style={styles.requiredStar}> *</Text>}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          placeholderTextColor={Colors.text[200]}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType as any}
          multiline={multiline}
          returnKeyType={multiline ? 'default' : 'done'}
          blurOnSubmit={!multiline}
          editable={editable}
        />
        {!multiline && (
          <Image
            source={require('../../assets/Png/clock.png')}
            style={styles.clockIcon}
          />
        )}
      </View>
      {error && <TransletText text={error} style={styles.errorText} />}
    </View>
  ),
);

const EditProfile = ({ navigation, route }) => {
  const { userData, setUserData } = useContext<UserData>(UserDataContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await UserService.profile();
        const GetProfile = res?.data?.user || {};
        setUserData(GetProfile);
      } catch (e) {
        const error = e as any;
        if (error.status === 401) {
          console.log('Unauthorized access - perhaps token expired');
        } else {
          Toast.show({ type: 'error', text1: 'Failed to load profile' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        // Scroll to top when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false),
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Memoized validation schema
  const profileSchema = useMemo(() => {
    const isB2B = userData?.type === 'b2b';

    const base = {
      fullName: Yup.string().required('Full Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      phone: Yup.string().required('Contact Number is required'),
    };

    if (isB2B) {
      return Yup.object().shape({
        ...base,
        address: Yup.string().required('Full Address is required'),
        zip: Yup.string().required('Zip Code is required'),
        businessName: Yup.string().required('Business Name is required'),
        vatId: Yup.string().required('VAT ID is required'),
        status: Yup.string().required('Status is required'),
      });
    }

    return Yup.object().shape({
      ...base,
    });
  }, [userData?.type]);

  // Memoized initial values
  const initialValues = useMemo(
    () => ({
      fullName: userData?.name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      address: userData?.address?.full_address || '',
      zip: userData?.address?.postal_code || '',
      businessName: userData?.business_name || '',
      vatId: userData?.vat_id || '',
      status: userData?.status || 'active',
    }),
    [userData],
  );

  // Memoized image picker function
  const pickImageFromCameraOrGallery = useCallback(async () => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const permissionsToRequest = [];

        const cameraStatus = await check(PERMISSIONS.ANDROID.CAMERA);
        if (cameraStatus !== RESULTS.GRANTED) {
          permissionsToRequest.push(PERMISSIONS.ANDROID.CAMERA);
        }

        const readStatus = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        const fallbackReadStatus = await check(
          PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        );

        if (
          readStatus !== RESULTS.GRANTED &&
          fallbackReadStatus !== RESULTS.GRANTED
        ) {
          permissionsToRequest.push(
            Platform.Version >= 33
              ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
              : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
          );
        }

        const responses = await Promise.all(
          permissionsToRequest.map(perm => request(perm)),
        );

        return responses.every(result => result === RESULTS.GRANTED);
      }

      // For iOS
      if (Platform.OS === 'ios') {
        const cameraStatus = await check(PERMISSIONS.IOS.CAMERA);
        const photoLibraryStatus = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);

        if (cameraStatus !== RESULTS.GRANTED) {
          await request(PERMISSIONS.IOS.CAMERA);
        }
        if (photoLibraryStatus !== RESULTS.GRANTED) {
          await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
        }

        const finalCameraStatus = await check(PERMISSIONS.IOS.CAMERA);
        const finalPhotoLibraryStatus = await check(
          PERMISSIONS.IOS.PHOTO_LIBRARY,
        );

        return (
          finalCameraStatus === RESULTS.GRANTED &&
          finalPhotoLibraryStatus === RESULTS.GRANTED
        );
      }

      return true;
    };

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permissions Required',
        'Please enable camera and photo library permissions',
      );
      return;
    }

    return new Promise(resolve => {
      Alert.alert(
        'Select Image',
        'Choose source',
        [
          {
            text: 'Camera',
            onPress: () => {
              launchCamera(
                {
                  mediaType: 'photo',
                  quality: 0.8,
                  maxWidth: 800,
                  maxHeight: 800,
                },
                response => {
                  if (response.didCancel || response.errorCode)
                    return resolve(null);
                  const asset = response.assets?.[0];
                  if (asset?.uri) {
                    setProfileImage(asset.uri);
                    resolve(asset);
                  }
                },
              );
            },
          },
          {
            text: 'Gallery',
            onPress: () => {
              launchImageLibrary(
                {
                  mediaType: 'photo',
                  quality: 0.8,
                  maxWidth: 800,
                  maxHeight: 800,
                },
                response => {
                  if (response.didCancel || response.errorCode)
                    return resolve(null);
                  const asset = response.assets?.[0];
                  if (asset?.uri) {
                    setProfileImage(asset.uri);
                    resolve(asset);
                  }
                },
              );
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { cancelable: true },
      );
    });
  }, []);

  // Memoized update profile function
  const updateProfile = useCallback(
    async (values: any) => {
      try {
        setIsUpdating(true);
        const payload = {
          name: values.fullName,
          phone: values.phone,
          business_name: values.businessName,
          vat_id: values.vatId,
          status: values.status,
          address: values.address,
          zip_code: values.zip,
          email: values.email,
        };

        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });

        if (profileImage && !profileImage.startsWith('http')) {
          formData.append('profile_image', {
            uri: profileImage,
            type: 'image/jpeg',
            name: 'profile.jpg',
          } as any);
        }

        const res = await UserService.UpdateProfile(formData);

        if (res && res?.data && res?.status === HttpStatusCode.Ok) {
          Toast.show({
            type: 'success',
            text1: res?.data?.message || 'Profile updated successfully',
          });

          await LocalStorage.save('@user', res.data?.user);
          setUserData(res.data?.user);
          navigation.goBack();
        } else {
          Toast.show({
            type: 'error',
            text1: res?.data?.message || 'Something went wrong!',
          });
        }
      } catch (error: any) {
        console.log('Error in update profile:', error);
        Toast.show({
          type: 'error',
          text1:
            error.response?.data?.message ||
            'Something went wrong! Please try again.',
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [profileImage, navigation, setUserData],
  );

  // Get image source
  const imageSource = useMemo(() => {
    if (userData?.profile_image) {
      return { uri: Image_url + userData.profile_image };
    }
    if (profileImage) {
      return { uri: profileImage };
    }
    return require('../../assets/Png/person.png');
  }, [userData?.profile_image, profileImage]);

  // Dismiss keyboard handler
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Show loading overlay
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.button[100]} />
        <TransletText text="Loading profile..." style={styles.loadingText} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 20}
        >
          {/* Fixed Header - Won't scroll */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isUpdating}
            >
              <Image
                source={require('../../assets/Png/back.png')}
                style={styles.backIcon}
              />
            </TouchableOpacity>
            <TransletText text="My Profile" style={styles.headerTitle} />
            <TouchableOpacity
              onPress={() => navigation.navigate('BottomTabScreen')}
              disabled={isUpdating}
            >
              <TransletText text="Skip" style={styles.skipText} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Area */}
          <LinearGradient
            colors={['#F3F3F3', '#FFFFFF']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.container,
                isKeyboardVisible && styles.containerKeyboardActive,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              scrollEventThrottle={16}
            >
              {/* Avatar Section */}
              <View style={styles.avatarContainer}>
                <Image source={imageSource} style={styles.avatar} />
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={pickImageFromCameraOrGallery}
                  disabled={isUpdating}
                >
                  <Image
                    source={require('../../assets/Png/camera.png')}
                    style={styles.cameraIcon}
                  />
                </TouchableOpacity>
              </View>

              {/* Form Section */}
              <Formik
                initialValues={initialValues}
                validationSchema={profileSchema}
                onSubmit={updateProfile}
                enableReinitialize
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                }) => (
                  <>
                    <ProfileField
                      label="Full Name"
                      required
                      value={values.fullName}
                      onChangeText={handleChange('fullName')}
                      onBlur={handleBlur('fullName')}
                      error={touched.fullName && errors.fullName}
                      editable={!isUpdating}
                    />

                    <ProfileField
                      label="Email ID"
                      required
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      error={touched.email && errors.email}
                      keyboardType="email-address"
                      editable={!isUpdating}
                    />

                    <ProfileField
                      label="Contact Number"
                      required
                      value={values.phone}
                      onChangeText={handleChange('phone')}
                      onBlur={handleBlur('phone')}
                      error={touched.phone && errors.phone}
                      keyboardType="phone-pad"
                      editable={!isUpdating}
                    />

                    {userData?.type !== 'b2c' && (
                      <>
                        <ProfileField
                          label="Full Address"
                          required
                          value={values.address}
                          onChangeText={handleChange('address')}
                          onBlur={handleBlur('address')}
                          error={touched.address && errors.address}
                          multiline
                          editable={!isUpdating}
                        />

                        <ProfileField
                          label="Zip Code"
                          required
                          value={values.zip}
                          onChangeText={handleChange('zip')}
                          onBlur={handleBlur('zip')}
                          error={touched.zip && errors.zip}
                          keyboardType="number-pad"
                          editable={!isUpdating}
                        />

                        <ProfileField
                          label="Business Name"
                          required
                          value={values.businessName}
                          onChangeText={handleChange('businessName')}
                          onBlur={handleBlur('businessName')}
                          error={touched.businessName && errors.businessName}
                          editable={!isUpdating}
                        />

                        <ProfileField
                          label="VAT ID"
                          required
                          value={values.vatId}
                          onChangeText={handleChange('vatId')}
                          onBlur={handleBlur('vatId')}
                          error={touched.vatId && errors.vatId}
                          editable={!isUpdating}
                        />
                      </>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        isUpdating && styles.saveButtonDisabled,
                      ]}
                      onPress={handleSubmit}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator color="#222" size="small" />
                      ) : (
                        <TransletText
                          text="Save Changes"
                          style={styles.saveButtonText}
                        />
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </Formik>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text[200],
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 80, // Space for fixed header
  },
  containerKeyboardActive: {
    paddingBottom: 100,
  },
  // Fixed Header Styles
  header: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    color: '#999',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '40%', // Adjusted for better positioning
    backgroundColor: '#f8fbe5',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.button[100],
  },
  cameraIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  fieldContainer: {
    marginBottom: 20,
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
  },
  requiredStar: {
    color: 'red',
    fontSize: 14,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 12,
    backgroundColor: 'transparent',
    minHeight: 45,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  clockIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: Colors.button[100],
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.button[100] + '80', // 50% opacity
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
  },
});

export default React.memo(EditProfile);
