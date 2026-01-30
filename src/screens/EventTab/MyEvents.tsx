import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Image,
    Platform,
    StatusBar,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { formatDate } from '../../helpers/helpers';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';

const MyEventsScreen = ({ navigation }) => {
    const [events, setEvents] = useState([]);
    const { showLoader, hideLoader } = CommonLoader();
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        OrderList();
    }, []);

    const OrderList = async () => {
        try {
            showLoader();
            const res = await UserService.eventsListing();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
              
                const apiOrders = Array.isArray(res?.data?.registered_events)
                    ? res.data.registered_events
                    : [];

                setEvents(apiOrders);
            } else {
                hideLoader();
       
                // handle non-OK response if needed
            }
        } catch (err) {
            hideLoader();
          
            // handle network/error
        }
    };

    const openBookingDetail = booking => {
        setSelectedBooking(booking);
        setModalVisible(true);
    };

    const closeModal = () => {
        setSelectedBooking(null);
        setModalVisible(false);
    };

    const handleCancelEvent = item => {
        Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: () => CancelButton(item?.event_id),
                // onPress: () => setEvents(events.filter((e) => e.id !== id)),
            },
        ]);
    };

    const CancelButton = async id => {
        try {
            showLoader();
            const res = await UserService.eventscancel(id);
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                setEvents(events.filter(e => e.id !== id));
                // const apiOrders = Array.isArray(res?.data?.registered_events) ? res.data.registered_events : [];

                // setEvents(apiOrders)
            } else {
                hideLoader();
             
                // handle non-OK response if needed
            }
        } catch (err) {
            hideLoader();
    
            // handle network/error
        }
    };

    const openEventDetail = event => {
        setSelectedBooking(event);
        setModalVisible(true);
    };

    const renderEventCard = ({ item }) => (
        <TouchableOpacity onPress={() => openBookingDetail(item)}>
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.title}>{item.booked_seats}</Text>
                </View>
                <Text style={styles.detail}>📅 {formatDate(item.event_date)}</Text>
                <Text style={styles.detail}>📍 {item.address}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => openEventDetail(item)}
                    >
                        <Text style={styles.detailText}>View Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelEvent(item)}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (

        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation?.goBack()}
                >
                    <Image
                        source={require('../../assets/Png/back.png')}
                        style={{ width: 20, height: 20 }}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Event</Text>
                <View />
            </View>

            {events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No events found.</Text>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={item => item.id}
                    renderItem={renderEventCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 30 }}
                />
            )}

            {/* Detail Modal */}
            <Modal
                animationType="slide"
                transparent
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeModal}>
                    <Pressable style={styles.modalContainer}>
                        {selectedBooking && (
                            <>
                                <Text style={styles.modalTitle}>{selectedBooking.title}</Text>
                                <Text style={styles.modalDetail}>
                                    📅 {formatDate(selectedBooking.event_date)}
                                </Text>
                                <Text style={styles.modalDetail}>
                                    🎤 Speaker: {selectedBooking.speaker}
                                </Text>
                                <Text style={styles.modalDetail}>
                                    📍 Venue: {selectedBooking.address}
                                </Text>
                                <Text style={styles.modalDetail}>
                                    💺 Booked Seats: {selectedBooking.booked_seats} /{' '}
                                    {selectedBooking.capacity}
                                </Text>
                                <Text style={styles.modalDetail}>
                                    💰 Price per Seat: ₹{selectedBooking.price_per_seat}
                                </Text>
                                <Text style={styles.modalDetail}>
                                    💵 Total: ₹{selectedBooking.total_price}
                                </Text>
                                <Text
                                    style={[
                                        styles.modalDetail,
                                        selectedBooking.payment_status === 'paid'
                                            ? { color: 'green' }
                                            : { color: 'orange' },
                                    ]}
                                >
                                    💳 Payment Status:{' '}
                                    {selectedBooking.payment_status.toUpperCase()}
                                </Text>

                                <Text style={styles.modalDescription}>
                                    {selectedBooking.description}
                                </Text>

                                <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    detail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    detailBtn: {
        backgroundColor: Colors.button[100],
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 8,
    },
    detailText: {
        color: '#000',
        fontWeight: '400',
    },
    cancelBtn: {
        borderColor: Colors.button[100],
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 8,
        borderWidth: 1,
    },
    cancelText: {
        color: 'red',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        width: '90%',
        alignSelf: 'center',
        marginTop: '10%',
    },
    backBtn: { padding: 8, marginRight: 8 },
    screenTitle: { flex: 1, textAlign: 'center', fontWeight: '600' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 20,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
    },
    modalDetail: {
        fontSize: 16,
        color: '#555',
        marginBottom: 6,
    },
    modalDescription: {
        fontSize: 15,
        color: '#444',
        marginTop: 10,
        lineHeight: 22,
    },
    closeBtn: {
        marginTop: 20,
        backgroundColor: '#007BFF',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontWeight: '600',
    },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    backButton: {
        width: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
