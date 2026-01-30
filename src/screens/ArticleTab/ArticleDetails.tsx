import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ImageURISource,
  StatusBar,
  Dimensions,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../helpers/helpers';
import { Colors, Images } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const getTimeAgo = (dateString?: string) => {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'Hour' : 'Hours'} Ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12)
    return `${diffMon} ${diffMon === 1 ? 'month' : 'months'} ago`;
  const diffYr = Math.floor(diffMon / 12);
  return `${diffYr} ${diffYr === 1 ? 'year' : 'years'} ago`;
};

// Platform-specific header height
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
const IMAGE_HEIGHT = Platform.OS === 'ios' ? height * 0.35 : height * 0.32;

const ArticleDetails = ({ navigation, route }: any) => {
  const airtcleid = route?.params?.article || '';
  const insets = useSafeAreaInsets();

  const { showLoader, hideLoader } = CommonLoader();

  type ArticleDetail = {
    image?: string;
    title?: string;
    updated_at?: string;
    created_at?: string;
    views?: number;
    content?: string;
  };

  const [airtcleDetails, setairtcleDetails] =
    React.useState<ArticleDetail | null>(null);

  const onCaptureAndShare = async () => {
    try {
      const img = require('../../../src/assets/Png/tea.jpg') as ImageURISource;
      // @ts-ignore
      const resolved = (Image as any).resolveAssetSource
        ? (Image as any).resolveAssetSource(img)
        : img;
      const uri = resolved?.uri || img;

      await Share.share(
        {
          url: uri,
          title: 'Article Image',
          message:
            Platform.OS === 'android' ? 'Sharing article image' : undefined,
        },
        { dialogTitle: 'Share article image' },
      );
    } catch (err) {
      console.warn('share error', err);
    }
  };

  useEffect(() => {
    ArticleDetail(airtcleid);
  }, []);

  const ArticleDetail = async (id: string) => {
    try {
      showLoader();
      const res = await UserService.articleDetail(id);
      hideLoader();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, data } = res.data;
        setairtcleDetails(data || null);
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (err: any) {
      hideLoader();
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    }
  };

  // Custom Header Component - Now as a separate header bar
  const CustomHeader = () => (
    <View
      style={[
        styles.headerContainer,
        {
          height: HEADER_HEIGHT + insets.top,
          paddingTop: insets.top,
          backgroundColor: '#fff',
        },
      ]}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../assets/Png/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {airtcleDetails?.title || 'Article Details'}
          </Text>
        </View>

        {/* Optional: Add share button */}
        <TouchableOpacity
          style={styles.placeholderButton}
          onPress={onCaptureAndShare}
        >
          {/* Empty placeholder to balance the layout */}
          <View style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Image section - starts below the header */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: Image_url + airtcleDetails?.image }}
            style={[styles.headerImage, { height: IMAGE_HEIGHT }]}
            resizeMode="cover"
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleWrapper}>
            <Text style={styles.articleTitle} numberOfLines={3}>
              {airtcleDetails?.title}
            </Text>
          </View>

          <View style={styles.metaInfoRow}>
            <View style={styles.metaItem}>
              <View style={styles.statusDot} />
              <Text style={styles.metaText}>
                {getTimeAgo(airtcleDetails?.created_at)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Image source={Images.date} style={styles.metaIcon} />
              <Text style={styles.metaText}>
                {formatDate(airtcleDetails?.created_at)?.slice(0, -9)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Image source={Images.views} style={styles.metaIcon} />
              <Text style={styles.metaText}>
                {airtcleDetails?.views || 0} views
              </Text>
            </View>
          </View>

          <View style={styles.contentBody}>
            <Text style={styles.contentLead}>{airtcleDetails?.title}</Text>
            <Text style={styles.contentParagraph}>
              {airtcleDetails?.content}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ArticleDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header Styles - Separate header at top
  headerContainer: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    tintColor: '#000',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: Platform.OS === 'ios' ? 17 : 18,
  },
  placeholderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    width: 24,
    height: 24,
    tintColor: '#000',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Image Section - Below header
  imageContainer: {
    width: '100%',
  },
  headerImage: {
    width: '100%',
  },

  // Content Section
  contentContainer: {
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 40,
    marginTop: Platform.OS === 'ios' ? -20 : -15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  articleTitle: {
    fontSize: Platform.OS === 'ios' ? 24 : 26,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 30 : 34,
  },

  // Meta Info
  metaInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.button[100],
    borderRadius: 4,
    marginRight: 6,
  },
  metaIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    tintColor: '#666',
  },
  metaText: {
    color: '#666',
    fontSize: Platform.OS === 'ios' ? 12 : 13,
    fontWeight: '400',
  },

  // Content Body
  contentBody: {
    paddingHorizontal: 20,
  },
  contentLead: {
    fontSize: Platform.OS === 'ios' ? 18 : 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    lineHeight: Platform.OS === 'ios' ? 24 : 28,
  },
  contentParagraph: {
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    color: '#333',
    lineHeight: Platform.OS === 'ios' ? 22 : 24,
    textAlign: 'justify',
  },
});
