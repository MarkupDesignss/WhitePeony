import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { CommonLoader } from './CommonLoader/commonLoader';
import { UserService } from '../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../constant';

const AddressDetailModal = ({ isVisible, onClose, addresses, onAddressUpdated }) => {
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

    // validation errors
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
    });

    const validate = () => {
        const e: any = {};

        if (!formData.name || !formData.name.trim()) e.name = 'Full name is required';

        if (!formData.email || !formData.email.trim()) {
            e.email = 'Email is required';
        } else {
            // simple email regex
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!re.test(formData.email.trim())) e.email = 'Invalid email';
        }

        if (!formData.phone || !formData.phone.trim()) {
            e.phone = 'Contact number is required';
        } else {
            const digits = formData.phone.replace(/\D/g, '');
            if (digits.length < 6) e.phone = 'Enter a valid contact number';
        }

        if (!formData.address || !formData.address.trim()) e.address = 'Full address is required';
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

    // ✅ Hooks can safely call effects
    useEffect(() => {
        console.log('Editing address:', addresses);
        if (addresses) {
            setFormData({
                name: addresses.name || "",
                email: addresses.email || "",
                phone: addresses.phone || "",
                address: addresses.full_address || "",
                city: addresses.city || "",
                zip: addresses.postal_code || "",
            });
            setSelectedType(addresses.address_type || "home");
        } else {
            // reset when adding new
            setFormData({
                name: "",
                email: "",
                phone: "",
                address: "",
                city: "",
                zip: "",
            });
            setSelectedType("home");
            setErrors({ name: '', email: '', phone: '', address: '', city: '', zip: '' });
        }
    }, [addresses]);

    if (!isVisible) return null;

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((p: any) => ({ ...p, [name]: '' }));
    };

    // ✅ Submit handler — decides Add or Update
    const handleSubmit = async () => {
        if (!validate()) {
            Toast.show({ type: 'error', text1: 'Please fix validation errors' });
            return;
        }
        try {
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

            let res;

            if (addresses?.id) {
                // 🟡 Update API call
                res = await UserService.addressdupdate(addresses.id, payload);
            } else {
                // 🆕 Add new API call
                res = await UserService.addaddress(payload);
            }

            hideLoader();

            if (res?.status === HttpStatusCode.Ok && res?.data) {
                Toast.show({
                    type: "success",
                    text1: res.data?.message || "Address saved successfully!",
                });
                onAddressUpdated && onAddressUpdated(); // Refresh address list in parent
                onClose(); // close modal
            } else {
                Toast.show({
                    type: "error",
                    text1: res?.data?.message || "Something went wrong!",
                });
            }
        } catch (err) {
            hideLoader();
            console.log("Error in handleSubmit:", err);
            Toast.show({
                type: "error",
                text1: err?.response?.data?.message || "Something went wrong! Please try again.",
            });
        }
    };

    return (
        <Modal transparent animationType="slide" visible={isVisible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>
                            {addresses ? "Update Address" : "Add New Address"}
                        </Text>

                        <Text style={styles.bodytext}>
                            Complete address helps us serve you better.
                        </Text>

                        {/* Address Type Selector */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addressTypeScroll}>
                            {addressTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.key}
                                    style={[
                                        styles.addressTypeButton,
                                        selectedType === type.key && styles.addressTypeButtonSelected,
                                    ]}
                                    onPress={() => setSelectedType(type.key)}>
                                    <Text style={styles.addressTypeIcon}>{type.icon}</Text>
                                    <Text
                                        style={[
                                            styles.addressTypeLabel,
                                            selectedType === type.key && styles.addressTypeLabelSelected,
                                        ]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Form Fields */}
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name*"
                            placeholderTextColor={Colors.text[200]}
                            value={formData.name}
                            onChangeText={(text) => handleChange("name", text)}
                        />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                        <TextInput
                            style={styles.input}
                            placeholder="Email ID*"
                            placeholderTextColor={Colors.text[200]}
                            value={formData.email}
                            onChangeText={(text) => handleChange("email", text)}
                        />
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                        <TextInput
                            style={styles.input}
                            placeholder="Contact Number*"
                            placeholderTextColor={Colors.text[200]}
                            value={formData.phone}
                            onChangeText={(text) => handleChange("phone", text)}
                        />
                        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

                        <TextInput
                            style={styles.input}
                            placeholder="Full Address*"
                            placeholderTextColor={Colors.text[200]}
                            value={formData.address}
                            onChangeText={(text) => handleChange("address", text)}
                        />
                        {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}

                        <TextInput
                            style={styles.input}
                            placeholder="City*"
                            placeholderTextColor={Colors.text[200]}
                            value={formData.city}
                            onChangeText={(text) => handleChange("city", text)}
                        />
                        {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

                        <TextInput
                            style={styles.input}
                            placeholder="ZIP Code*"
                            placeholderTextColor={Colors.text[200]}
                            value={formData.zip}
                            onChangeText={(text) => handleChange("zip", text)}
                        />
                        {errors.zip ? <Text style={styles.errorText}>{errors.zip}</Text> : null}


                        {/* Submit */}
                        <TouchableOpacity style={styles.confirmButton} onPress={handleSubmit}>
                            <Text style={styles.confirmButtonText}>
                                {addresses ? "Update Address" : "Save Address"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default AddressDetailModal;

const styles = StyleSheet.create({
    errorText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 4,
    },
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 16, borderRadius: 27, padding: 16, maxHeight: '90%', width: '95%', alignSelf: 'center', bottom: 20
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    closeButtonText: {
        fontSize: 25,
        color: 'black',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    bodytext: {
        fontSize: 14, color: '#666', marginBottom: 20,
    },
    input: {
        height: 45,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        paddingLeft: 10,
        fontSize: 16,
    },
    confirmButton: {
        backgroundColor: Colors.button[100],
        paddingVertical: 12,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    addressTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        width: '90%'
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
});

