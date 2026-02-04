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
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
import TransletText from '../../components/TransletText';


const MyEventsScreen = ({ navigation }) => {
    const [events, setEvents] = useState([]);
    const { showLoader, hideLoader } = CommonLoader();
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const { translatedText: cancelEventText } = useAutoTranslate('Cancel Event');
const { translatedText: confirmCancelText } = useAutoTranslate(
  'Are you sure you want to cancel this event?'
);
const { translatedText: noText } = useAutoTranslate('No');
const { translatedText: yesCancelText } = useAutoTranslate('Yes, Cancel');


    useEffect(() => {
        OrderList();
    }, []);

    const OrderList = async () => {
        try {
            showLoader();
            const res = await UserService.eventsListing();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                console.log("'logsss", res.data);
                const apiOrders = Array.isArray(res?.data?.registered_events)
                    ? res.data.registered_events
                    : [];

                setEvents(apiOrders);
            } else {
                hideLoader();
                console.log('error', res?.data);
                // handle non-OK response if needed
            }
        } catch (err) {
            hideLoader();
            console.log('error', err);
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
        Alert.alert(
          cancelEventText || 'Cancel Event',
          confirmCancelText || 'Are you sure you want to cancel this event?',
          [
            {
              text: noText || 'No',
              style: 'cancel',
            },
            {
              text: yesCancelText || 'Yes, Cancel',
              style: 'destructive',
              onPress: () => CancelButton(item?.event_id),
            },
          ],
        );
      };
      

    const CancelButton = async id => {
        try {
            showLoader();
            const res = await UserService.eventscancel(id);
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                console.log("'logsss", res.data);
                setEvents(events.filter(e => e.id !== id));
                // const apiOrders = Array.isArray(res?.data?.registered_events) ? res.data.registered_events : [];

                // setEvents(apiOrders)
            } else {
                hideLoader();
                console.log('error', res?.data);
                // handle non-OK response if needed
            }
        } catch (err) {
            hideLoader();
            console.log('error', JSON.stringify(err));
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
                    <TransletText text={item.title} style={styles.title} />
                    <Text style={styles.title}>
                        <TransletText text="Seats" />: {item.booked_seats}
                    </Text>
                </View>
                <TransletText
                    text={`📅 Date: ${formatDate(item.event_date)}`}
                    style={styles.detail}
                />

                <TransletText
                    text={`📍 Location: ${item.address}`}
                    style={styles.detail}
                />

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => openEventDetail(item)}
                    >
                        <TransletText text="View Details" style={styles.detailText} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelEvent(item)}
                    >
                        <TransletText text="Cancel" style={styles.cancelText} />
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
                <TransletText text="My Event" style={styles.headerTitle} />
                <View />
            </View>

            {events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <TransletText text="No events found." style={styles.emptyText} />

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
                                <>
                                    {/* Title */}
                                    <TransletText
                                        text={selectedBooking.title}
                                        style={styles.modalTitle}
                                    />

                                    {/* Date */}
                                    <TransletText
                                        text={`📅 Date: ${formatDate(selectedBooking.event_date)}`}
                                        style={styles.modalDetail}
                                    />

                                    {/* Speaker */}
                                    <TransletText
                                        text={`🎤 Speaker: ${selectedBooking.speaker}`}
                                        style={styles.modalDetail}
                                    />

                                    {/* Venue */}
                                    <TransletText
                                        text={`📍 Venue: ${selectedBooking.address}`}
                                        style={styles.modalDetail}
                                    />

                                    {/* Seats */}
                                    <TransletText
                                        text={`💺 Booked Seats: ${selectedBooking.booked_seats} / ${selectedBooking.capacity}`}
                                        style={styles.modalDetail}
                                    />

                                    {/* Price per seat */}
                                    <TransletText
                                        text={`💰 Price per Seat: ₹${selectedBooking.price_per_seat}`}
                                        style={styles.modalDetail}
                                    />

                                    {/* Total */}
                                    <TransletText
                                        text={`💵 Total: ₹${selectedBooking.total_price}`}
                                        style={styles.modalDetail}
                                    />

                                    {/* Description */}
                                    <TransletText
                                        text={selectedBooking.description || ''}
                                        style={styles.modalDescription}
                                    />

                                    {/* Close button */}
                                    <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                                        <TransletText text="Close" style={styles.closeText} />
                                    </TouchableOpacity>
                                </>

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
