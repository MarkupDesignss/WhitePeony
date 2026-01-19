import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from './constant';

const AddressDetailModal = ({ isVisible, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: ''
    });

    if (!isVisible) return null;

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        // You can add validation here
        onSubmit(formData);
        onClose();
    };

    return (
        <Modal transparent={true} animationType="slide" visible={isVisible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Address Details</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Full Name*"
                        placeholderTextColor={Colors.text[200]}
                        value={formData.name}
                        onChangeText={(text) => handleChange('name', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email ID*"
                         placeholderTextColor={Colors.text[200]}
                        value={formData.email}
                        onChangeText={(text) => handleChange('email', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Contact Number*"
                         placeholderTextColor={Colors.text[200]}
                        value={formData.phone}
                        onChangeText={(text) => handleChange('phone', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Full Address*"
                         placeholderTextColor={Colors.text[200]}
                        value={formData.address}
                        onChangeText={(text) => handleChange('address', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="City*"
                         placeholderTextColor={Colors.text[200]}
                        value={formData.city}
                        onChangeText={(text) => handleChange('city', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="ZIP Code*"
                         placeholderTextColor={Colors.text[200]}
                        value={formData.zip}
                        onChangeText={(text) => handleChange('zip', text)}
                    />

                    <TouchableOpacity style={styles.confirmButton} onPress={handleSubmit}>
                        <Text style={styles.confirmButtonText}>Confirm & Place Order</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default AddressDetailModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        maxWidth: 400,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    closeButtonText: {
        fontSize: 30,
        color: 'black',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
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
        backgroundColor: '#c3d200',
        paddingVertical: 12,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
});

