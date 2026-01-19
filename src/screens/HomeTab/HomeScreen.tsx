import { HttpStatusCode } from 'axios';
import React, { useRef, useEffect, useState, useContext, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  ImageBackground,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import Toast from 'react-native-toast-message';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { WishlistContext } from '../../context/wishlistContext';
import LoginModal from '../../components/LoginModal';
import { Colors, Fonts } from '../../constant';
const { width } = Dimensions.get('window');


type DisplayWishlistItem = {
  id: string; // product id
  wishlistItemId: string;
  name: string;
  price: string;
  image: string | null;
};



// Small product image carousel used inside product cards
const ProductImageCarousel = ({ images }: { images: any[] }) => {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (index + 1) % images.length;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIndex(next);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const current = images && images.length ? images[index] : null;
  const source = typeof current === 'string' ? { uri: current } : current;

  return (
    <Animated.View style={{ opacity }}>
      {source ? (
        <Image source={source} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: '#eee' }]} />
      )}
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }: any) => {
  const bannerRef = useRef<any>(null);
  const [sellingProducts, setsellingProducts] = useState<any[]>();
  const [apiRecommend, setApiRecommend] = useState<any[]>();
  const [category, setApiCateProducts] = useState([]);
  const { showLoader, hideLoader } = CommonLoader();
  const { setUserData, isLoggedIn } = useContext<UserData>(UserDataContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [headerSimple, setheaderSimple] = useState<any[]>([]);
  const [Promotional, setPromotional] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const smallItems = [
    {
      id: 9,
      title: 'Gifts & Presents',
      slug: 'Gifts and Presents',
      image: require('../../assets/Png/banner.png'),
    },
    {
      id: 11,
      title: 'Tea Sets',
      slug: 'Organic and Bio tea',
      image: require('../../assets/Png/product.png'),
    },
    {
      id: 10,
      title: 'Accessories',
      slug: 'Accessories',
      image: require('../../assets/Png/product.png'),
    },
  ];

  const [activeSmallIndex, setActiveSmallIndex] = useState(0);
  const [indexs, setIndex] = useState(0);
  const smallListRef = useRef<any>(null);
  const animatedValues = useRef(
    smallItems.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    RecommendProducts();
    sellingproduct();
    GetCategoryProducts();
    Profile();
    GetHeader();
  }, []);

  const Profile = async () => {
    try {
      showLoader();
      const res = await UserService.profile();
      const GetProfile = res?.data?.user || {};
      setUserData(GetProfile);
      //console.log("userprofile", GetProfile)
    } catch (e) {
      hideLoader();
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      }
      else {
        console.log('Profile fetch error:', JSON.stringify(e));
        // Toast.show({ type: 'error', text1: 'Failed to load profile' });
      }
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    Animated.timing(animatedValues[0], {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    const timer = setInterval(
      () => setActiveSmallIndex(prev => (prev + 1) % smallItems.length),
      3500,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    animatedValues.forEach((av, i) =>
      Animated.timing(av, {
        toValue: i === activeSmallIndex ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start(),
    );
    try {
      if (smallListRef.current?.scrollToIndex)
        smallListRef.current.scrollToIndex({
          index: activeSmallIndex,
          viewPosition: 0.5,
        });
    } catch (e) { }
  }, [activeSmallIndex]);

  const sellingproduct = async () => {
    try {
      showLoader();
      const res = await UserService.mostsellingproduct();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.data || [];
        setsellingProducts(fetchedProducts);
        //console.log("sellingproduct", fetchedProducts)
      } else {
        console.log("sellingerror", res?.data)
        // handle non-OK response if needed
      }
    } catch (err) {
      console.log("sellingerror", err)
      // handle network/error
    } finally {
      hideLoader();
    }
  };

  const RecommendProducts = async () => {
    try {
      showLoader();
      const res = await UserService.recommended();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.data || [];
        setApiRecommend(fetchedProducts);
        // console.log("recommenderror", res.data?.data)
      } else {
        console.log("recommenderror", res?.data)
        // handle non-OK response if needed
      }
    } catch (err) {
      console.log("recommenderror", err)
      // handle network/error
    } finally {
      hideLoader();
    }
  };

  const GetHeader = async () => {
    try {
      showLoader();
      const res = await UserService.header();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const banners = res.data?.banners || [];

        const simpleBanners = banners.filter((item: any) => item.type === 'simple');
        const promotionalBanners = banners.filter((item: any) => item.type === 'promotional');

        const mappedSimple = simpleBanners.map((item: any) => ({
          ...item,
          image_url: Image_url + item.image_url,
        }));

        const mappedPromotional = promotionalBanners.map((item: any) => ({
          ...item,
          image_url: Image_url + item.image_url,
        }));
        setheaderSimple(mappedSimple)
        setPromotional(mappedPromotional)
      } else {
        // handle non-OK response if needed
      }
    } catch (err) {
      // handle network/error
    } finally {
      hideLoader();
    }
  };

  const GetCategoryProducts = async () => {
    try {
      showLoader();
      const res = await UserService.GetCategory();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.categories || [];
        setApiCateProducts(fetchedProducts);
      } else {
        // handle non-OK response if needed
      }
    } catch (err) {
      // handle network/error
    } finally {
      hideLoader();
    }
  };

  // Flexible search implementation (debounced)
  const GetSearch = useCallback(async (word: string) => {
    try {
      setIsSearching(true);
      // local spinner only
      const res = await UserService.search(word);
      if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
        //console.log("searching", res?.data?.data?.products)
        const dataRaw = Array.isArray(res.data?.data?.products) ? res.data?.data?.products : (res.data?.data?.products ?? res.data?.data?.products);
        const list = Array.isArray(dataRaw) ? dataRaw : [];
        const baseUrl = res?.data?.base_url || Image_url || '';
        const mapped = list.map((p: any) => {
          const images = [p.front_image, p.back_image, p.side_image]
            .filter(Boolean)
            .map((img: string) => (img.startsWith('http') ? img : `${baseUrl}${img}`));
          const variant = p.variants && p.variants.length ? p.variants[0] : null;
          const price = variant?.price || p.main_price || p.price || '0';
          const unit = variant?.unit || p.unit || '';
          return { ...p, images, price, unit };
        });
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.log('errrsearch', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      GetSearch(trimmed);
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  const { toggleWishlist, isWishlisted, removeFromWishlist } = React.useContext(WishlistContext);

  const renderProduct = ({ item }: { item: any }) => {
    //console.log('Rendering product:', isWishlisted(item.id));
    const wished = isWishlisted(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ProductDetails', { productId: item.id })
        }
        activeOpacity={0.8}
      >
        <View style={{ position: 'relative' }}>
          <ProductImageCarousel
            images={item.images || [require('../../assets/Png/product.png')]}
          />
          <TouchableOpacity
            onPress={async () => {
              if (wished) {
                // Remove from wishlist
                try {
                  toggleWishlist(item.id); // update local state immediately
                  if (isLoggedIn) {
                    showLoader();
                    const res = await UserService.wishlistDelete(item.id);
                    if (res?.status === HttpStatusCode.Ok) {
                      await removeFromWishlist(item.id);
                      Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                    } else {
                      Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                    }
                    hideLoader();
                  } else {
                    removeFromWishlist(item.id);
                    Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                  }
                } catch (err) {
                  hideLoader();
                  console.log('Wishlist remove error:', err);
                  Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                }
              } else {
                // Add to wishlist
                try {
                  toggleWishlist(item.id); // update local state immediately
                  if (!isLoggedIn) {
                    Toast.show({ type: 'success', text1: 'Added to wishlist' });
                    return;
                  }
                } catch (err) {
                  hideLoader();
                  console.log('Wishlist add error:', err);
                  Toast.show({ type: 'error', text1: 'Failed to add to wishlist' });
                }
              }
            }}
            activeOpacity={0.7}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: Colors.button[100],
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              top: 10,
              right: 10
            }}
          >
            <Image
              source={wished ? require('../../assets/Png/heart1.png') : require('../../assets/Png/heart-1.png')}
              style={{ position: 'absolute', width: 15, height: 15, alignSelf: 'center' }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item?.name || item?.title}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((r) => {
              const isFull = item?.average_rating >= r;
              const isHalf = item?.average_rating >= r - 0.5 && item?.average_rating < r;
              return (
                <View key={r} style={{ width: 18, height: 18, position: 'relative' }}>
                  {/* base gray star */}
                  <Text style={{ color: '#ccc', fontSize: 18, position: 'absolute' }}>★</Text>
                  {/* overlay half or full star */}
                  <View
                    style={{
                      width: isFull ? '100%' : isHalf ? '50%' : '0%',
                      overflow: 'hidden',
                      position: 'absolute',
                    }}
                  >
                    <Text style={{ color: '#F0C419', fontSize: 18 }}>★</Text>
                  </View>
                </View>
              )
            })}
          </View>
          <Text style={styles.cardPrice}>
            {Array.isArray(item.variants) && item.variants.length > 0 && (
              <>
                {Math.round(item.variants[0]?.price)} € {item.variants[0]?.unit ? `- ${item.variants[0]?.unit}` : ''}
              </>
            )}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const BestProduct = ({ item }: { item: any }) => {
    //console.log('Rendering product:', item);
    const wished = isWishlisted(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ProductDetails', { productId: item.id })
        }
        activeOpacity={0.8}
      >
        <View style={{ position: 'relative' }}>
          <ProductImageCarousel
            images={item.images || [require('../../assets/Png/product.png')]}
          />
          <TouchableOpacity
            onPress={async () => {
              if (wished) {
                // Remove from wishlist
                try {
                  toggleWishlist(item.id); // update local state immediately
                  if (isLoggedIn) {
                    showLoader();
                    const res = await UserService.wishlistDelete(item.id);
                    if (res?.status === HttpStatusCode.Ok) {
                      await removeFromWishlist(item.id);
                      Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                    } else {
                      Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                    }
                    hideLoader();
                  } else {
                    removeFromWishlist(item.id);
                    Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                  }
                } catch (err) {
                  hideLoader();
                  console.log('Wishlist remove error:', err);
                  Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                }
              } else {
                // Add to wishlist
                try {
                  toggleWishlist(item.id); // update local state immediately
                  if (!isLoggedIn) {
                    Toast.show({ type: 'success', text1: 'Added to wishlist' });
                    return;
                  }
                } catch (err) {
                  hideLoader();
                  console.log('Wishlist add error:', err);
                  Toast.show({ type: 'error', text1: 'Failed to add to wishlist' });
                }
              }
            }}
            activeOpacity={0.7}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: Colors.button[100],
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              top: 10,
              right: 10
            }}
          >
            <Image
              source={wished ? require('../../assets/Png/heart1.png') : require('../../assets/Png/heart-1.png')}
              style={{ position: 'absolute', width: 15, height: 15, alignSelf: 'center' }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item?.name || item?.title}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((r) => {
              const isFull = item?.average_rating >= r;
              const isHalf = item?.average_rating >= r - 0.5 && item?.average_rating < r;
              return (
                <View key={r} style={{ width: 18, height: 18, position: 'relative' }}>
                  {/* base gray star */}
                  <Text style={{ color: '#ccc', fontSize: 18, position: 'absolute' }}>★</Text>
                  {/* overlay half or full star */}
                  <View
                    style={{
                      width: isFull ? '100%' : isHalf ? '50%' : '0%',
                      overflow: 'hidden',
                      position: 'absolute',
                    }}
                  >
                    <Text style={{ color: '#F0C419', fontSize: 18 }}>★</Text>
                  </View>
                </View>
              )
            })}
          </View>
          <Text style={styles.cardPrice}>
            {Array.isArray(item.variants) && item.variants.length > 0 && (
              <>
                {Math.round(item.variants[0]?.price)} € {item.variants[0]?.unit ? `- ${item.variants[0]?.unit}` : ''}
              </>
            )}
          </Text>

        </View>
      </TouchableOpacity>
    );
  };

  const renderProductCate = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CategoryDetailsList', { categoryId: item.id, categoryTitle: item.name })}
      style={{
        width: 'auto',
        height: 32,
        backgroundColor: indexs === index ? Colors.button[100] : '#FFF',
        borderRadius: 16,
        alignItems: 'center',
        paddingHorizontal: 10,
        justifyContent: 'center',
        marginHorizontal: 0,
        marginLeft: 12,
      }}
    // onPress={() => setIndex(index)}
    >
      <View>
        <Text style={{ color: indexs === index ? '#000' : '#B4B4B4', fontFamily: Fonts.Redhat_Medium }}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const PromotionalBanner: React.FC<{ promotional: any[] }> = ({ promotional = [] as any[] }) => {
    if (!promotional.length) return null;

    return (
      <View style={{ marginVertical: 12 }}>

        {promotional.map((item: any, index: number) => (
          <View key={String(index)} style={styles.page}>
            <ImageBackground
              source={{ uri: item.image_url }}
              style={styles.imageBackground}
              resizeMode='cover'
            >
              <View style={{ position: 'absolute', top: '10%', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 }}>
                <Text style={styles.title}>WHITE PEONY TEA CO</Text>
                <Text style={styles.subtitle}>
                  Best Organic Tea Delivered Worldwide
                </Text>

                {/* <TouchableOpacity style={styles.button}>
                  <Text style={styles.buttonText}>Shop Now</Text>
                </TouchableOpacity> */}
              </View>
            </ImageBackground>
          </View>
        ))}

      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' />
      <View style={{ backgroundColor: '#FFF', }}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/Png/headerLogo.png')}
            style={{ width: 140, height: 22, backgroundColor: 'transparent' }}
          />
          <TouchableOpacity style={styles.iconBtn} onPress={() => { isLoggedIn ? navigation.navigate('CheckoutScreen') : setModalVisible(true) }}>
            <Image
              source={require('../../assets/Png/order.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={Colors.text[200]}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => searchQuery.trim() && GetSearch(searchQuery.trim())}
          />
          {isSearching ? (
            <ActivityIndicator style={{ marginLeft: 8 }} size="small" color="#2DA3C7" />
          ) : searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={{ marginLeft: 8 }}>
              <Text style={{ fontSize: 16 }}>✕</Text>
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

        <FlatList
          data={category}
          keyExtractor={i => i.id}
          renderItem={renderProductCate}
          showsHorizontalScrollIndicator={false}
          horizontal={true}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20, marginTop: 12 }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={bannerRef}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          {headerSimple.map((item: any, index: number) => (
            <Image
              key={String(index)}
              source={{ uri: item.image_url }}
              style={[styles.banner, { width: width - 32 }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 12,
            marginVertical: 20,
          }}
        >
          <Text style={styles.sectionTitle}>Best Sale Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CategoryDetailsList', { mode: 'Best Sale', categoryTitle: 'Best Sale Products' })}>
            <Text style={{ color: '#AEB254', fontSize: 15 }}>See More</Text>
          </TouchableOpacity>
        </View>


        <FlatList
          data={searchQuery.trim() ? searchResults : sellingProducts}
          keyExtractor={i => i.id}
          renderItem={BestProduct}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={() =>
            searchQuery.trim() ? (
              <View style={{ padding: 20 }}>
                <Text style={{ color: '#666' }}>No results for "{searchQuery}"</Text>
              </View>
            ) : null
          }
        />


        <PromotionalBanner promotional={Promotional} />

        <View style={{ backgroundColor: '#FFF', paddingVertical: 12 }}>
          <Animated.FlatList
            ref={smallListRef}
            data={smallItems}
            keyExtractor={i => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              marginHorizontal: 12,
              alignItems: 'center',
            }}
            renderItem={({ item, index }) => {
              const anim = animatedValues[index];
              const widthAnim = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [72, 169],
              });
              const opacity = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });
              return (
                <TouchableOpacity onPress={() => navigation.navigate('CategoryDetailsList', { categoryId: item.id, categoryTitle: item.slug })} >
                  <Animated.View
                    style={{
                      width: widthAnim,
                      height: 82,
                      marginRight: 10,
                      borderRadius: 8,
                      overflow: 'hidden',
                      zIndex: index === activeSmallIndex ? 2 : 1,
                      elevation: index === activeSmallIndex ? 4 : 0,
                    }}
                  >
                    <Image source={item.image} style={styles.smallImage} />
                    <Animated.View style={[styles.smallOverlay, { opacity }]}>
                      <Text style={styles.smallOverlayText}>{item.title}</Text>
                    </Animated.View>
                  </Animated.View>
                </TouchableOpacity>
              );
            }}
          />

          <LoginModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onGoogleLogin={() => Alert.alert("Google Login")}
            onFacebookLogin={() => Alert.alert("Facebook Login")}
            phoneNumber="email or phone number"
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,
              marginVertical: 15,
            }}
          >
            <Text style={styles.sectionTitle}>Recomended For You</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CategoryDetailsList', { mode: 'recommended', categoryTitle: 'Recommended For You' })}>
              <Text style={{ color: '#AEB254', fontSize: 15 }}>See More</Text>
            </TouchableOpacity>
          </View>


          <FlatList
            data={apiRecommend}
            keyExtractor={i => i.id}
            renderItem={renderProduct}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
          />

        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', marginTop: StatusBar.currentHeight },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginVertical: 15,
    height: '6%',
    paddingTop: 10
  },
  appTitle: { fontSize: 20, fontWeight: '700', color: '#0b3b2e' },
  headerRight: { flexDirection: 'row' },
  iconBtn: { position: 'absolute', right: 20 },
  icon: { width: 20, height: 20, tintColor: undefined },
  iconSmall: { width: 14, height: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    marginTop: '3%',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
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
  bannerScroll: { paddingLeft: 16, paddingRight: 16, marginBottom: 16, },
  banner: { height: 174, borderRadius: 12, marginRight: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  imageBackground: {
    width: '100%',
    height: 520,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    color: '#338AB1',
    marginTop: 0,
    fontWeight: '600',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 22,
    color: '#000000',
    marginTop: 10,
    fontWeight: '400',
  },
  button: {
    width: '40%',
    alignSelf: 'center',
    backgroundColor: '#2DA3C7',
    borderRadius: 19,
    marginTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: { paddingHorizontal: 12 },
  CateView: {
    width: 'auto',
    height: 32,
    backgroundColor: Colors.button[100],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    paddingHorizontal: 10,
    margin: 5,
  },
  cardImage: { width: 177, height: 245, borderRadius: 9 },
  cardBody: { padding: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: "#000" },
  cardPrice: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3b2e',
  },
  smallImage: { width: '100%', height: 120 },
  smallOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  smallOverlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  addBtn: {
    marginTop: 10,
    backgroundColor: '#2DA3C7',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    marginTop: 10,
    backgroundColor: '#AEB254',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: Colors.button[100],
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2DA3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qtyCount: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
    color: '#000',
  },
  outOfStock: { marginTop: 10, fontSize: 14, fontWeight: '600', color: 'red' },
  floatingCartPill: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
  },
  pillInner: {
    width: 200,
    backgroundColor: '#2DA3C7',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumb: { width: 40, height: 40, resizeMode: 'cover' },
  pillTextCol: { flex: 1 },
  pillTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  pillSubtitle: { color: '#fff', fontSize: 12, marginTop: 2 },
  pillAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  pillActionText: { fontSize: 20, color: '#2DA3C7', fontWeight: '700' },
});