import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, Platform, StatusBar } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import LinearGradient from 'react-native-linear-gradient';
import DropDownPicker from 'react-native-dropdown-picker';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { LocalStorage } from '../../helpers/localstorage';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { widthPercentageToDP } from '../../constant/dimentions';
import { Colors } from '../../constant';



const EditProfile = ({ navigation, route }) => {
  const { userData, setUserData } = useContext<UserData>(UserDataContext);
  const { showLoader, hideLoader } = CommonLoader();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {

    const Profile = async () => {
      try {
        showLoader();
        const res = await UserService.profile();
        const GetProfile = res?.data?.user || {};

        setUserData(GetProfile)
        console.log(GetProfile)
      } catch (e) {
        hideLoader();
        const error = e as any;
        if (error.status === 401) {
          console.log('Unauthorized access - perhaps token expired');
        }
        else {
          Toast.show({ type: 'error', text1: 'Failed to load profile' });
        }
      } finally {
        hideLoader();
      }
    };

    Profile();
  }, [])

  const profileSchema = React.useMemo(() => {
    const isB2B = userData?.type === 'b2b';

    // common required fields for all users
    const base = {
      fullName: Yup.string().required('Full Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      phone: Yup.string().required('Contact Number is required'),
    };

    if (isB2B) {
      // B2B: all fields mandatory
      return Yup.object().shape({
        ...base,
        address: Yup.string().required('Full Address is required'),
        zip: Yup.string().required('Zip Code is required'),
        businessName: Yup.string().required('Business Name is required'),
        vatId: Yup.string().required('VAT ID is required'),
        status: Yup.string().required('Status is required'),
      });
    }

    // B2C (or other): only limited fields required, others optional
    return Yup.object().shape({
      ...base,
    });
  }, [userData?.type]);


  const initialValues = {
    fullName: userData?.name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    address: userData?.address?.full_address || '',
    zip: userData?.address?.postal_code || '',
    businessName: userData?.business_name || '',
    vatId: userData?.vat_id || '',
    status: userData?.status || 'active',
  };





  const pickImageFromCameraOrGallery = async () => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const permissionsToRequest = [];

        const cameraStatus = await check(PERMISSIONS.ANDROID.CAMERA);
        if (cameraStatus !== RESULTS.GRANTED) {
          permissionsToRequest.push(PERMISSIONS.ANDROID.CAMERA);
        }

        const readStatus = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES); // Android 13+
        const fallbackReadStatus = await check(
          PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        ); // Android < 13

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

        const allGranted = responses.every(
          result => result === RESULTS.GRANTED,
        );
        return allGranted;
      }

      return true; // iOS handled separately if needed
    };

    const hasPermission = await requestPermissions();
    // console.log('hasPermission', hasPermission);
    if (!hasPermission) {
      Alert.alert(
        'Permissions Required',
        'Please enable camera and storage permissions',
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
              launchCamera({ mediaType: 'photo', quality: 1 }, response => {
                if (response.didCancel || response.errorCode)
                  return resolve(null);
                resolve(response.assets?.[0]);
                setProfileImage(response.assets?.[0].uri || null);
                console.log("response", response.assets?.[0].uri)

              });
            },
          },
          {
            text: 'Gallery',
            onPress: () => {
              launchImageLibrary({ mediaType: 'photo', quality: 1 }, response => {
                if (response.didCancel || response.errorCode)
                  return resolve(null);
                resolve(response.assets?.[0]);
                setProfileImage(response.assets?.[0].uri || null);
                console.log("response", response.assets?.[0].uri)
              });
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
  };

  const updateProfile = async (values: {
    name: any;
    phone: any;
    business_name: any;
    vat_id: any;
    zip_code: any;
    fullName: string;
    address: string;
    status: string;
    email: string;
  }) => {
    try {
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
        formData.append(key, value);
      });

      if (profileImage) {
        formData.append('profile_image', {
          uri: profileImage,
          type: 'image/jpeg', // or image.type if available
          name: 'profile.jpg',
        });
      }

      showLoader();
      await UserService.UpdateProfile(formData)
        .then(async res => {
          hideLoader();
          if (res && res?.data && res?.status === HttpStatusCode.Ok) {
            Toast.show({
              type: 'success',
              text1: res?.data?.message,
            });
            console.log("profile", res.data)
            Toast.show({ type: 'success', text1: res?.data?.message });
            await LocalStorage.save('@user', res.data?.user);
            setUserData(res.data?.user);
            navigation.goBack();
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

  return (
    <LinearGradient
      colors={['#F3F3F3', '#FFFFFF',]}
      locations={[0, 0.5, 0.5, 1]} // split half-half
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }} // horizontal gradient // split exactly half-half
      style={{ flex: 1 }}>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Image source={require('../../assets/Png/back.png')} style={{ width: 20, height: 20 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text onPress={() => navigation.navigate('BottomTabScreen')} style={[styles.headerTitle, { fontSize: 14, textDecorationLine: 'underline', color: '#999' }]}>Skip</Text>
        </View>

        <Image
          source={{
            uri:
              userData?.profile_image
                ? Image_url + userData?.profile_image
                : profileImage
                  ? profileImage
                  : 'https://i.postimg.cc/mZXFdw63/person.png',
          }}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.cameraButton} onPress={() => pickImageFromCameraOrGallery()}>
          <Image source={require('../../assets/Png/camera.png')} style={styles.cameraIcon} />
          {/* <Text style={styles.cameraIcon}>📷</Text> */}
        </TouchableOpacity>
        <Formik
          initialValues={initialValues}
          validationSchema={profileSchema}
          onSubmit={values => {
            updateProfile(values);
            console.log(values);
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
            <>
              <ProfileField
                label="Full Name"
                required
                value={values.fullName}
                onChangeText={handleChange('fullName')}
                onBlur={handleBlur('fullName')}
                error={touched.fullName && errors.fullName}
              />
              <ProfileField
                label="Email ID"
                required
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                error={touched.email && errors.email}
                keyboardType="email-address"
              />
              <ProfileField
                label="Contact Number"
                required
                value={values.phone}
                onChangeText={handleChange('phone')}
                onBlur={handleBlur('phone')}
                error={touched.phone && errors.phone}
                keyboardType="phone-pad"
              />
              {userData?.type !== 'b2c' ? <>
                <ProfileField
                  label="Full Address"
                  required
                  value={values.address}
                  onChangeText={handleChange('address')}
                  onBlur={handleBlur('address')}
                  error={touched.address && errors.address}
                  multiline
                />
                <ProfileField
                  label="Zip Code"
                  required
                  value={values.zip}
                  onChangeText={handleChange('zip')}
                  onBlur={handleBlur('zip')}
                  error={touched.zip && errors.zip}
                  keyboardType="number-pad"
                />
                <ProfileField
                  label="Business Name"
                  required
                  value={values.businessName}
                  onChangeText={handleChange('businessName')}
                  onBlur={handleBlur('businessName')}
                  error={touched.businessName && errors.businessName}
                />
                <ProfileField
                  label="VAT ID"
                  required
                  value={values.vatId}
                  onChangeText={handleChange('vatId')}
                  onBlur={handleBlur('vatId')}
                  error={touched.vatId && errors.vatId}
                />
                {/* <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    Status <Text style={{ color: 'red' }}>*</Text>
                  </Text>
                  <DropDownPicker
                    open={statusOpen}
                    value={statusValue}
                    items={statusItems}
                    setOpen={setStatusOpen}
                    setValue={val => {
                      setStatusValue(val());
                      setFieldValue('status', val());
                    }}
                    setItems={setStatusItems}
                    style={styles.dropdown}
                    dropDownContainerStyle={{ borderColor: '#eee' }}
                    containerStyle={{ marginBottom: 10 }}
                    placeholder="Select status"
                  />
                  {touched.status && errors.status && (
                    <Text style={styles.errorText}>{errors.status}</Text>
                  )}
                </View> */}
              </> : null}
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </>
          )}
        </Formik>
      </ScrollView>
    </LinearGradient >
  );
};

const ProfileField = ({
  label,
  required,
  value,
  onChangeText,
  onBlur,
  error,
  keyboardType,
  multiline,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: 'red' }}> *</Text>}
    </Text>
    <View style={styles.inputRow}>
      <TextInput
        style={[styles.input, multiline && { height: 60 }]}
        value={value}
        placeholderTextColor={Colors.text[200]}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      <Image source={require('../../assets/Png/clock.png')} style={{ width: 16, height: 16, }} />
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
    width: widthPercentageToDP(100),
  },

  backButton: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 8,
    position: 'relative'
  },
  dropdown: {
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    minHeight: 45,
    zIndex: 0
  },
  cameraButton: {
    position: 'relative',
    bottom: 30,
    right: -30,
    backgroundColor: '#f8fbe5',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.button[100],
  },
  cameraIcon: {
    height: 15,
    width: 15,
    color: Colors.button[100],
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
    backgroundColor: 'transparent',
    top: -10, left: 10, zIndex: 1, position: "absolute"
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  editIcon: {
    fontSize: 12,
    color: Colors.button[100],
    marginLeft: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 2,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: Colors.button[100],
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
  },
});

export default EditProfile;