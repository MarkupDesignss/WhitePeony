import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image_url, UserService } from '../../service/ApiService';
import { Colors } from '../../constant';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import Voice from '@react-native-voice/voice';
import Toast from 'react-native-toast-message';
import { WishlistContext } from '../../context';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
const { width } = Dimensions.get('window');

const Searchpage = ({ navigation }: any) => {
  const { translatedText: searchPlace } =
    useAutoTranslate("Search for products, brands and more");
  const [query, setQuery] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const [wishlistLoadingMap, setWishlistLoadingMap] = useState<
    Record<string, boolean>
  >({});

  // Use WishlistContext
  const { wishlistIds, isWishlisted, toggleWishlist } =
    useContext(WishlistContext);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const silenceTimer = useRef<any>(null);
  const debounceTimer = useRef<any>(null);

  // Trending searches related to actual product categories
  const trendingSearches = [
    'Herbal Calm',
    'Detox Tea',
    'Golden Tea',
    'Jamine Green',
    'Organic Herbal',
    'Grey Classic',
  ];

  /* ---------------- VOICE EVENTS ---------------- */
  useEffect(() => {
    Voice.onSpeechStart = () => {
      setListening(true);
      Vibration.vibrate(50);
      startPulse();
      resetSilenceTimer();
    };

    Voice.onSpeechResults = e => {
      const text = e.value?.[0] || '';
      setQuery(text);
      resetSilenceTimer();
    };

    Voice.onSpeechEnd = stopListening;
    Voice.onSpeechError = stopListening;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  /* ---------------- MIC ANIMATION ---------------- */
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  /* ---------------- AUTO STOP ON SILENCE ---------------- */
  const resetSilenceTimer = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      stopListening();
    }, 2000);
  };

  const startVoice = async () => {
    try {
      await Voice.start('en-IN');
    } catch (e) {
      console.log('Voice start error', e);
      Toast.show({
        type: 'error',
        text1: 'Microphone Error',
        text2: 'Please check microphone permissions',
      });
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch { }

    setListening(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    if (silenceTimer.current) clearTimeout(silenceTimer.current);
  };

  /* ---------------- SEARCH API ---------------- */
  const GetSearch = useCallback(
    async (word: string) => {
      if (!word.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const res = await UserService.search(word);
        console.log("effe", res)
        if (res?.data?.status) {
          const products = Array.isArray(res.data.data) ? res.data.data : [];
          const mapped = products.map((p: any) => {
            const images = [p.front_image, p.back_image, p.side_image]
              .filter(Boolean)
              .map(img =>
                img.startsWith('http') ? img : `${Image_url}${img}`,
              );

            const variant = p.variants?.[0];
            const productId = String(p.id);

            // Check if product is in wishlist using context
            const isWishlistedItem = isWishlisted(productId);

            return {
              ID: p.id,
              name: p.name,
              images,
              price:
                variant?.actual_price ?? variant?.price ?? p.main_price ?? '0',
              unit: variant?.unit ?? '',
              brand: p.brand || 'Brand',
              discount: variant?.discount || 0,
              is_wishlist: isWishlistedItem,
              productData: p, // Store original product data for navigation
            };
          });
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.log('Search error:', error);
        setSearchResults([]);
        Toast.show({
          type: 'error',
          text1: 'Search Failed',
          text2: 'Please try again',
        });
      } finally {
        setIsSearching(false);
      }
    },
    [isWishlisted],
  );

  /* ---------------- DEBOUNCE INPUT CHANGE ---------------- */
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      GetSearch(query.trim());
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, GetSearch]);

  const handleManualSearch = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    GetSearch(query.trim());
  };

  /* ---------------- HANDLE WISHLIST TOGGLE ---------------- */
  const handleToggleWishlist = async (item: any) => {
    const productId = String(item.ID || item.id);

    // Set loading state for this specific product
    setWishlistLoadingMap(prev => ({ ...prev, [productId]: true }));

    try {
      // Use the context's toggleWishlist function
      await toggleWishlist(productId);

      // Update local state to reflect the change
      setSearchResults(prev =>
        prev.map(p =>
          String(p.ID) === productId
            ? { ...p, is_wishlist: !p.is_wishlist }
            : p,
        ),
      );
    } catch (error: any) {
      console.log('Wishlist toggle error:', error);
      // The context already shows error toast
    } finally {
      // Clear loading state for this product
      setWishlistLoadingMap(prev => ({ ...prev, [productId]: false }));
    }
  };

  /* ---------------- NAVIGATE TO PRODUCT DETAILS ---------------- */
  const navigateToProductDetails = (item: any) => {
    navigation.navigate('ProductDetails', {
      productId: item.ID,
      productData: item.productData || item, // Pass product data for immediate display
    });
  };

  /* ---------------- RENDER PRODUCT ITEM ---------------- */
  const renderItem = ({ item, index }: any) => {
    const productId = String(item.ID);
    const isWishlistedItem = isWishlisted(productId);
    const isLoading = wishlistLoadingMap[productId] || false;

    return (
      <TouchableOpacity
        style={[styles.card, { marginRight: index % 2 === 0 ? 8 : 0 }]}
        onPress={() => navigateToProductDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image
            source={
              item.images?.[0]
                ? { uri: item.images[0] }
                : require('../../assets/Png/peony_logo.png')
            }
            style={styles.cardImage}
            resizeMode="cover"
          />
          {item.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discount}% OFF</Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.wishlistButton,
              isLoading && styles.wishlistButtonDisabled,
            ]}
            onPress={e => {
              e.stopPropagation(); // Prevent card press
              handleToggleWishlist(item);
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#AEB254" />
            ) : (
              <Image
                source={
                  isWishlistedItem
                    ? require('../../assets/heart.png') // Filled heart
                    : require('../../assets/Png/heart-1.png') // Outline heart
                }
                style={[
                  styles.wishlistIcon,
                  isWishlistedItem && styles.wishlistIconActive,
                ]}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.brandName} numberOfLines={1}>
            {item.brand}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.cardPrice}>
              €{item.price}
              {item.unit && <Text style={styles.unitText}> / {item.unit}</Text>}
            </Text>
            {item.discount > 0 && (
              <Text style={styles.originalPrice}>
                €
                {(
                  (parseFloat(item.price) * 100) /
                  (100 - item.discount)
                ).toFixed(2)}
              </Text>
            )}
          </View>

          {item.discount > 0 && (
            <Text style={styles.discountTag}>
              Save €
              {((parseFloat(item.price) * item.discount) / 100).toFixed(2)}
            </Text>
          )}

          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={e => {
              e.stopPropagation(); // Prevent card press
              navigateToProductDetails(item);
            }}
          >
            <Text style={styles.addToCartText}>GET DETAILS</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- RENDER TRENDING SEARCH ITEMS ---------------- */
  const renderTrendingSearch = (tag: string, index: number) => (
    <TouchableOpacity
      key={`${tag}-${index}`}
      style={styles.trendingTag}
      onPress={() => {
        setQuery(tag);
        // Trigger search immediately
        setTimeout(() => {
          GetSearch(tag);
        }, 100);
      }}
    >
      <Image
        source={require('../../assets/Png/search.png')}
        style={styles.trendingTagIcon}
      />
      <TransletText style={styles.trendingTagText} text={tag} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../assets/Png/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/peony_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Image
            source={require('../../assets/Searchx.png')}
            style={styles.searchIcon}
          />

          <TextInput
            placeholder={searchPlace}
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />

          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}

          <View style={styles.separator} />

          <TouchableOpacity
            onPressIn={startVoice}
            onPressOut={stopListening}
            style={styles.voiceButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.Image
              source={require('../../assets/micx.png')}
              style={[
                styles.voiceIcon,
                {
                  transform: [{ scale: pulseAnim }],
                  tintColor: listening ? Colors.button[100] : '#666',
                },
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* RESULTS */}
      <View style={styles.resultsContainer}>
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.button[100]} />
            <Text style={styles.loadingText}>Searching products...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderItem}
            keyExtractor={(item, i) => `${item.ID}-${i}`}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        ) : query ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../../assets/noproduct.png')}
              style={styles.emptyImage}
            />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with different keywords
            </Text>
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try these instead:</Text>
              <View style={styles.suggestionsList}>
                {trendingSearches.slice(0, 5).map((tag, index) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.suggestionTag}
                    onPress={() => {
                      setQuery(tag);
                      GetSearch(tag);
                    }}
                  >
                    <Text style={styles.suggestionTagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.initialContainer}>
            <Image
              source={require('../../assets/search_illustration.png')}
              style={styles.initialImage}
            />
            <TransletText style={styles.initialTitle} text="What are you looking for?" />
            <TransletText style={styles.initialSubtitle}
              text="Type or use voice search to find products" />
            <View style={styles.trendingContainer}>
              <TransletText style={styles.trendingTitle} text="Trending Searches" />
              <View style={styles.trendingTags}>
                {trendingSearches.map(renderTrendingSearch)}
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Searchpage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#000',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 25,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  cartButton: {
    position: 'relative',
  },
  cartIcon: {
    width: 24,
    height: 24,
    tintColor: '#000',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.button[100],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    width: 18,
    height: 18,
    tintColor: '#666',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '300',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  voiceButton: {
    padding: 4,
  },
  voiceIcon: {
    width: 20,
    height: 20,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
    maxWidth: (width - 40) / 2,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#F8F8F8',
  },
  cardImage: {
    width: '100%',
    height: width * 0.4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.button[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  wishlistIcon: {
    width: 16,
    height: 16,
    tintColor: '#666',
  },
  wishlistIconActive: {
    tintColor: '#AEB254',
  },
  cardBody: {
    padding: 12,
  },
  brandName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '400',
    lineHeight: 18,
    height: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
    marginRight: 6,
  },
  unitText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'normal',
  },
  originalPrice: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  discountTag: {
    fontSize: 12,
    color: Colors.button[100],
    fontWeight: '500',
    marginBottom: 8,
  },
  addToCartButton: {
    backgroundColor: Colors.button[100],
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  addToCartText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  suggestionTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  suggestionTagText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  initialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  initialImage: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  initialTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  initialSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  trendingContainer: {
    width: '100%',
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trendingTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  trendingTagIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    tintColor: Colors.button[100],
  },
  trendingTagText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
