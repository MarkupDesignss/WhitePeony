// components/AddressModal.tsx
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CommonLoader } from './CommonLoader/commonLoader';
import { UserService } from '../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import AddressDetailModal from './AddressDetailModal';
import { Images } from '../constant';
import TransletText from '../components/TransletText';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

type Address = {
  id: string | number;
  address_type?: string;
  name?: string;
  full_address?: string;
  phone?: string;
  postal_code?: string | number;
  city?: string;
  email?: string;
};

type AddressModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect?: (address: Address) => void;
  onAddNew?: () => void;
};

const AddressModal: React.FC<AddressModalProps> = ({
  visible,
  onClose,
  onSelect,
  onAddNew,
}) => {
  const { showLoader, hideLoader } = CommonLoader();
  const [addressList, setAddressList] = useState<Address[]>([]);
  const [showAddressDetail, setShowAddressDetail] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [internalVisible, setInternalVisible] = useState(visible);
  const { translatedText: failedLoadText } = useAutoTranslate('Failed to load addresses');

  // Refs to prevent multiple API calls and track state
  const isFetchingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isAddingAddressRef = useRef(false);
  const isEditingAddressRef = useRef(false);

  // Handle modal visibility changes
  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      // Only load if we haven't loaded before
      if (!hasLoadedRef.current && !isAddingAddressRef.current && !isEditingAddressRef.current) {
        loadAddresses();
      }
    } else {
      // Don't immediately hide if we're about to show address detail
      if (!isAddingAddressRef.current && !isEditingAddressRef.current) {
        setInternalVisible(false);
      }
    }
  }, [visible]);

  // Load addresses
  const loadAddresses = useCallback(async (forceRefresh = false) => {
    // Prevent multiple calls
    if (isFetchingRef.current) return;
    if (hasLoadedRef.current && !forceRefresh) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const res = await UserService.address();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { addresses } = res.data;
        setAddressList(addresses || []);
        hasLoadedRef.current = true;
      } else {
        Toast.show({
          type: 'error',
          text1: failedLoadText || 'Failed to load addresses',
        });
        setAddressList([]);
      }
    } catch (err: any) {
      console.log('Error in Addresses:', err.message || err);
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message || 'Something went wrong! Please try again.',
      });
      setAddressList([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [failedLoadText]);

  const handleAddressSelect = (address: Address) => {
    // Select address and close
    onSelect && onSelect(address);
    handleClose();
  };

  const handleAddNewPress = () => {
    // Set flag to prevent main modal from closing issues
    isAddingAddressRef.current = true;

    // Close main modal first
    setInternalVisible(false);

    // Call onClose prop
    onClose && onClose();

    // Small delay to ensure smooth transition
    setTimeout(() => {
      setSelectedAddress(null);
      setShowAddressDetail(true);
      // Reset flag after opening detail modal
      setTimeout(() => {
        isAddingAddressRef.current = false;
      }, 500);
    }, 300);
  };

  const handleEditPress = (address: Address) => {
    // Set flag to prevent main modal from closing issues
    isEditingAddressRef.current = true;

    // Close main modal first
    setInternalVisible(false);

    // Call onClose prop
    onClose && onClose();

    // Small delay to ensure smooth transition
    setTimeout(() => {
      setSelectedAddress(address);
      setShowAddressDetail(true);
      // Reset flag after opening detail modal
      setTimeout(() => {
        isEditingAddressRef.current = false;
      }, 500);
    }, 300);
  };

  const handleClose = () => {
    setInternalVisible(false);
    setTimeout(() => {
      onClose && onClose();
    }, 300);
  };

  const DeleteAlert = async (id: string | number) => {
    Alert.alert('White Peony', 'Are you sure you want to Delete Address?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: () => {
          DeleteAddress(id);
        },
      },
    ]);
  };

  const DeleteAddress = async (id: string | number) => {
    try {
      showLoader();
      const res = await UserService.deleteaddresses(id);
      hideLoader();

      if (res && res.data && res.status === HttpStatusCode.Ok) {
        Toast.show({
          type: 'success',
          text1: res.data?.message || 'Address deleted successfully!',
        });
        // Reset loaded flag to force refresh
        hasLoadedRef.current = false;
        loadAddresses(true);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to delete address' });
      }
    } catch (err: any) {
      hideLoader();
      console.log('Delete address error:', err.message || err);
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message || 'Something went wrong! Please try again.',
      });
    }
  };

  const handleAddressDetailClose = useCallback(() => {
    // Hide detail modal
    setShowAddressDetail(false);
    setSelectedAddress(null);

    // Reset loaded flag to refresh data
    hasLoadedRef.current = false;

    // Show main modal again
    setTimeout(() => {
      setInternalVisible(true);
      // Load fresh data
      loadAddresses(true);
    }, 300);
  }, [loadAddresses]);

  const handleAddressDetailSave = useCallback(() => {
    // Called when address is saved successfully
    handleAddressDetailClose();
  }, [handleAddressDetailClose]);

  return (
    <>
      <Modal
        visible={internalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContainer}>
                <TransletText text="Select Address" style={styles.header} />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddNewPress}
                >
                  <Image
                    source={Images.plus1}
                    style={{ width: 15, height: 15 }}
                  />
                  <TransletText text="Add New Address" style={styles.addText} />
                </TouchableOpacity>

                <ScrollView style={{ maxHeight: 300, marginTop: 15 }}>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#AEB254" />
                      <TransletText
                        text="Loading addresses..."
                        style={styles.loadingText}
                      />
                    </View>
                  ) : addressList && addressList.length > 0 ? (
                    addressList.map(addr => (
                      <View key={addr.id} style={styles.addressCard}>
                        <View style={styles.addressCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image
                              source={Images.home}
                              style={{ width: 18, height: 18 }}
                            />
                            <TransletText
                              text={addr.address_type || ''}
                              style={styles.addressLabel}
                            />
                          </View>

                          <TouchableOpacity
                            onPress={() => handleEditPress(addr)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Image
                              source={Images.clock}
                              style={{ width: 20, height: 20 }}
                            />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleAddressSelect(addr)}
                          activeOpacity={0.7}
                        >
                          <View style={{ marginTop: 10 }}>
                            <TransletText
                              text={addr.name || ''}
                              style={styles.addressName}
                            />
                            <TransletText
                              text={addr.full_address || ''}
                              style={styles.addressLine}
                            />
                            <TransletText
                              text={String(addr.phone || '')}
                              style={styles.addressLine}
                            />
                            <TransletText
                              text={String(addr.postal_code || '')}
                              style={styles.addressLine}
                            />
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyContainer}>
                      <TransletText
                        text="No addresses found"
                        style={styles.emptyText}
                      />
                      <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={handleAddNewPress}
                      >
                        <TransletText
                          text="Add New Address"
                          style={styles.emptyButtonText}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                >
                  <TransletText text="Close" style={styles.closeText} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Address Detail Modal */}
      <AddressDetailModal
        isVisible={showAddressDetail}
        onClose={handleAddressDetailClose}
        onSave={handleAddressDetailSave}
        addresses={selectedAddress}
        onAddressUpdated={() => {
          hasLoadedRef.current = false;
          loadAddresses(true);
        }}
      />
    </>
  );
};

export default AddressModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderRadius: 27,
    padding: 16,
    maxHeight: '90%',
    width: '95%',
    alignSelf: 'center',
    bottom: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#AEB254',
    borderRadius: 13,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
    height: 40,
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEB254',
    marginLeft: 10,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 14,
    color: '#555',
  },
  closeButton: {
    backgroundColor: '#E2E689',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  closeText: {
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 15,
  },
  emptyButton: {
    backgroundColor: '#AEB254',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});