import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
  Modal,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../helpers/helpers';
import Geolocation from 'react-native-geolocation-service';
import { check, request, RESULTS, PERMISSIONS } from 'react-native-permissions';
import { widthPercentageToDP } from '../../constant/dimentions';
import { Colors, Images } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');

const EventScreen = ({ navigation }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  const [location, setLocation] = useState<any>(null);
  const [sampleEvents, setsampleEvents] = React.useState<any[]>([]);
  const [NearbyEvents, setNearbyEvents] = React.useState<any[]>([]);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [upcomingModalVisible, setUpcomingModalVisible] = useState(false);
  const [nearbyModalVisible, setNearbyModalVisible] = useState(false);

  useEffect(() => {
    requestPermissionAndGetLocation();
    EventList();
  }, []);

  // 👇 Handles permission for both platforms
  const requestPermissionAndGetLocation = async () => {
    try {
      const permissionType =
        Platform.OS === 'android'
          ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
          : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

      // Step 1: Check current permission
      const status = await check(permissionType);

      if (status === RESULTS.GRANTED) {
        getCurrentLocation();
      } else if (status === RESULTS.DENIED || status === RESULTS.LIMITED) {
        // Step 2: Ask for permission
        const reqStatus = await request(permissionType);

        if (reqStatus === RESULTS.GRANTED || reqStatus === RESULTS.LIMITED) {
          getCurrentLocation();
        } else {
          Alert.alert(
            'Location Permission Needed',
            'You need to allow location permission to use this feature.',
            [
              {
                text: 'Retry',
                onPress: async () => {
                  const retryStatus = await request(permissionType);
                  if (
                    retryStatus === RESULTS.GRANTED ||
                    retryStatus === RESULTS.LIMITED
                  ) {
                    getCurrentLocation();
                  } else {
                    Alert.alert('Still Denied', 'Permission not granted.');
                  }
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true },
          );
        }
      } else if (status === RESULTS.BLOCKED) {
        // Don't open settings — just show message
        Alert.alert(
          'Permission Blocked',
          'You have permanently denied location permission. Please enable it later in settings if you change your mind.',
        );
      }
    } catch (error) {
      console.warn('Permission Error:', error);
    }
  };

  // 👇 Get current location
  const getCurrentLocation = () => {
    showLoader();
    Geolocation.getCurrentPosition(
      position => {
        hideLoader();
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        console.log('Current Location:', latitude, longitude);
        EventNearbyList(latitude, longitude);
      },
      error => {
        hideLoader();
        console.log('Location Error:', error);
        Alert.alert('Error', 'Unable to fetch location. Please try again.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };

  const EventList = async () => {
    try {
      showLoader();
      const res = await UserService.events();
      hideLoader();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { events } = res.data;
        setsampleEvents(events || []);
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (e) {
      hideLoader();
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        Toast.show({
          type: 'error',
          text1: error || 'Something went wrong!',
        });
      }
    }
  };

  const EventNearbyList = async (latitude: number, longitude: number) => {
    const payload = {
      lat: latitude,
      lng: longitude,
      radius: 15,
    };
    try {
      showLoader();
      const res = await UserService.nearbyevents(payload);
      hideLoader();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { events } = res.data;
        setNearbyEvents(events || []);
      } else {
        // Toast.show({
        //   type: 'error',
        //   text1: res?.data?.message || 'Something went wrong!',
        // });
      }
    } catch (e) {
      hideLoader();
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        console.log('Unauthorized access - error', error);
      }
    }
  };

  const renderUpcomingModal = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={{
        borderWidth: 1,
        borderRadius: 12,
        borderColor: Colors.text[400],
        padding: 10,
        marginBottom: 12, // Add margin bottom for spacing
        marginHorizontal: 5,
      }}
      onPress={() => {
        navigation.navigate('EventDetails', { event: item.id });
        setUpcomingModalVisible(false);
      }}
      activeOpacity={0.8}
    >
      <Image
        resizeMode="cover"
        source={{ uri: Image_url + item.image }}
        style={[styles.upCardModal]} // Use separate style for modal
      />

      <View style={styles.upBadgeRow}>
        <View style={styles.readBadge}>
          <Text numberOfLines={2} style={styles.upTitleWhite}>
            {item.title}
          </Text>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}
          >
            <Image
              source={Images.location}
              style={{ width: 15, height: 15, marginRight: 10 }}
            />
            <Text numberOfLines={1} style={styles.upMetaWhite}>
              {item.address} • {item.remaining_seats} Seats Left
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}
          >
            <Image
              source={Images.clock_3}
              style={{ width: 15, height: 15, marginRight: 10 }}
            />
            <Text style={styles.readBadgeText}>
              {formatDate(item.event_date)}
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}
          >
            <Image
              source={Images.officechair2}
              style={{ width: 15, height: 15, marginRight: 10 }}
            />
            <Text style={styles.readBadgeText}>{'15 Seats Left'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNearModal = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.nearCard, { marginBottom: 10 }]} // Add margin bottom
      onPress={() => {
        navigation.navigate('EventDetails', { event: item.id });
        setNearbyModalVisible(false);
      }}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: Image_url + item.image }}
        style={styles.nearImage}
      />
      <View style={styles.nearBody}>
        <Text numberOfLines={2} style={styles.nearTitle}>
          {item.title}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={Images.location}
              style={{ width: 14, height: 14, marginRight: 6 }}
            />
            <Text numberOfLines={1} style={styles.nearMeta}>
              {' '}
              {item.address?.split(' ')[0]}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={Images.officechair2}
              style={{ width: 14, height: 14, marginRight: 6 }}
            />
            <Text numberOfLines={1} style={styles.nearMeta}>
              {item.remaining_seats} Seats Left
            </Text>
          </View>
        </View>

        <View
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
        >
          <Image
            source={Images.clock_3}
            style={{ width: 14, height: 14, marginRight: 6 }}
          />
          <Text style={styles.nearDate}>{formatDate(item.event_date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  // Helper function to filter out past events
  const filterUpcomingEvents = (events: any[]) => {
    if (!events || events.length === 0) return [];

    const currentDate = new Date();

    return events.filter(event => {
      if (!event || !event.event_date) return false;

      try {
        // Parse event date
        const eventDate = new Date(event.event_date);

        // Check if event date is today or in the future
        return eventDate >= currentDate;
      } catch (error) {
        console.warn('Error parsing date for event:', event.id, error);
        return false; // Exclude events with invalid dates
      }
    });
  };

  // --- Search helpers ---
  // --- Search helpers ---
  const performLocalSearch = (query: string) => {
    const q = query.toLowerCase();
    // Combine and filter upcoming events only
    const combined = [...filterUpcomingEvents(sampleEvents), ...filterUpcomingEvents(NearbyEvents)];
    const uniqueMap = new Map<string, any>();
    combined.forEach((it: any) => {
      if (!it || !it.id) return;
      if (!uniqueMap.has(String(it.id))) uniqueMap.set(String(it.id), it);
    });
    const deduped = Array.from(uniqueMap.values());
    const filtered = deduped.filter((ev: any) => {
      const title = (ev.title || '').toString().toLowerCase();
      const addr = (ev.address || '').toString().toLowerCase();
      const date = (ev.event_date || '').toString().toLowerCase();
      return title.includes(q) || addr.includes(q) || date.includes(q);
    });
    return filtered;
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      // client-side search - flexible and fast
      const results = performLocalSearch(trimmed);
      setSearchResults(results);
      setIsSearching(false);
      // optional: if you want server search, call API here
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'}
      />

      {/* Header with Back Button */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require('../../assets/Png/back.png')} // Adjust path as needed
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search events..."
            placeholderTextColor={Colors.text[200]}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                const results = performLocalSearch(searchQuery.trim());
                setSearchResults(results);
              }
            }}
          />
          {isSearching ? (
            <ActivityIndicator
              style={{ marginLeft: 8 }}
              size="small"
              color="#2DA3C7"
            />
          ) : searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.microphone}>
              <Text style={{ fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.microphone}>
              <Image
                source={require('../../assets/Png/search.png')}
                style={styles.iconSmall}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={
          searchQuery.trim()
            ? searchResults
            : filterUpcomingEvents(NearbyEvents)
        }
        keyExtractor={i => String(i.id)}
        renderItem={renderNearModal}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim() ? 'Search Results' : 'Upcoming Events'}
              </Text>
              <TouchableOpacity onPress={() => setUpcomingModalVisible(true)}>
                <Text style={styles.seeMore}>
                  {searchQuery.trim()
                    ? `${searchResults.length} found`
                    : 'See more'}
                </Text>
              </TouchableOpacity>
            </View>

            {searchQuery.trim() ? (
              isSearching ? (
                <ActivityIndicator
                  style={{ marginVertical: 20 }}
                  size="large"
                  color="#2DA3C7"
                />
              ) : searchResults.length === 0 ? (
                <View style={{ padding: 20 }}>
                  <Text style={{ color: '#666' }}>
                    No results for "{searchQuery}"
                  </Text>
                </View>
              ) : null
            ) : (
              <>
                <View style={{ marginTop: 10 }}>
                  <FlatList
                    data={filterUpcomingEvents(sampleEvents)} // Filter past events
                    keyExtractor={i => String(i.id)}
                    renderItem={renderUpcomingModal}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 12 }}
                  />
                </View>

                <View style={[styles.sectionHeader, {}]}>
                  <Text style={styles.sectionTitle}>Events Near You</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const upcomingNearby = filterUpcomingEvents(NearbyEvents);
                      upcomingNearby.length == 0
                        ? Alert.alert('', 'No Upcoming Event Found')
                        : setNearbyModalVisible(true);
                    }}
                  >
                    <Text style={styles.seeMore}>See more</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
        ListEmptyComponent={() =>
          !searchQuery.trim() ? (
            <View style={{ paddingTop: 80 }}>
              <Text
                style={{
                  color: '#000',
                  fontWeight: '700',
                  alignSelf: 'center',
                  textAlign: 'center',
                  flex: 1,
                }}
              >
                No nearby events found
              </Text>
            </View>
          ) : null
        }
      />

      {/* Upcoming events modal */}
   
      <Modal visible={upcomingModalVisible} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View style={modalStyles.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>
                Upcoming Events
              </Text>
              <TouchableOpacity onPress={() => setUpcomingModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filterUpcomingEvents(sampleEvents)} // Filter past events here
              keyExtractor={i => String(i.id)}
              renderItem={renderUpcomingModal}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: 20,
                paddingTop: 10,
              }}
              style={{ flex: 1 }}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={false}
              ListEmptyComponent={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                  <Text style={{ color: '#666', fontSize: 16 }}>
                    No upcoming events
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Nearby events modal */}
      <Modal visible={nearbyModalVisible} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View style={modalStyles.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>
                Events Near You
              </Text>
              <TouchableOpacity onPress={() => setNearbyModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={NearbyEvents}
              keyExtractor={i => String(i.id)}
              renderItem={renderNearModal} // Use the updated render function
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: 20,
                paddingTop: 10,
              }}
              style={{ flex: 1 }}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EventScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#FFFFF',
    height: 140,
  },
  header: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.button[100], // Optional: adjust color
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 40, // Same as backButton for symmetry
  },
  upCardModal: {
    width: '100%',
    height: 150, // Fixed height for modal cards
    borderRadius: 12,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchBtn: {
    marginLeft: 8,
    width: 44,
    height: 42,
    borderRadius: 20,
    backgroundColor: Colors.button[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  seeMore: { color: '#AEB254' },
  upCard: {
    width: '100%',
    height: '50%',
    borderRadius: 12,
    // alignSelf: 'center',
  },
  upBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  readBadge: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12 },
  readBadgeText: { fontSize: 12, color: '#000' },
  bookmarkBtn: {
    backgroundColor: Colors.button[100],
    borderRadius: 18,
    width: 30,
    height: 30,
    position: 'absolute',
    top: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upTitleWrap: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  upTitleWhite: { color: '#000', fontSize: 16, fontWeight: '700' },
  upMetaWhite: { color: '#000', fontSize: 12, opacity: 0.95 },
  upImage: { width: '100%', height: 120, borderRadius: 10 },
  upBody: { padding: 10 },
  upTitle: { fontSize: 14, fontWeight: '700' },
  upMeta: { fontSize: 12, color: '#6B6B6B', marginTop: 6 },
  upSeats: { marginTop: 8, color: '#6B6B6B', fontWeight: '600' },
  nearCard: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginTop: 15,
    borderBottomWidth: 0.9,
    borderBottomColor: Colors.text[400],
    width: widthPercentageToDP(95),
  },
  microphone: {
    marginLeft: 8,
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  nearBody: { flex: 1 },
  nearTitle: {
    fontSize: 14,
    fontWeight: '700',
    width: widthPercentageToDP(60),
  },
  nearMeta: { fontSize: 12, color: '#6B6B6B' },
  nearDate: { fontSize: 12, color: '#6B6B6B' },
  iconSmall: { width: 14, height: 14 },
  bookBtn: {
    width: 48,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginLeft: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: Dimensions.get('window').height * 0.8, // Use exact height
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
});
