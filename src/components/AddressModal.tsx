// components/AddressModal.tsx
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { CommonLoader } from './CommonLoader/commonLoader';
import { UserService } from '../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import AddressDetailModal from './AddressDetailModal';
import { Images } from '../constant';

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

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      if (visible) {
        Addresses().then(() => {
          if (!isActive) return;
          Addresses();
        });
      }

      return () => {
        isActive = false;
      };
    }, [visible]),
  );

  const Addresses = async () => {
    try {
      showLoader();
      const res = await UserService.address();
      hideLoader();
      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, addresses } = res.data;
        Toast.show({ type: 'success', text1: message });
        setAddressList(addresses || []);
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (err: any) {
      hideLoader();
      console.log('Error in Addresses:', JSON.stringify(err));
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    }
  };
  const handleAddressSelect = (address: Address | null) => {
    console.log('Selected address:', address);
    if (address) {
      // Selecting an existing address → return to parent and close
      onSelect && onSelect(address);
      onClose && onClose();
      return;
    }
    // Add New flow → close this modal first, then open details modal
    onClose && onClose();
    // Set a small timeout to ensure modal is closed before opening new one
    setTimeout(() => {
      setSelectedAddress(null);
      setShowAddressDetail(true);
    }, 100);
  };

  const DeleteAlert = async id => {
    Alert.alert('White Peony', 'Are you sure you want to Delete Address?', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: () => {
          DeleteAddres(id);
        },
      },
    ]);
  };

  const DeleteAddres = async (id: number) => {
    try {
      showLoader();
      const res = await UserService.deleteaddresses(id);
      hideLoader();

      if (res && res.data && res.status === HttpStatusCode.Ok) {
        Toast.show({
          type: 'success',
          text1: res.data?.message || 'Cart updated!',
        });
        Addresses();
      } else {
        console.log('addresserror', res?.data);
        Toast.show({ type: 'error', text1: 'Failed to update cart' });
      }
    } catch (err: any) {
      console.log('addresserror', JSON.stringify(err));
      hideLoader();
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
    // If needed, you can reopen the address selection modal here
    // But usually, the address detail modal should be independent
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContainer}>
                <Text style={styles.header}>Select Address</Text>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddressSelect(null)}
                >
                  <Image source={Images.plus1} style={{ width: 15, height: 15 }} />
                  <Text style={styles.addText}> Add New Address</Text>
                </TouchableOpacity>

                <ScrollView style={{ maxHeight: 300, marginTop: 15 }}>
                  {addressList && addressList.length > 0 ? (
                    addressList.map(addr => (
                      <TouchableOpacity
                        key={addr.id}
                        style={styles.addressCard}
                        // onLongPress={() => {
                        //     setSelectedAddress(addr);
                        //     setShowAddressDetail(true);
                        // }}
                        onPress={() => handleAddressSelect(addr)} // ✅ Send address to parent
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            borderBottomWidth: 1,
                            borderBottomColor: '#D9D9D9',
                            height: 40,
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ flexDirection: 'row' }}>
                            <Image
                              source={Images.home}
                              style={{ width: 18, height: 18 }}
                            />
                            <Text style={styles.addressLabel}>
                              {addr.address_type}
                            </Text>
                          </View>
                          {/* <TouchableOpacity onPress={() => DeleteAlert(addr.id)}> */}
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
                          <Text style={styles.addressName}>{addr.name}</Text>
                          <Text style={styles.addressLine}>
                            {addr.full_address}
                          </Text>
                          <Text style={styles.addressLine}>{addr.phone}</Text>
                          <Text style={styles.addressLine}>{addr.postal_code}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 200,
                      }}
                    >
                      <Text style={{ color: '#999', fontSize: 16 }}>
                        No data found
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>Close</Text>
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
        onAddressUpdated={Addresses}
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
});