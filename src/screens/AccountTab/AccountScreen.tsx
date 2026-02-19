import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  StatusBar,
  Linking,
  Dimensions,
  Platform,
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
import TransletText from '../../components/TransletText';

const { width } = Dimensions.get('window');

type AccountScreenProps = {
  navigation: StackNavigationProp<any>;
};

const AccountScreen = ({ navigation }: AccountScreenProps) => {
  const { showLoader, hideLoader } = CommonLoader();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    userData,
    setIsLoggedIn,
    isLoggedIn,
    userType,
    tierType,
    isLoading: contextLoading,
    refetchProfile,
  } = useContext<UserData>(UserDataContext);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [modalAddress, setModalAddress] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📱 AccountScreen - Context Values:', {
      userData: userData ? {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        type: userData.type,
        tier: userData.tier?.type,
        profile_image: userData.profile_image,
        created_at: userData.created_at
      } : null,
      isLoggedIn,
      userType,
      tierType,
      contextLoading
    });
    setIsInitialLoad(false);
  }, [userData, isLoggedIn, userType, tierType, contextLoading]);

  // Use the useAutoTranslate hook for each text
  const { translatedText: accountTitle } = useAutoTranslate('Account');
  const { translatedText: loginText } = useAutoTranslate('Login');
  const { translatedText: logoutText } = useAutoTranslate('Logout');
  const { translatedText: viewProfileText } = useAutoTranslate('View Full Profile');
  const { translatedText: myOrdersText } = useAutoTranslate('My Orders');
  const { translatedText: myEventsText } = useAutoTranslate('My Events');
  const { translatedText: myFavoritesText } = useAutoTranslate('My Favorites');
  const { translatedText: myAddressText } = useAutoTranslate('My Address');
  const { translatedText: notificationsText } = useAutoTranslate('Notifications');
  const { translatedText: policiesText } = useAutoTranslate('Policies');
  const { translatedText: termsText } = useAutoTranslate('Terms & Conditions');
  const { translatedText: languageChangeText } = useAutoTranslate('Language Change');
  const { translatedText: cookiesText } = useAutoTranslate('Cookies');
  const { translatedText: privacyText } = useAutoTranslate('Privacy Policy');
  const { translatedText: changeCurrencyText } = useAutoTranslate('Change Currency');
  const { translatedText: deleteAccountText } = useAutoTranslate('Delete Account');
  const { translatedText: memberSinceText } = useAutoTranslate('Member since');
  const { translatedText: superShinyText } = useAutoTranslate(tierType || '');
  const { translatedText: growthValueText } = useAutoTranslate('Growth Value');
  const { translatedText: privilegesText } = useAutoTranslate('Privileges In Total');
  const { translatedText: unlockedText } = useAutoTranslate('Unlocked');
  const { translatedText: notificationText } = useAutoTranslate('Notification');
  const { translatedText: myFavoritiesText } = useAutoTranslate('My Favorities');
  const { translatedText: logoutSuccessText } = useAutoTranslate('Log Out Successfully!');

  // Function to open external URLs with InAppBrowser
  const openInAppBrowser = async (url: string, title?: string) => {
    try {
      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.open(url, {
          // iOS Properties
          dismissButtonStyle: 'cancel',
          preferredBarTintColor: '#000000',
          preferredControlTintColor: '#ffffff',
          readerMode: false,
          animated: true,
          modalPresentationStyle: 'fullScreen',
          modalEnabled: true,
          enableBarCollapsing: false,
          // Android Properties
          showTitle: true,
          toolbarColor: '#000000',
          secondaryToolbarColor: '#000000',
          navigationBarColor: '#000000',
          navigationBarDividerColor: 'white',
          enableUrlBarHiding: true,
          enableDefaultShare: true,
          forceCloseOnRedirection: false,
          animations: {
            startEnter: 'slide_in_right',
            startExit: 'slide_out_left',
            endEnter: 'slide_in_left',
            endExit: 'slide_out_right',
          },
          headers: {
            'my-custom-header': 'my custom header value',
          },
        });
        console.log('InAppBrowser result:', result);
      } else {
        // Fallback to Linking if InAppBrowser is not available
        Linking.openURL(url);
      }
    } catch (error) {
      console.log('InAppBrowser error:', error);
      Alert.alert('Error', 'Unable to open the link');
    }
  };

  // Function to handle policy links
  const handlePolicyLink = (policyType: 'terms' | 'privacy' | 'cookies') => {
    let url = '';
    let title = '';

    switch (policyType) {
      case 'terms':
        url = 'https://whitepeony.eu/terms-conditions/';
        title = 'Terms & Conditions';
        break;
      case 'privacy':
        url = 'https://whitepeony.eu/privacy-policy/';
        title = 'Privacy Policy';
        break;
      case 'cookies':
        url = 'https://whitepeony.eu/cookies/';
        title = 'Cookie Policy';
        break;
      default:
        url = 'https://whitepeony.eu/';
    }

    openInAppBrowser(url, title);
  };

  const signout = async () => {
    Alert.alert('White Peony', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: async () => {
          setIsLoading(true);
          await handleSignout(setIsLoggedIn);
          Toast.show({
            type: 'success',
            text1: logoutSuccessText || 'Log Out Successfully!',
          });
          setIsLoading(false);
        },
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
        text: 'OK',
        onPress: () => {
          DeleteAcc();
        },
      },
    ]);
  };

  const DeleteAcc = async () => {
    try {
      showLoader();
      const res = await UserService.deleteAccount();
      hideLoader();
      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message } = res.data;
        Toast.show({ type: 'success', text1: message });
        setTimeout(() => {
          setIsLoggedIn(false);
          LocalStorage.save('@login', false);
          LocalStorage.save('@user', null);
          LocalStorage.flushQuestionKeys();
        }, 700);
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (err: any) {
      hideLoader();
      console.log('Error in DeleteAcc:', JSON.stringify(err));
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message || 'Something went wrong! Please try again.',
      });
    }
  };

  const getDisplayName = () => {
    if (userData?.name) {
      return userData.name;
    }
    if (userData?.first_name && userData?.last_name) {
      return `${userData.first_name} ${userData.last_name}`;
    }
    if (userData?.first_name) {
      return userData.first_name;
    }
    return 'User Name';
  };

  const getUserEmail = () => {
    return userData?.email || null;
  };

  const getUserPhone = () => {
    return userData?.phone || null;
  };

  const getMemberSince = () => {
    if (userData?.created_at) {
      return formatDate(userData.created_at);
    }
    return 'N/A';
  };

  const getTierName = () => {
    if (tierType) {
      return tierType;
    }
    if (userData?.tier?.type) {
      return userData.tier.type;
    }
    return null;
  };

  const getProfileImage = () => {
    if (userData?.profile_image) {
      return { uri: Image_url + userData.profile_image };
    }
    return null;
  };

  const isB2BUser = userType === 'b2b';
  const tierName = getTierName();

  // Show loading only on initial load
  if (isInitialLoad || contextLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.button[100]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{accountTitle || 'Account'}</Text>
        {isLoggedIn ? (
          <TouchableOpacity onPress={signout} style={styles.logoutIcon}>
            <Image
              source={require('../../assets/Png/logout1.png')}
              style={{ width: 20, height: 20, tintColor: Colors.button[100] }}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.logoutIcon}
          >
            <Text style={styles.loginText}>{loginText || 'Login'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <LoginModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGoogleLogin={() => Alert.alert('Google Login')}
        onFacebookLogin={() => Alert.alert('Facebook Login')}
        phoneNumber="email or phone number"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoggedIn && userData ? (
          <LinearGradient
            colors={isB2BUser ? ['#FCFFBF', '#F7FB9D'] : ['#FFFFFF', '#F5F5F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.profileCard,
              !isB2BUser && styles.b2cProfileCard
            ]}
          >
            {/* Diagonal Shine Overlay - Only for B2B */}
            {isB2BUser && (
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.45)',
                  'rgba(255,255,255,0.15)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.diagonalShine}
              />
            )}

            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {getProfileImage() ? (
                  <Image
                    source={getProfileImage()}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {getDisplayName().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{getDisplayName()}</Text>

                {getUserEmail() && (
                  <Text style={styles.email} numberOfLines={1}>
                    {getUserEmail()}
                  </Text>
                )}

                {getUserPhone() && (
                  <Text style={styles.phone} numberOfLines={1}>
                    {getUserPhone()}
                  </Text>
                )}

                <Text style={styles.since}>
                  {memberSinceText || 'Member since'} {getMemberSince()}
                </Text>

                {tierName && (
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierText}>
                      {tierName.charAt(0).toUpperCase() + tierName.slice(1)} Tier
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* B2B Specific Content - Only show for B2B users */}
            {isB2BUser && (
              <>
                <View style={styles.separator} />

                <View style={styles.superShinyContent}>
                  <Text style={styles.superShinyTitle}>
                    {userType ? userType.toUpperCase() : 'B2B MEMBER'}
                  </Text>
                  {tierName && (
                    <Text style={styles.tierSubText}>{tierName} Tier</Text>
                  )}
                </View>

                <View style={styles.privilegesFooter}>
                  <Text style={styles.privilegesText}>
                    4 {privilegesText || 'Privileges In Total'}, 1{' '}
                    {unlockedText || 'Unlocked'}
                  </Text>
                </View>
              </>
            )}
          </LinearGradient>
        ) : null}

        {isLoggedIn && (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.menuButton}
          >
            <View style={styles.menuButtonLeft}>
              <Image
                source={require('../../assets/Png/user.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuButtonText}>
                {viewProfileText || 'View Full Profile'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <View style={styles.menuCard}>
          {isLoggedIn && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrdersScreen')}
                style={styles.menuItem}
              >
                <View style={styles.menuItemLeft}>
                  <Image
                    source={require('../../assets/Png/order.png')}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuItemText}>
                    {myOrdersText || 'My Orders'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('MyEventsScreen')}
                style={styles.menuItem}
              >
                <View style={styles.menuItemLeft}>
                  <Image
                    source={require('../../assets/Png/events.png')}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuItemText}>
                    {myEventsText || 'My Events'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('WishlistScreen')}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <Image
                source={require('../../assets/Png/star.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>
                {myFavoritiesText || 'My Favorities'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {isLoggedIn && (
            <TouchableOpacity
              onPress={() => setModalAddress(true)}
              style={[styles.menuItem, styles.lastMenuItem]}
            >
              <View style={styles.menuItemLeft}>
                <Image
                  source={require('../../assets/Png/paymentmethod.png')}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuItemText}>
                  {myAddressText || 'My Address'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {notificationsText || 'Notifications'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationScreen')}
          style={styles.notificationButton}
        >
          <View style={styles.menuItemLeft}>
            <Image
              source={require('../../assets/Png/bellnoti.png')}
              style={styles.menuIcon}
            />
            <Text style={styles.menuItemText}>
              {notificationText || 'Notification'}
            </Text>
          </View>
          <View style={styles.switchContainer}>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: Colors.button[100] }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              style={styles.switch}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{policiesText || 'Policies'}</Text>
        <View style={styles.policiesCard}>
          <TouchableOpacity
            onPress={() => handlePolicyLink('terms')}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <Image
                source={require('../../assets/Png/task.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>
                {termsText || 'Terms & Conditions'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('SelectLanguageScreen')}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <Image
                source={require('../../assets/Png/translate.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>
                {languageChangeText || 'Language Change'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handlePolicyLink('cookies')}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <Image
                source={require('../../assets/Png/cookies.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>
                {cookiesText || 'Cookies'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handlePolicyLink('privacy')}
            style={[
              styles.menuItem,
              styles.lastMenuItem,
              { borderBottomWidth: 1 },
            ]}
          >
            <View style={styles.menuItemLeft}>
              <Image
                source={require('../../assets/Png/shieldpro.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>
                {privacyText || 'Privacy Policy'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CurrencyScreen')}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <Image
                source={require('../../assets/Png/shieldpro.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>
                {changeCurrencyText || 'Change Currency'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {isLoggedIn && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={DeleteAccount}
          >
            <Image
              source={require('../../assets/Png/delete.png')}
              style={styles.deleteIcon}
            />
            <Text style={styles.deleteButtonText}>
              {deleteAccountText || 'Delete Account'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddressModal
        visible={modalAddress}
        onClose={() => setModalAddress(false)}
        onSelect={address => {
          console.log('Selected address:', address);
          setModalAddress(false);
        }}
      />
    </SafeAreaView>
  );
};

export default AccountScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.button[100],
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 20,
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  logoutIcon: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  loginText: {
    fontSize: 16,
    color: Colors.button[100],
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 10,
  },
  profileCard: {
    width: width * 0.9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#AEB254',
    alignSelf: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  b2cProfileCard: {
    borderColor: '#E5E5E5',
  },
  diagonalShine: {
    position: 'absolute',
    top: -40,
    right: -80,
    width: 200,
    height: 300,
    transform: [{ rotate: '35deg' }],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.button[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  phone: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  since: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  tierBadge: {
    backgroundColor: Colors.button[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tierText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.button[100],
    marginHorizontal: 16,
    marginVertical: 0,
  },
  superShinyContent: {
    padding: 16,
    paddingBottom: 12,
  },
  superShinyTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  tierSubText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  growthValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '700',
    marginBottom: 8,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#D7E109',
    borderRadius: 4,
  },
  privilegesFooter: {
    backgroundColor: Colors.button[100],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
  },
  privilegesText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  menuButton: {
    width: width * 0.9,
    alignSelf: 'center',
    borderRadius: 6,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 12,
  },
  menuCard: {
    width: width * 0.9,
    alignSelf: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  menuItem: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  menuIcon: {
    width: 20,
    height: 18,
    resizeMode: 'contain',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    color: '#000000',
    width: width * 0.9,
    alignSelf: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  policiesCard: {
    width: width * 0.9,
    alignSelf: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  deleteButton: {
    marginTop: 24,
    backgroundColor: '#E5E5E5',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    width: width * 0.5,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  deleteIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationButton: {
    width: width * 0.9,
    alignSelf: 'center',
    borderRadius: 6,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  switchContainer: {
    marginLeft: 8,
  },
  switch: {
    transform: Platform.OS === 'ios'
      ? [{ scaleX: 0.8 }, { scaleY: 0.8 }]
      : [{ scaleX: 1 }, { scaleY: 1 }],
  },
});