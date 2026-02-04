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
import EmailModal from '../../components/EmailModal';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';


type EventDetail = {
  image?: string;
  event_date?: string;
  capacity?: number;
  remaining_seats?: number;
  address?: string;
  title?: string;
  description?: string;
  agenda?: string;
};

const EventDetails = ({ navigation, route }: any) => {
  const viewRef = useRef<any>(null);
  const eventid = route?.params?.event || '';
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [eventDetails, setEventDetails] = React.useState<EventDetail | null>(
    null,
  );
  const [isDescriptionExpanded, setIsDescriptionExpanded] =
    React.useState(false);
  const [isDescriptionTruncatable, setIsDescriptionTruncatable] =
    React.useState(false);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isEventPassed, setIsEventPassed] = useState(false);

  const { translatedText: selectSeatsText } = useAutoTranslate(
    'Please select number of seats'
  );
  const { translatedText: onlySeatsAvailableText } = useAutoTranslate(
    'Only {count} seats available'
  );
  const { translatedText: registrationSuccessText } = useAutoTranslate(
    'Registration successful!'
  );
  const { translatedText: registrationFailText } = useAutoTranslate(
    'Failed to register'
  );
  const { translatedText: somethingWentWrongText } = useAutoTranslate(
    'Something went wrong! Please try again.'
  );
  const { translatedText: eventPassedText } = useAutoTranslate(
    'This event has already passed'
  );
  const { translatedText: enterExactEmailsText } = useAutoTranslate(
    'Please enter exactly {count} email(s)'
  );

  const onDescriptionTextLayout = React.useCallback(
    (e: any) => {
      const lines = e?.nativeEvent?.lines || [];
      if (lines.length > 5 && !isDescriptionTruncatable) {
        setIsDescriptionTruncatable(true);
      }
    },
    [isDescriptionTruncatable],
  );

  useEffect(() => {
    EventDetail(eventid);
  }, []);

  // CORRECTED DATE COMPARISON FUNCTION
  // Event is passed if event date is BEFORE current date
  const isEventDatePassed = (eventDateString: string): boolean => {
    if (!eventDateString) return false;

    try {
      console.log('🔍 Checking event date:', eventDateString);

      // Parse event date
      const eventDate = new Date(eventDateString);

      // Get current date
      const today = new Date();

      // Create date objects with only year, month, day (remove time)
      const eventOnlyDate = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
      );

      const todayOnlyDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      console.log('📅 Event Date (no time):', eventOnlyDate.toDateString());
      console.log('📅 Today (no time):', todayOnlyDate.toDateString());
      console.log('📅 Event timestamp:', eventOnlyDate.getTime());
      console.log('📅 Today timestamp:', todayOnlyDate.getTime());

      // Compare: Event is passed if it's BEFORE today
      const isPassed = eventOnlyDate.getTime() < todayOnlyDate.getTime();
      console.log('❌ Is event passed?', isPassed);

      return isPassed;
    } catch (error) {
      console.error('Error in date comparison:', error);
      return false;
    }
  };

  const EventDetail = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await UserService.eventupdate(id);
      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, event } = res.data;
        // Check if event is passed using helper function
        const isPassed = isEventDatePassed(event.event_date);
        console.log('📊 Final check - Event passed:', isPassed);
        console.log('📊 Current date:', new Date().toDateString());

        setIsEventPassed(isPassed);

        // If event is passed, prevent access and go back
        if (isPassed) {
          Toast.show({
            type: 'info',
            text1: eventPassedText || 'This event has already passed',
          });
          setTimeout(() => {
            navigation.goBack();
          }, 1500);
          return;
        }

        Toast.show({ type: 'success', text1: message });
        setEventDetails(event);
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (err: any) {
      console.log('Error in EventList:', JSON.stringify(err));
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle seat selection
  const handleSeatSelect = (num: number) => {
    setSelectedSeats(num);
  };

  // Function to confirm registration and show email modal
  const handleConfirmRegistration = () => {
    if (selectedSeats === 0) {
      Toast.show({
        type: 'error',
        text1: selectSeatsText || 'Please select number of seats',
      });
      return;
    }

    // Check if enough seats are available
    if (
      eventDetails?.remaining_seats &&
      selectedSeats > eventDetails.remaining_seats
    ) {
      Toast.show({
        type: 'error',
        text1: onlySeatsAvailableText
          ? onlySeatsAvailableText.replace('{count}', eventDetails.remaining_seats.toString())
          : `Only ${eventDetails.remaining_seats} seats available`,
      });
      return;
    }

    setBottomSheetVisible(false);
    setModalVisible(true);
  };

  // Submit emails to API
  const handleSubmitEmails = async (emails: string[]) => {
    if (emails.length !== selectedSeats) {
      Toast.show({
        type: 'error',
        text1: enterExactEmailsText
          ? enterExactEmailsText.replace('{count}', selectedSeats.toString())
          : `Please enter exactly ${selectedSeats} email${selectedSeats > 1 ? 's' : ''}`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await UserService.eventsRegister({ emails }, eventid);
      if (res?.data?.success) {
        Toast.show({
          type: 'error',
          text1: registrationFailText || 'Failed to register',
        });
        setModalVisible(false);
        setSelectedSeats(0);
        // Refresh event details to update remaining seats
        EventDetail(eventid);
        navigation.navigate('BookingSuccess');
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Failed to register',
        });
      }
    } catch (error: any) {
      console.log('Registration error:', JSON.stringify(error));
      Toast.show({
        type: 'error',
        text1: somethingWentWrongText || 'Something went wrong!',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open bottom sheet with reset
  const openSeatSelection = () => {
    setSelectedSeats(0);
    setBottomSheetVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View ref={viewRef} style={styles.card}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require('../../assets/Png/back.png')}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>
          <TransletText text="Event Details" style={styles.screenTitle} />
          <View style={{ width: 36 }} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7aa33d" />
          </View>
        ) : eventDetails && !isEventPassed ? (
          <>
            <Image
              source={{ uri: Image_url + eventDetails?.image }}
              style={styles.hero}
              resizeMode="cover"
            />
            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Image
                    source={require('../../assets/Png/clock.png')}
                    style={styles.metaIcon}
                  />
                  <TransletText
                    text={`Date: ${formatDate(eventDetails?.event_date) || '—'}`}
                    style={styles.metaText}
                  />

                </View>
                <View style={styles.metaItem}>
                  <Image
                    source={require('../../assets/Png/office-chair2.png')}
                    style={styles.metaIcon}
                  />
                  <TransletText
                    text={`${eventDetails?.remaining_seats ?? 0} ${'Seats Left'}`}
                    style={styles.metaText}
                  />

                </View>
              </View>

              <View style={styles.addressContainer}>
                <Image
                  source={require('../../assets/Png/location.png')}
                  style={styles.addressIcon}
                />
                <TransletText text={eventDetails?.address} style={styles.address} />
              </View>

              <TransletText text={eventDetails?.title} style={styles.eventTitle} />

              <TransletText
                text={eventDetails?.description || ''}
                style={styles.excerpt}
                numberOfLines={isDescriptionExpanded ? undefined : 5}
                onTextLayout={onDescriptionTextLayout}
              />

              {isDescriptionTruncatable && (
                <TouchableOpacity
                  onPress={() => setIsDescriptionExpanded(prev => !prev)}
                >
                  <Text style={styles.readMoreText}>
                    {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                  </Text>
                </TouchableOpacity>
              )}

              <TransletText text="Agenda" style={styles.agendaTitle} />

              {eventDetails?.agenda
                ?.split(',')
                .map(item => item.trim())
                .map((item, index) => (
                  <View key={index} style={styles.agendaItem}>
                    <Image
                      source={require('../../assets/Png/check.png')}
                      style={styles.checkIcon}
                    />
                    <TransletText text={item} style={styles.agendaText} />
                  </View>
                ))}

              <TouchableOpacity
                style={[
                  styles.registerBtn,
                  (!eventDetails?.remaining_seats ||
                    eventDetails.remaining_seats === 0) &&
                  styles.disabledButton,
                ]}
                onPress={openSeatSelection}
                disabled={
                  !eventDetails?.remaining_seats ||
                  eventDetails.remaining_seats === 0
                }
              >
                <TransletText text={eventDetails?.remaining_seats === 0
                  ? 'Sold Out'
                  : 'Register Now'} style={styles.registerText} />
              </TouchableOpacity>
            </ScrollView>
          </>
        ) : (
          <View style={styles.noEventContainer}>
            <TransletText text={isEventPassed
              ? 'This event has already passed'
              : 'Event not found'} style={styles.noEventText} />
          </View>
        )}
      </View>

      {/* Bottom Sheet for Seat Selection - Only show if event is not passed AND not loading */}
      {eventDetails && !isEventPassed && !isLoading && (
        <Modal
          visible={isBottomSheetVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBottomSheetVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setBottomSheetVisible(false)}
          >
            <View style={styles.bottomSheetOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.bottomSheetContent}>
                  <View style={styles.bottomSheetHandle} />

                  <TransletText text="Select Number of Seats" style={styles.bottomSheetTitle} />

                  <TransletText
                    text={`Available seats: ${eventDetails?.remaining_seats || 0}`}
                    style={styles.availableSeatsText}
                  />


                  <View style={styles.seatsContainer}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.seatButton,
                          selectedSeats === num && styles.selectedSeatButton,
                        ]}
                        onPress={() => handleSeatSelect(num)}
                        disabled={num > (eventDetails?.remaining_seats || 0)}
                      >
                        <Text
                          style={[
                            styles.seatText,
                            selectedSeats === num && styles.selectedSeatText,
                            num > (eventDetails?.remaining_seats || 0) &&
                            styles.disabledSeatText,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.confirmRegistrationButton,
                      selectedSeats === 0 && styles.disabledConfirmButton,
                    ]}
                    onPress={handleConfirmRegistration}
                    disabled={selectedSeats === 0}
                  >
                    <TransletText text={selectedSeats > 0
                      ? `Confirm Registration (${selectedSeats} seat${selectedSeats > 1 ? 's' : ''
                      })`
                      : 'Select seats to continue'} style={styles.confirmRegistrationText} />

                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Email Modal - Only show if event is not passed */}
      <EmailModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        seatCount={selectedSeats}
        onSubmit={handleSubmitEmails}
        isLoading={isLoading}
      />

      {/* REMOVED DUPLICATE LOADING OVERLAY */}
    </SafeAreaView>
  );
};

export default memo(EventDetails);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#fff',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 15,
  },
  backBtn: {
    padding: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
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
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 15,
    height: 15,
  },
  metaText: {
    color: '#8b8b8b',
    fontSize: 12,
    marginLeft: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginTop: 20,
  },
  addressIcon: {
    width: 15,
    height: 15,
  },
  address: {
    color: '#4a4a4a',
    marginLeft: 10,
    flex: 1,
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    marginTop: 20,
  },
  excerpt: {
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  readMoreText: {
    color: '#7aa33d',
    marginBottom: 16,
  },
  agendaTitle: {
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
    fontSize: 16,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkIcon: {
    width: 15,
    height: 15,
    marginTop: 2,
  },
  agendaText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  registerBtn: {
    marginTop: 30,
    backgroundColor: Colors.button[100],
    paddingVertical: 14,
    borderRadius: 27,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  registerText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noEventText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  availableSeatsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  seatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  seatButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 50,
    alignItems: 'center',
  },
  selectedSeatButton: {
    borderColor: '#7aa33d',
    backgroundColor: '#e6f4d9',
  },
  seatText: {
    fontSize: 16,
    color: '#000',
  },
  selectedSeatText: {
    color: '#7aa33d',
    fontWeight: '600',
  },
  disabledSeatText: {
    color: '#ccc',
  },
  confirmRegistrationButton: {
    backgroundColor: '#7aa33d',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  disabledConfirmButton: {
    backgroundColor: '#ccc',
  },
  confirmRegistrationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
