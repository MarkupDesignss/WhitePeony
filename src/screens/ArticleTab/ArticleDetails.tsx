import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../helpers/helpers';
import { Colors, Images } from '../../constant';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';
import Share from 'react-native-share';

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
const IMAGE_HEIGHT = Platform.OS === 'ios' ? height * 0.4 : height * 0.38;

const ArticleDetailsScreen = ({ navigation, route }: any) => {
  // Get the article slug from params
  const slug = route?.params?.slug || route?.params?.article || '';

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showLoader, hideLoader } = CommonLoader();

  // Define types based on API response
  type Author = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
  };

  type GalleryImage = {
    id: number;
    article_id: string;
    image_path: string;
    sort_order: string;
    created_at: string;
    updated_at: string;
  };

  type ArticleContent = {
    id?: number;
    author_id?: string;
    title?: string;
    slug?: string;
    content?: string;
    image?: string;
    views?: string;
    created_at?: string;
    updated_at?: string;
    is_trending?: boolean;
    share_url?: string;
    author?: Author;
    images?: GalleryImage[];
  };

  const [contentData, setContentData] = useState<ArticleContent | null>(null);

  useEffect(() => {
    console.log('Route params:', route?.params);
    console.log('Article slug:', slug);

    if (slug) {
      loadArticleContent(slug);
    } else {
      console.log('No article slug provided');
      setError('No article slug provided');
      Toast.show({
        type: 'error',
        text1: 'No article slug provided',
      });
    }
  }, [slug]);

  const loadArticleContent = async (articleSlug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      showLoader();
      console.log('Fetching article with slug:', articleSlug);

      const response = await UserService.articleDetail(articleSlug);
      console.log('Full API Response:', JSON.stringify(response, null, 2));

      hideLoader();
      setIsLoading(false);

      // Check if response exists and is successful
      if (response?.status === HttpStatusCode.Ok) {
        // The response structure from your API
        if (response.data?.data) {
          console.log('Article data found in response.data.data');
          const articleData = response.data.data;
          console.log('Article title:', articleData.title);
          console.log('Article content length:', articleData.content?.length);
          console.log('Has images:', articleData.images?.length || 0);
          console.log('Has author:', articleData.author ? 'Yes' : 'No');
          console.log('Share URL:', articleData.share_url);

          setContentData(articleData);
        }
        // If data is directly in response.data (alternative structure)
        else if (response.data && typeof response.data === 'object') {
          console.log('Article data found in response.data directly');
          console.log('Article title:', response.data.title);
          console.log('Share URL:', response.data.share_url);

          setContentData(response.data);
        } else {
          console.log('No valid data structure found in response');
          setError('Invalid response structure');
          Toast.show({
            type: 'error',
            text1: 'Invalid response structure',
          });
        }
      } else {
        console.log('Response status not OK:', response?.status);
        setError(`API Error: ${response?.status}`);
        Toast.show({
          type: 'error',
          text1: response?.data?.message || 'Something went wrong!',
        });
      }
    } catch (error: any) {
      hideLoader();
      setIsLoading(false);
      console.log('Error in loadArticleContent:', error);
      console.log('Error message:', error.message);
      console.log('Error response:', error.response?.data);

      setError(error?.message || 'Failed to load article');

      Toast.show({
        type: 'error',
        text1:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to load article',
      });
    }
  };

  // Construct image source
  const getImageSource = (imagePath?: string) => {
    if (!imagePath) return Images.placeholder;

    // Check if it's already a full URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return { uri: imagePath };
    }

    // If it's a relative path, combine with base URL
    const cleanPath = imagePath.replace(/^\//, '');
    const fullUrl = `${Image_url}${cleanPath}`;
    console.log('Constructed image URL:', fullUrl);
    return { uri: fullUrl };
  };

  // Get all images
  const fetchAllImages = () => {
    const imagesList = [];

    // Add main image if exists
    if (contentData?.image) {
      imagesList.push({
        id: 'main',
        source: getImageSource(contentData.image),
        isMain: true,
        sortOrder: -1, // Main image first
      });
    }

    // Add gallery images if they exist
    if (contentData?.images && contentData.images.length > 0) {
      contentData.images.forEach(img => {
        imagesList.push({
          id: img.id,
          source: getImageSource(img.image_path),
          sortOrder: parseInt(img.sort_order || '0'),
        });
      });
    }

    // Sort images by sort_order
    const sortedImages = imagesList.sort((a, b) => {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    console.log('Total images to display:', sortedImages.length);
    return sortedImages;
  };

  const allImages = fetchAllImages();

  // Generate share URL helper
  const generateShareUrl = () => {
    // Use the API provided share_url first
    if (contentData?.share_url) {
      return contentData.share_url;
    }

    // Fallback to constructing URL if share_url is not available
    return `https://www.markupdesigns.net/whitepeony/article/${
      contentData?.slug || contentData?.id
    }`;
  };

  // Share article
  const shareArticle = async () => {
    try {
      // Use share_url directly from the API response
      const shareUrl = generateShareUrl();

      if (!shareUrl) {
        Toast.show({
          type: 'error',
          text1: 'Share URL not available',
        });
        return;
      }

      await Share.open({
        url: shareUrl,
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Failed to share article',
        });
      }
    }
  };

  // Share to social platform
  const shareToSocialPlatform = async (social: keyof typeof Share.Social) => {
    try {
      showLoader();

      const shareUrl = generateShareUrl();
      const title = contentData?.title || 'Article';

      const shareOptions = {
        title: 'Share Article',
        message: title,
        url: shareUrl,
        social: Share.Social[social],
        failOnCancel: false,
      };

      await Share.shareSingle(shareOptions);
      hideLoader();
    } catch (error: any) {
      hideLoader();
      if (error.message !== 'User did not share') {
        console.warn(`Share to ${social} error:`, error);

        if (error.message?.includes('not installed')) {
          Alert.alert(
            'App Not Installed',
            `Would you like to share via web instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Share via Web',
                onPress: () => openWebShareLink(social, generateShareUrl()),
              },
            ],
          );
        } else {
          Toast.show({
            type: 'error',
            text1: `Failed to share to ${social}`,
          });
        }
      }
    }
  };

  // Open web share link
  const openWebShareLink = (social: string, url: string) => {
    let webUrl = '';
    const encodedUrl = encodeURIComponent(url);
    const text = encodeURIComponent(contentData?.title || 'Check this out');

    switch (social) {
      case 'FACEBOOK':
        webUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'TWITTER':
        webUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
        break;
      case 'WHATSAPP':
        webUrl = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`;
        break;
      case 'TELEGRAM':
        webUrl = `https://t.me/share/url?url=${encodedUrl}&text=${text}`;
        break;
      case 'LINKEDIN':
        webUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      default:
        return;
    }

    Linking.openURL(webUrl).catch(err => {
      console.warn('Could not open web share:', err);
      Toast.show({
        type: 'error',
        text1: 'Could not open sharing page',
      });
    });
  };

  // Show share options
  const displayShareOptions = () => {
    Alert.alert(
      'Share Article',
      'Choose how you want to share',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share via...', onPress: shareArticle },
        { text: 'WhatsApp', onPress: () => shareToSocialPlatform('WHATSAPP') },
        { text: 'Facebook', onPress: () => shareToSocialPlatform('FACEBOOK') },
        { text: 'Twitter', onPress: () => shareToSocialPlatform('TWITTER') },
        { text: 'Telegram', onPress: () => shareToSocialPlatform('TELEGRAM') },
        { text: 'Email', onPress: () => shareToSocialPlatform('EMAIL') },
      ],
      { cancelable: true },
    );
  };

  const renderGalleryItem = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.carouselItem, { width }]}>
      <Image
        source={item.source}
        style={[styles.headerImage, { height: IMAGE_HEIGHT }]}
        resizeMode="cover"
        onError={error =>
          console.log('Image loading error:', error.nativeEvent.error)
        }
      />
    </View>
  );

  const handleImageScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentImageIndex(index);
  };

  const renderPaginationDots = () => {
    if (allImages.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {allImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderImageCount = () => {
    if (allImages.length <= 1) return null;

    return (
      <View style={styles.imageCounter}>
        <Text style={styles.imageCounterText}>
          {currentImageIndex + 1} / {allImages.length}
        </Text>
      </View>
    );
  };

  // Custom Header Component
  const renderCustomHeader = () => (
    <View
      style={[
        styles.headerContainer,
        {
          height: HEADER_HEIGHT + insets.top,
          paddingTop: insets.top,
          backgroundColor: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
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
            style={[styles.backIcon, { tintColor: '#fff' }]}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          {/* Empty view for spacing */}
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={displayShareOptions}
        >
          <Image
            source={require('../../assets/Png/share.png')}
            style={[styles.shareIcon, { tintColor: '#fff' }]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        {renderCustomHeader()}
        <View style={styles.loadingContainer}>
          <Text>Loading article...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        {renderCustomHeader()}
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadArticleContent(slug)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No data state
  if (!contentData) {
    return (
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        {renderCustomHeader()}
        <View style={styles.loadingContainer}>
          <Text>No article data available</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadArticleContent(slug)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {renderCustomHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Carousel Section */}
        <View style={styles.carouselContainer}>
          {allImages.length > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={allImages}
                renderItem={renderGalleryItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleImageScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                bounces={false}
              />
              {renderPaginationDots()}
              {renderImageCount()}
            </>
          ) : (
            <View
              style={[
                styles.headerImage,
                {
                  height: IMAGE_HEIGHT,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Image
                source={Images.placeholder}
                style={styles.headerImage}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleWrapper}>
            <TransletText
              text={contentData?.title || 'Article Title'}
              style={styles.articleTitle}
              numberOfLines={3}
            />
          </View>

          <View style={styles.metaInfoRow}>
            <View style={styles.metaItem}>
              <View style={styles.statusDot} />
              <TransletText
                text={getTimeAgo(contentData?.created_at) || 'Just now'}
                style={styles.metaText}
              />
            </View>

            <View style={styles.metaItem}>
              <Image source={Images.date} style={styles.metaIcon} />
              <TransletText
                text={
                  contentData?.created_at
                    ? formatDate(contentData.created_at)?.slice(0, -9)
                    : ''
                }
                style={styles.metaText}
              />
            </View>

            <View style={styles.metaItem}>
              <Image source={Images.views} style={styles.metaIcon} />
              <TransletText
                text={`${contentData?.views || 0} views`}
                style={styles.metaText}
              />
            </View>
          </View>

          {/* Author information */}
          {contentData?.author && (
            <View style={styles.authorContainer}>
              <Text style={styles.authorText}>
                By: {contentData.author.name}
              </Text>
            </View>
          )}

          <View style={styles.contentBody}>
            <TransletText
              text={contentData?.title || 'Article Title'}
              style={styles.contentLead}
            />
            <TransletText
              text={contentData?.content || 'No content available.'}
              style={styles.contentParagraph}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ArticleDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.button[100],
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Styles - Transparent overlay
  headerContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  shareIcon: {
    width: 20,
    height: 20,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Carousel Container
  carouselContainer: {
    width: '100%',
    position: 'relative',
  },
  carouselItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },

  // Pagination Dots
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#fff',
  },

  // Image Counter
  imageCounter: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Content Section
  contentContainer: {
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 40,
    marginTop: Platform.OS === 'ios' ? -20 : -15,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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

  // Author Container
  authorContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  authorText: {
    fontSize: 14,
    color: Colors.button[100],
    fontWeight: '500',
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
