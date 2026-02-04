// components/AddressModal.tsx
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
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
  const { translatedText: failedLoadText } =
    useAutoTranslate('Failed to load addresses');

  
  // Ref to track if we're already fetching data
  const isFetchingRef = useRef(false);

  // Handle modal visibility changes smoothly
  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      loadAddresses();
    } else {
      setInternalVisible(false);
    }
  }, [visible]);

  // Load addresses when modal becomes visible
  const loadAddresses = async () => {
    // Prevent duplicate calls
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const res = await UserService.address();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { addresses } = res.data;
        setAddressList(addresses || []);
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
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
      setAddressList([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleAddressSelect = (address: Address | null) => {
    if (address) {
      // Selecting an existing address → return to parent and close
      onSelect && onSelect(address);
      handleClose();
      return;
    }
    // Add New flow
    handleClose();
    setTimeout(() => {
      setSelectedAddress(null);
      setShowAddressDetail(true);
    }, 300); // Increased timeout for smoother transition
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
        loadAddresses(); // Refresh the list
      } else {
        Toast.show({ type: 'error', text1: 'Failed to delete address' });
      }
    } catch (err: any) {
      hideLoader();
      console.log('Delete address error:', err.message || err);
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    }
  };

  const handleAddressDetailClose = () => {
    setShowAddressDetail(false);
    // Refresh addresses after detail modal closes
    loadAddresses();
  };

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
                  onPress={() => handleAddressSelect(null)}
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
                      <TouchableOpacity
                        key={addr.id}
                        style={styles.addressCard}
                        onPress={() => handleAddressSelect(addr)}
                      >
                        <View style={styles.addressCardHeader}>
                          <View style={{ flexDirection: 'row' }}>
                            <Image
                              source={Images.home}
                              style={{ width: 18, height: 18 }}
                            />

                            {/* Address Type */}
                            <TransletText
                              text={addr.address_type || ''}
                              style={styles.addressLabel}
                            />
                          </View>

                          <TouchableOpacity
                            onPress={() => {
                              setSelectedAddress(addr);
                              setShowAddressDetail(true);
                            }}
                          >
                            <Image
                              source={Images.clock}
                              style={{ width: 20, height: 20 }}
                            />
                          </TouchableOpacity>
                        </View>

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
                    ))
                  ) : (
                    <View style={styles.emptyContainer}>
                      <TransletText
                        text="No addresses found"
                        style={styles.emptyText}
                      />

                      <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => handleAddressSelect(null)}
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

      {/* Address Detail Modal - rendered separately */}
      <AddressDetailModal
        isVisible={showAddressDetail}
        onClose={handleAddressDetailClose}
        addresses={selectedAddress}
        onAddressUpdated={loadAddresses}
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
    opacity: 1,
    left: 10,
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
