import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';

import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import AddressModal from '../../components/AddressModal';
import Toast from 'react-native-toast-message';
import { formatDate, handleSignout } from '../../helpers/helpers';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { Image_url, UserService } from '../../service/ApiService';
import LoginModal from '../../components/LoginModal';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { HttpStatusCode } from 'axios';
import { LocalStorage } from '../../helpers/localstorage';
import { Colors } from '../../constant';

type AccountScreenProps = {
  navigation: StackNavigationProp<any>;
};

const AccountScreen = ({ navigation }: AccountScreenProps) => {
  const { showLoader, hideLoader } = CommonLoader();

  const { userData, setIsLoggedIn, isLoggedIn } = useContext<UserData>(UserDataContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [modalAddress, setModalAddress] = useState(false);
  const [modalAddressADD, setmodalAddressADD] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const signout = async () => {
    Alert.alert('White Peony', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: 'OK', onPress: () => {
          handleSignout(setIsLoggedIn);
          Toast.show({
            type: "success",
            text1: "Log Out Successfully!",
          });
        }
      },
    ]);
  };

  const DeleteAccount = async () => {
    Alert.alert('White Peony', 'Are you sure you want to Delete Account?', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: 'OK', onPress: () => {
          DeleteAcc();
        }
      },
    ]);
  };

  const DeleteAcc = async () => {
    try {
      showLoader();
      const res = await UserService.deleteAccount();
      hideLoader();
      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, data } = res.data;
        console.log("DeleteAcc response data:", res.data);
        Toast.show({ type: "success", text1: message });
        setTimeout(() => {
          setIsLoggedIn(false);
          LocalStorage.save('@login', false);
          LocalStorage.save('@user', null);
          LocalStorage.flushQuestionKeys();
        }, 700);

      } else {
        Toast.show({
          type: "error",
          text1: res?.data?.message || "Something went wrong!",
        });
      }
    } catch (err: any) {
      hideLoader();
      console.log("Error in DeleteAcc:", JSON.stringify(err));
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message || "Something went wrong! Please try again.",
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        {isLoggedIn ? (<TouchableOpacity onPress={() => signout()} style={styles.logoutIcon}>
          <Image
            source={require('../../assets/Png/logout1.png')}
            style={{ width: 20, height: 20 }}
          />
        </TouchableOpacity>) :
          <Text onPress={() => setModalVisible(true)} style={styles.logoutIcon}>Login</Text>}
      </View>

      <LoginModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        // login
        onGoogleLogin={() => Alert.alert("Google Login")}
        onFacebookLogin={() => Alert.alert("Facebook Login")}
        // otp
        phoneNumber="email or phone number"
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>

        {isLoggedIn ?
          <LinearGradient
            colors={['#FCFFBF', '#F7FB9D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}

          >
            {/* Diagonal Shine Overlay */}
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.45)',
                'rgba(255,255,255,0.15)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: -20,
                right: -40,
                width: 150,
                height: 250,
                transform: [{ rotate: '35deg' }],
              }}
            />
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              ...(userData?.type !== 'b2c'
                ? { paddingTop: 12 }
                : { paddingHorizontal: 12 }),
            }}>
              {userData?.profile_image ? <Image
                source={{ uri: Image_url + userData?.profile_image }}
                style={styles.avatar}
              /> :
                <Image
                  source={{ uri: 'https://i.postimg.cc/mZXFdw63/person.png' }}
                  style={styles.avatar}
                />
              }
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.name}>{userData?.name}</Text>
                <Text style={styles.since}>Member since {formatDate(userData?.created_at)}</Text>
              </View>
            </View>
            {userData?.type !== 'b2c' ?
              <>
                <View style={{ borderColor: Colors.button[100], borderWidth: 1, width: '90%', marginVertical: 12, alignSelf: 'center' }}></View>
                <View style={{ paddingHorizontal: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14 }}>Super Shiny</Text>
                  <Text style={{ fontSize: 10, color: '#000', fontWeight: '700', marginTop: 5 }}>
                    Growth Value 10000€ / 2500012000€
                  </Text>
                  <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: '30%' }]} />
                  </View>
                </View>
                <View style={{ backgroundColor: Colors.button[100], marginTop: 12, borderBottomLeftRadius: 11, borderBottomRightRadius: 11 }}>
                  <Text style={{ fontSize: 12, padding: 12 }}>
                    4 Privileges In Total, 1 Unlocked
                  </Text>
                </View>
              </> : null}
          </LinearGradient>
          : null}


        {isLoggedIn ? <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}
          style={{
            width: '90%',
            alignSelf: 'center',
            borderRadius: 6,
            height: 51,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 12,
            marginTop: 12,
            backgroundColor: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../assets/Png/user.png')}
              style={{ width: 16, height: 14 }}
            />
            <Text style={{ marginLeft: 8 }}>View Full Profile</Text>
          </View>

          <Text>›</Text>
        </TouchableOpacity> : null}

        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            height: 'auto',
            borderRadius: 6,
            backgroundColor: '#FFFFFF',
          }}
        >
          {isLoggedIn ? <TouchableOpacity onPress={() => navigation.navigate('OrdersScreen')}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,

              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/order.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>My Orders</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity> : null}


          {isLoggedIn ? <TouchableOpacity onPress={() => navigation.navigate('MyEventsScreen')}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,

              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/events.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>My Events</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity> : null}

          <TouchableOpacity onPress={() => navigation.navigate('WishlistScreen')}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,
              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/star.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>My Favorities</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity>

          {isLoggedIn ? <TouchableOpacity onPress={() => setModalAddress(true)}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,

              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/paymentmethod.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>My Address</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity> : null}
        </View>

        <Text style={{ marginTop: 20, marginBottom: 6, color: '#000000', width: '90%', alignSelf: 'center', fontSize: 17 }}>
          Notifications
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('NotificationScreen')}
          style={{
            width: '90%',
            alignSelf: 'center',
            borderRadius: 6,
            height: 51,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 12,
            marginTop: 12,
            backgroundColor: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../assets/Png/bellnoti.png')}
              style={{ width: 16, height: 14 }}
            />
            <Text style={{ marginLeft: 8 }}>Notification</Text>
          </View>

          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginTop: 10, }}
          />
        </TouchableOpacity>

        <Text style={{ marginTop: 20, marginBottom: 6, color: '#000000', width: '90%', alignSelf: 'center', fontSize: 17 }}>
          Policies
        </Text>
        <View
          style={{
            width: '90%',
            alignSelf: 'center',
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            borderRadius: 6,
            backgroundColor: '#FFFFFF',
          }}
        >
          <TouchableOpacity onPress={() => navigation.navigate('Slugs', { slug: 'terms-policy' })}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,

              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/task.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>Terms & Conditions</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SelectLanguageScreen')}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,
              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/cookies.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>Language Change</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Slugs', { slug: 'cookies-policy' })}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,

              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/cookies.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>Cookies</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Slugs', { slug: 'privacy-policy' })}
            style={{
              width: '95%',
              alignSelf: 'center',
              borderRadius: 6,
              height: 51,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,
              backgroundColor: '#FFFFFF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/Png/shieldpro.png')}
                style={{ width: 16, height: 14 }}
              />
              <Text style={{ marginLeft: 8 }}>Privacy Policy</Text>
            </View>

            <Text>›</Text>
          </TouchableOpacity>
        </View>

        {isLoggedIn ? <TouchableOpacity style={styles.deleteBtn} onPress={() => DeleteAccount()}>
          <Image
            source={require('../../assets/Png/delete.png')}
            style={{ width: 16, height: 16, marginRight: 6 }}
          />
          <Text style={{ color: '#000000' }}>Delete Account</Text>
        </TouchableOpacity> : null}
      </ScrollView>
      <AddressModal
        visible={modalAddress}
        onClose={() => setModalAddress(false)}
        onAddNew={() => { setModalAddress(false), setmodalAddressADD(true) }}
      />
    </View>

  );
};

export default AccountScreen;

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: StatusBar.currentHeight, backgroundColor: '#fff' },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 20
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  logoutIcon: { position: 'absolute', right: 16, alignItems: 'center' },
  profileCard: {
    width: '90%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#AEB254',
    paddingVertical: 12,
    alignSelf: 'center',
  },
  avatar: { width: 52, height: 52, borderRadius: 28, backgroundColor: '#fff' },
  name: { fontSize: 14, fontWeight: '700' },
  since: { fontSize: 12, color: '#6B6B6B' },

  progressBackground: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    marginTop: 8,
  },
  progressFill: { height: 8, backgroundColor: '#D7E109', borderRadius: 6 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    // marginTop: 12,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteBtn: {
    marginTop: 20,
    backgroundColor: '#E5E5E5',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    width: '50%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'center'
  },
});
