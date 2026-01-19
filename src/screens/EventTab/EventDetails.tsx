import React, { memo, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
  StatusBar,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import Toast from 'react-native-toast-message';
import { HttpStatusCode } from 'axios';
import { formatDate } from '../../helpers/helpers';
import EmailModal from '../../components/EmailModal'
import { Colors } from '../../constant';

type EventDetail = {
  image?: string;
  event_date?: string;
  capacity?: number;
  address?: string;
  title?: string;
  description?: string;
};


const EventDetails = ({ navigation, route }: any) => {
  const viewRef = useRef<any>(null);
  const eventid = route?.params?.event || '';
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [eventDetails, setEventDetails] = React.useState<EventDetail | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);
  const [isDescriptionTruncatable, setIsDescriptionTruncatable] = React.useState(false);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState(0);
  
  const onDescriptionTextLayout = React.useCallback((e: any) => {
    const lines = e?.nativeEvent?.lines || [];
    if (lines.length > 5 && !isDescriptionTruncatable) {
      setIsDescriptionTruncatable(true);
    }
  }, [isDescriptionTruncatable]);

  useEffect(() => {
    //console.log('Event ID from navigation params:', eventid);
    EventDetail(eventid);
  }, [])

  const EventDetail = async (id: string) => {
    try {

      const res = await UserService.eventupdate(id);

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, event } = res.data;
        //console.log("EventList response data:", res.data);
        Toast.show({ type: "success", text1: message });
        setEventDetails(event)

        //console.log("eventdetail", event)

      } else {
        Toast.show({
          type: "error",
          text1: res?.data?.message || "Something went wrong!",
        });
      }
    } catch (err: any) {
      console.log("Error in EventList:", JSON.stringify(err));
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message || "Something went wrong! Please try again.",
      });
    }
  };

  const handleSeatSelect = (num) => {
    setSelectedSeats(num);
    setBottomSheetVisible(false);
    // Prepare emails array
    setModalVisible(true);
  };

  const eventDate = new Date(eventDetails?.event_date);
  const today = new Date();

  // Compare only dates (ignore time)
  const eventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  );
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Show button if today <= event date
  const canRegister = todayDay.getTime() <= eventDay.getTime();

  // Step 2: submit emails
  const handleSubmitEmails = async (emails) => {
    showLoader();
    try {
      const res = await UserService.eventsRegister({ emails }, eventid);
      if (res?.data?.success) {
        Toast.show({ type: "success", text1: "Registration successful!" });
        navigation.navigate("BookingSuccess");
      } else {
        console.log("eventerror", res?.data)
        Toast.show({ type: "error", text1: res?.data?.message || "Failed to register" });
      }
    } catch (error) {
      console.log("eventerror1", JSON.stringify(error))

      Toast.show({ type: "error", text1: "Something went wrong!" });
    } finally {
      hideLoader();
    }
  };


  return (
    <View style={styles.container}>
      <View ref={viewRef} style={styles.card}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Image source={require('../../assets/Png/back.png')} style={{ width: 20, height: 20 }} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Tea Tasting Masterclass</Text>
          <View style={{ width: 36 }} />
        </View>

        <Image
          source={{ uri: Image_url + eventDetails?.image }}
          style={styles.hero}
          resizeMode="cover"
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.metaRow}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={require('../../assets/Png/clock.png')}
                style={{ width: 15, height: 15 }}
              />
              <Text style={styles.metaText}>{formatDate(eventDetails?.event_date)}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={require('../../assets/Png/office-chair2.png')}
                style={{ width: 15, height: 15 }}
              />
              <Text style={styles.metaText}>{eventDetails?.remaining_seats} Seats Left</Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: '90%',
              marginTop: '5%'
            }}
          >
            <Image
              source={require('../../assets/Png/location.png')}
              style={{ width: 15, height: 15 }}
            />
            <Text style={styles.address}>
              {eventDetails?.address}
            </Text>
          </View>
          <Text style={[styles.excerpt, { fontWeight: "bold", fontSize: 16, marginBottom: 10, marginTop: 20 }]} >{eventDetails?.title}</Text>
          <Text
            style={styles.excerpt}
            numberOfLines={isDescriptionExpanded ? undefined : 5}
            onTextLayout={onDescriptionTextLayout}
          >
            {eventDetails?.description}
          </Text>
          {isDescriptionTruncatable ? (
            <Text
              style={{ color: '#7aa33d' }}
              onPress={() => setIsDescriptionExpanded(prev => !prev)}
            >
              {isDescriptionExpanded ? 'Read Less' : 'Read More'}
            </Text>
          ) : null}

          <Text style={styles.agendaTitle}>Agenda</Text>

          {eventDetails?.agenda
            ?.split(',')           // Split the string by comma
            .map(item => item.trim()) // Remove extra spaces
            .map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, alignContent: "center" }}>
                <Image
                  source={require('../../assets/Png/check.png')}
                  style={{ width: 15, height: 15, justifyContent: 'center' }}
                />

                <Text style={{ fontSize: 16, justifyContent: 'center', top: -3, left: 10 }}>{item}</Text>
              </View>
            ))
          }

          {canRegister ? <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => setBottomSheetVisible(true)}
          >
            <Text style={styles.registerText}>Register Now</Text>
          </TouchableOpacity> : null}
        </ScrollView>
      </View>

      {/* ✅ Bottom Sheet for Selecting Seats */}
      <Modal
        visible={isBottomSheetVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBottomSheetVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setBottomSheetVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        </TouchableWithoutFeedback>

        <View
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            minHeight: 180,
            justifyContent: 'flex-start',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#ccc',
                borderRadius: 2,
              }}
            />
          </View>

          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
            Select Number of Seats
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginVertical: 10,
            }}
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={{
                  padding: 10,
                  borderWidth: 1,
                  borderColor: selectedSeats === num ? '#7aa33d' : '#ccc',
                  borderRadius: 8,
                  backgroundColor: selectedSeats === num ? '#e6f4d9' : '#fff',
                  minWidth: 50,
                  alignItems: 'center',
                }}
                onPress={() => handleSeatSelect(num)}
              >
                <Text style={{ color: selectedSeats === num ? '#7aa33d' : '#000' }}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: '#7aa33d',
              borderRadius: 8,
              paddingVertical: 14,
              marginTop: 10,
              alignItems: 'center',
            }}
            onPress={handleSeatSelect}
          >

            <Text style={{ color: '#fff', fontSize: 16 }}>Confirm Registration</Text>

          </TouchableOpacity>
        </View>
      </Modal>


      {/* Modal: enter emails */}
      <EmailModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        seatCount={selectedSeats}
        onSubmit={(emails) => handleSubmitEmails(emails)}
      />

    </View>
  );
};

export default EventDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
  scroll: { padding: 16, paddingBottom: 120 },
  card: { backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '90%',
    alignSelf: 'center',
    marginVertical: 15

  },
  backBtn: { padding: 8, marginRight: 8 },
  screenTitle: { flex: 1, textAlign: 'center', fontWeight: '600' },
  hero: {
    width: '90%',
    height: 205,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: { color: '#8b8b8b', fontSize: 12, marginLeft: 8 },
  address: { color: '#4a4a4a', marginLeft: 10, },
  excerpt: { color: '#333', marginBottom: 12, marginTop: '2%' },
  agendaTitle: { fontWeight: '600', marginBottom: 8, marginTop: '5%' },
  agendaItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bullet: { marginRight: 8 },
  agendaText: { color: '#333', marginLeft: 10 },
  registerBtn: {
    marginTop: '10%',
    backgroundColor: Colors.button[100],
    paddingVertical: 14,
    borderRadius: 27,
    alignItems: 'center',
  },
  registerText: { color: '#222', fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7aa33d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderRadius: 27,
    padding: 16,
    maxHeight: '90%',
    width: '95%',
    alignSelf: 'center',
    bottom: 20,
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#000',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: { fontSize: 13, color: '#333', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.text[400],
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  confirmBtn: {
    marginTop: 12,
    backgroundColor: Colors.button[100],
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  confirmText: { color: '#222', fontWeight: '600' },
});
