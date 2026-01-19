import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';

const shippingOptions = [
    {
        id: 'standard',
        title: 'Standard Shipping',
        description: 'Estimated Time:- 3-5 days',
        price: '5.00 €',
        highlight: true,
    },
    {
        id: 'express',
        title: 'Express Shipping',
        description: 'Estimated Time:- 1-2 days',
        price: '12.00 €',
    },
    {
        id: 'free',
        title: 'Free Shipping',
        description: 'Estimated Time:- 7-10 days',
        price: 'Free',
        note: 'On order above 80 €',
    },
];

const CustomShippingModal = ({ isVisible, onClose, onSelect, selectedId }) => {
    const [selected, setSelected] = useState(selectedId || shippingOptions[0].id);

    const handleSelect = (id) => {
        setSelected(id);
        if (onSelect) onSelect(id);
    };

    if (!isVisible) return null;

    return (
        <Modal transparent animationType="slide" visible={isVisible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                            <View style={styles.handleBar} />
                            <Text style={styles.modalTitle}>Shipping Method</Text>
                            {shippingOptions.map(option => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.option,
                                        selected === option.id && styles.optionSelected,
                                        option.highlight && styles.optionHighlight,
                                    ]}
                                    onPress={() => handleSelect(option.id)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.optionTitle}>{option.title}</Text>
                                        <Text style={styles.optionDesc}>{option.description}</Text>
                                        {option.note && (
                                            <Text style={styles.optionNote}>{option.note}</Text>
                                        )}
                                    </View>
                                    <View style={styles.priceBox}>
                                        <Text style={styles.priceLabel}>Effective Price</Text>
                                        <Text style={styles.priceValue}>{option.price}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.actionButton} onPress={() => onClose(selected)}>
                                <Text style={styles.actionButtonText}>Continue to Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default CustomShippingModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        maxHeight: '90%',
        width: '100%',
        alignSelf: 'center',
        bottom: 0,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 2,
    },
    closeButtonText: {
        fontSize: 25,
        color: 'black',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        alignSelf: 'center',
        marginBottom: 20,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    optionSelected: {
        borderColor: '#c3d200',
        backgroundColor: '#f8fbe5',
    },
    optionHighlight: {
        backgroundColor: '#f8fbe5',
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 13,
        color: '#666',
    },
    optionNote: {
        fontSize: 12,
        color: '#3a6ed6',
        marginTop: 4,
    },
    priceBox: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    priceLabel: {
        fontSize: 12,
        color: '#888',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#c3d200',
    },
    actionButton: {
        backgroundColor: '#c3d200',
        paddingVertical: 14,
        borderRadius: 30,
        marginTop: 10,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
});