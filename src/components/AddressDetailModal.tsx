import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
} from 'react-native';
import { CommonLoader } from './CommonLoader/commonLoader';
import { UserService } from '../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { Colors } from '../constant';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddressDetailModal = ({
  isVisible,
  onClose,
  addresses,
  onAddressUpdated,
  onModalOpen,
}) => {
  const { showLoader, hideLoader } = CommonLoader();
  const [selectedType, setSelectedType] = useState('home');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  });

  // Track keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Prevent duplicate submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // validation errors
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  });

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const validate = () => {
    const e: any = {};

    if (!formData.name || !formData.name.trim())
      e.name = 'Full name is required';

    if (!formData.email || !formData.email.trim()) {
      e.email = 'Email is required';
    } else {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(formData.email.trim())) e.email = 'Invalid email';
    }

    if (!formData.phone || !formData.phone.trim()) {
      e.phone = 'Contact number is required';
    } else {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length < 6) e.phone = 'Enter a valid contact number';
    }

    if (!formData.address || !formData.address.trim())
      e.address = 'Full address is required';
    if (!formData.city || !formData.city.trim()) e.city = 'City is required';
    if (!formData.zip || !formData.zip.trim()) e.zip = 'ZIP code is required';

    setErrors({
      name: e.name || '',
      email: e.email || '',
      phone: e.phone || '',
      address: e.address || '',
      city: e.city || '',
      zip: e.zip || '',
    });

    return Object.keys(e).length === 0;
  };

  const addressTypes = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'office', label: 'Office', icon: '💼' },
    { key: 'hotel', label: 'Hotel', icon: '🏨' },
    { key: 'other', label: 'Other', icon: '➕' },
  ];

  useEffect(() => {
    console.log('Editing address:', addresses);
    if (addresses) {
      setFormData({
        name: addresses.name || '',
        email: addresses.email || '',
        phone: addresses.phone || '',
        address: addresses.full_address || '',
        city: addresses.city || '',
        zip: addresses.postal_code || '',
      });
      setSelectedType(addresses.address_type || 'home');
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
      });
      setSelectedType('home');
      setErrors({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
      });
    }
  }, [addresses]);

  // Fixed: Added cleanup to prevent duplicate calls
  useEffect(() => {
    let mounted = true;

    if (isVisible && onModalOpen && mounted) {
      console.log('Modal opened, calling onModalOpen');
      onModalOpen();
    }

    return () => {
      mounted = false;
    };
  }, [isVisible, onModalOpen]);

  if (!isVisible) return null;

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors((p: any) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate call');
      return;
    }

    Keyboard.dismiss();

    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Please fix validation errors' });
      return;
    }

    try {
      setIsSubmitting(true); // Lock submission
      showLoader();

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address_type: selectedType,
        full_address: formData.address,
        city: formData.city,
        postal_code: formData.zip,
      };

      console.log(
        'Submitting address:',
        addresses?.id ? 'UPDATE' : 'CREATE',
        payload,
      );

      let res;

      if (addresses?.id) {
        res = await UserService.addressdupdate(addresses.id, payload);
      } else {
        res = await UserService.addaddress(payload);
      }

      hideLoader();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        Toast.show({
          type: 'success',
          text1: res.data?.message || 'Address saved successfully!',
        });
        onAddressUpdated && onAddressUpdated();
        onClose();
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (err) {
      hideLoader();
      console.log('Error in handleSubmit:', err);
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    } finally {
      setIsSubmitting(false); // Unlock submission
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={isVisible}
      onRequestClose={handleClose}
      statusBarTranslucent={true} // Added: Makes status bar translucent on Android
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <View style={styles.fullScreenOverlay}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.overlayTouchable} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.modalContent,
              isKeyboardVisible && styles.modalContentWithKeyboard,
            ]}
          >
            {/* Header with close button */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>
                {addresses ? 'Update Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.bodytext}>
              Complete address helps us serve you better.
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContainer}
            >
              {/* Address Type Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.addressTypeScroll}
              >
                {addressTypes.map(type => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.addressTypeButton,
                      selectedType === type.key &&
                        styles.addressTypeButtonSelected,
                    ]}
                    onPress={() => setSelectedType(type.key)}
                  >
                    <Text style={styles.addressTypeIcon}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.addressTypeLabel,
                        selectedType === type.key &&
                          styles.addressTypeLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Form Fields */}
              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name*"
                  placeholderTextColor={Colors.text[200]}
                  value={formData.name}
                  onChangeText={text => handleChange('name', text)}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                {errors.name ? (
                  <Text style={styles.errorText}>{errors.name}</Text>
                ) : null}

                <TextInput
                  style={styles.input}
                  placeholder="Email ID*"
                  placeholderTextColor={Colors.text[200]}
                  value={formData.email}
                  onChangeText={text => handleChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}

                <TextInput
                  style={styles.input}
                  placeholder="Contact Number*"
                  placeholderTextColor={Colors.text[200]}
                  value={formData.phone}
                  onChangeText={text => handleChange('phone', text)}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                {errors.phone ? (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                ) : null}

                <TextInput
                  style={[styles.input, styles.addressInput]}
                  placeholder="Full Address*"
                  placeholderTextColor={Colors.text[200]}
                  value={formData.address}
                  onChangeText={text => handleChange('address', text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                {errors.address ? (
                  <Text style={styles.errorText}>{errors.address}</Text>
                ) : null}

                <TextInput
                  style={styles.input}
                  placeholder="City*"
                  placeholderTextColor={Colors.text[200]}
                  value={formData.city}
                  onChangeText={text => handleChange('city', text)}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                {errors.city ? (
                  <Text style={styles.errorText}>{errors.city}</Text>
                ) : null}

                <TextInput
                  style={styles.input}
                  placeholder="ZIP Code*"
                  placeholderTextColor={Colors.text[200]}
                  value={formData.zip}
                  onChangeText={text => handleChange('zip', text)}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                {errors.zip ? (
                  <Text style={styles.errorText}>{errors.zip}</Text>
                ) : null}

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.confirmButtonText}>
                    {isSubmitting
                      ? 'Processing...'
                      : addresses
                      ? 'Update Address'
                      : 'Save Address'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddressDetailModal;

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  overlayTouchable: {
    flex: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '90%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContentWithKeyboard: {
    maxHeight: '95%',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 10,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '300',
    lineHeight: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  bodytext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addressInput: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  confirmButton: {
    backgroundColor: Colors.button[100],
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  addressTypeScroll: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    marginBottom: 20,
  },
  addressTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  addressTypeButtonSelected: {
    borderColor: Colors.button[100],
    backgroundColor: '#f8fbe5',
  },
  addressTypeIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  addressTypeLabel: {
    fontSize: 12,
    color: '#666',
  },
  addressTypeLabelSelected: {
    color: Colors.button[100],
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
});
