import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  ImageBackground,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { formatDate } from '../../helpers/helpers';
import { widthPercentageToDP } from '../../constant/dimentions';
import { Colors, Images } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';

const { width } = Dimensions.get('window');

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

const ArticleScreen = ({ navigation }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  const [activeIndex, setActiveIndex] = useState(0);
  const viewRef = useRef<any>(null);
  const [sampleArticle, setsampleArticle] = React.useState<any[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<any[]>([]);
  const [justForYouModalVisible, setJustForYouModalVisible] = useState(false);
  const [trendingModalVisible, setTrendingModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { translatedText: searchPlaceholder } = useAutoTranslate('Search Articles....');
  const { translatedText: searchResultsText } = useAutoTranslate('Search Results');


  useEffect(() => {
    ArticleList();
  }, []);

  useEffect(() => {
    // Reset filtered articles when search query is empty
    if (!searchQuery.trim()) {
      setFilteredArticles([]);
      setIsSearching(false);
      return;
    }

    // Filter articles based on search query
    const filtered = sampleArticle.filter(article => {
      const query = searchQuery.toLowerCase().trim();
      return (
        article.title?.toLowerCase().includes(query) ||
        article.content?.toLowerCase().includes(query)
      );
    });

    setFilteredArticles(filtered);
    setIsSearching(true);
  }, [searchQuery, sampleArticle]);

  const ArticleList = async () => {
    try {
      showLoader();
      const res = await UserService.articles();
      hideLoader();
      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, data } = res.data;
        setsampleArticle(data || []);
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (err: any) {
      hideLoader();
      console.log('Error in EventList:', JSON.stringify(err));
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    }
  };

  const renderUpcoming = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={{ alignSelf: 'center', left: 7, paddingLeft: 5 }}
      onPress={() => {
        navigation.navigate('ArticleDetails', { article: item.id }),
          setTrendingModalVisible(false);
      }}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={{ uri: Image_url + item.image }}
        style={[styles.upCard, { width: width - 40 }]}
        imageStyle={{ borderRadius: 12, resizeMode: 'cover' }}
      >
        <View style={styles.upBadgeRow}>
          <View style={styles.readBadge}>
            <TransletText
              text={`Updated on ${formatDate(item.updated_at)}`}
              style={styles.readBadgeText}
            />

          </View>
        </View>
        <View style={styles.upTitleWrap}>
          <TransletText
            text={item.title}
            style={styles.upTitleWhite}
            numberOfLines={2}
          />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderNear = ({ item }: { item: any }) => (
    <>
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('ArticleDetails', { article: item.id }),
            setJustForYouModalVisible(false);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.nearCard}>
          <Image
            source={{ uri: Image_url + item.image }}
            style={styles.nearImage}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.nearBody}>
              <TransletText text={item.title} numberOfLines={2} style={styles.nearTitle} />
            </View>
            <TransletText text={item.content}
              numberOfLines={1.75}
              style={{ color: 'black', marginTop: 3, fontSize: 12 }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              <Image
                source={Images.clock_3}
                style={{ width: 15, height: 15, tintColor: Colors.button[100] }}
              />
              <TransletText
                text={getTimeAgo(item.updated_at)}
                style={styles.nearDate}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              <Image
                source={Images.views}
                tintColor={Colors.button[100]}
                style={{ width: 15, height: 15 }}
              />
              <Text style={styles.nearDate}>{item.views}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View
        style={{
          borderBottomColor: Colors.text[400],
          borderBottomWidth: 1,
          marginVertical: 10,
          width: '90%',
          alignSelf: 'center',
        }}
      />
    </>
  );

  // Function to clear search
  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  // Data to display based on search state
  const displayArticles = isSearching ? filteredArticles : sampleArticle;
  const displayJustForYouArticles = isSearching
    ? filteredArticles.slice(0, 3)
    : sampleArticle.slice(0, 3);

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
              source={require('../../assets/Png/back.png')}
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <TransletText text='Articles' style={styles.headerTitle} />
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder={searchPlaceholder || 'Search Articles....'}
            placeholderTextColor={Colors.text[200]}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.microphone}>
              <Image
                source={require('../../assets/Png/search.png')} // Add a clear icon
                style={[styles.iconSmall, { tintColor: '#fff' }]}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.microphone}>
              <Image
                source={require('../../assets/Png/search.png')}
                style={[styles.iconSmall, { tintColor: '#fff' }]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results Section */}
      {isSearching && (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsTitle}>
            {searchResultsText || 'Search Results'} ({filteredArticles.length})
          </Text>
          <TouchableOpacity onPress={clearSearch}>
            <TransletText text='Clear' style={styles.clearSearchText} />
          </TouchableOpacity>
        </View>
      )}

      {/* Just For You modal */}
      <Modal visible={justForYouModalVisible} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <TransletText text="Just For You" style={{ fontSize: 18, fontWeight: '700' }} />
              <TouchableOpacity
                onPress={() => setJustForYouModalVisible(false)}
              >
                <Text style={{ fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={isSearching ? filteredArticles : sampleArticle}
              keyExtractor={i => String(i.id)}
              renderItem={renderUpcoming}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <TransletText
                    text={isSearching ? 'No articles found' : 'No articles available'}
                    style={styles.emptyText}
                  />
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Trending modal */}
      <Modal visible={trendingModalVisible} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <TransletText text="Trending Articles" style={{ fontSize: 18, fontWeight: '700' }} />
              <TouchableOpacity onPress={() => setTrendingModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={isSearching ? filteredArticles : sampleArticle}
              keyExtractor={i => String(i.id)}
              renderItem={renderNear}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <TransletText
                    text={isSearching ? 'No articles found' : 'No articles available'}
                    style={styles.emptyText}
                  />
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Show search results if searching */}
        {isSearching ? (
          <View style={styles.searchResultsContainer}>
            {filteredArticles.length > 0 ? (
              <FlatList
                data={filteredArticles}
                keyExtractor={i => i.id}
                renderItem={renderNear}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                scrollEnabled={false}
                ListHeaderComponent={
                  <TransletText
                    text={`Found ${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''}`}
                    style={styles.resultsCount}
                  />
                }
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Image
                  source={require('../../assets/Png/search.png')} // Add a no results icon
                  style={styles.emptyIcon}
                />
                <TransletText text="No articles found" style={styles.emptyText} />
                <TransletText text="Try different keywords or check back later" style={styles.emptySubText} />
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Just For You Section - Only show when not searching */}
            <View style={styles.sectionHeader}>
              <TransletText text="Just For You" style={styles.sectionTitle} />
              <TouchableOpacity onPress={() => setJustForYouModalVisible(true)}>
                <TransletText text="View All" style={styles.seeMore} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10 }}>
              {displayJustForYouArticles.length > 0 ? (
                <>
                  <FlatList
                    ref={viewRef}
                    data={displayJustForYouArticles}
                    keyExtractor={i => i.id}
                    renderItem={renderUpcoming}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={ev => {
                      const newIndex = Math.round(
                        ev.nativeEvent.contentOffset.x / (width - 64 + 12),
                      );
                      if (!isNaN(newIndex)) setActiveIndex(newIndex);
                    }}
                  />

                  <View style={styles.dotsRow}>
                    {displayJustForYouArticles.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === activeIndex ? styles.dotActive : null,
                        ]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptySection}>
                  <TransletText text="No articles available" style={styles.emptySectionText} />
                </View>
              )}
            </View>

            {/* Trending Articles Section - Only show when not searching */}
            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <TransletText text="Trending Articles" style={styles.sectionTitle} />
              <TouchableOpacity onPress={() => setTrendingModalVisible(true)}>
                <TransletText text="View all" style={styles.seeMore} />
              </TouchableOpacity>
            </View>
            <View style={styles.trendingContainer}>
              {sampleArticle.length > 0 ? (
                <FlatList
                  data={sampleArticle.slice(0, 5)}
                  keyExtractor={i => i.id}
                  renderItem={renderNear}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptySection}>
                  <TransletText text="No trending articles" style={styles.emptySectionText} />
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ArticleScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#FFFFF',
    height: 160,
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
    tintColor: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 10,
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
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearSearchText: {
    color: Colors.button[100],
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 20,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 10,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.text[400],
    height: 180,
  },
  upImage: { width: '100%', height: 120, borderRadius: 10 },
  upBody: { padding: 10 },
  upTitle: { fontSize: 14, fontWeight: '700' },
  upMeta: { fontSize: 12, color: '#6B6B6B', marginTop: 6 },
  upSeats: { marginTop: 8, color: '#6B6B6B', fontWeight: '600' },
  upBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  readBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  readBadgeText: { fontSize: 12, color: '#6B6B6B', padding: 10 },
  bookmarkBtn: {
    backgroundColor: Colors.button[100],
    padding: 6,
    alignSelf: 'center',
    borderRadius: 20,
  },
  upTitleWrap: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  upTitleWhite: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dot: {
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: '#AEB254', width: 25, borderRadius: 4 },
  nearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
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
  nearBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  nearTitle: {
    fontSize: 14,
    fontWeight: '700',
    width: widthPercentageToDP(45),
  },
  nearMeta: { fontSize: 12, color: '#999', marginTop: 6 },
  nearDate: { fontSize: 12, color: '#999', marginLeft: 10 },
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
  trendingContainer: {
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'center',
    height: 'auto',
    borderWidth: 1,
    borderColor: Colors.text[400],
    borderRadius: 10,
    marginTop: 10,
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
    maxHeight: '80%',
    padding: 15,
  },
});