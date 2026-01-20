import { HttpStatusCode } from 'axios';
import React, { useRef, useEffect, useState, useContext, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { WishlistContext } from '../../context/wishlistContext';
import LoginModal from '../../components/LoginModal';
import { Colors } from '../../constant';

const { width } = Dimensions.get('window');

/* ---------------- PRODUCT IMAGE CAROUSEL ---------------- */
const ProductImageCarousel = ({ images }: { images: any[] }) => {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!images?.length) return;

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
  }, [index, images.length]);

  const source = typeof images[index] === 'string' ? { uri: images[index] } : images[index];

  return (
    <Animated.View style={{ opacity }}>
      <Image source={source} style={styles.cardImage} />
    </Animated.View>
  );
};

/* ---------------- PROMOTIONAL BANNER ---------------- */
const PromotionalBanner = ({ promotional }: { promotional: any[] }) => {
  if (!promotional?.length) return null;

  return (
    <View style={{ marginVertical: 12 }}>
      {promotional.map((item: any) => (
        <View key={String(item.id)} style={styles.page}>
          <ImageBackground
            source={{ uri: item.image_url }}
            style={styles.imageBackground}
            resizeMode="cover"
          >
            <View style={styles.bannerTextWrap}>
              <Text style={styles.title}>WHITE PEONY TEA CO</Text>
              <Text style={styles.subtitle}>Best Organic Tea Delivered Worldwide</Text>
            </View>
          </ImageBackground>
        </View>
      ))}
    </View>
  );
};

/* ---------------- MAIN SCREEN ---------------- */
const HomeScreen = ({ navigation }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  const { setUserData } = useContext<UserData>(UserDataContext);
  const { toggleWishlist, isWishlisted } = useContext(WishlistContext);

  const [sellingProducts, setSellingProducts] = useState<any[]>([]);
  const [promotional, setPromotional] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  /* ---------------- SEARCH ---------------- */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  useEffect(() => {
    loadAll();
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const loadAll = async () => {
    Profile();
    sellingproduct();
    GetHeader();
  };

  /* ---------------- API CALLS ---------------- */
  const Profile = async () => {
    try {
      showLoader();
      const res = await UserService.profile();
      setUserData(res?.data?.user || {});
    } catch (e) {
      console.log('Profile error', e);
    } finally {
      hideLoader();
    }
  };

  const sellingproduct = async () => {
    try {
      showLoader();
      const res = await UserService.mostsellingproduct();
      setSellingProducts(res?.data?.data || []);
    } finally {
      hideLoader();
    }
  };

  const GetHeader = async () => {
    try {
      showLoader();
      const res = await UserService.header();
      const banners = res?.data?.banners || [];

      setPromotional(
        banners
          .filter((b: any) => b.type === 'promotional')
          .map((b: any) => ({ ...b, image_url: Image_url + b.image_url }))
      );
    } finally {
      hideLoader();
    }
  };

  /* ---------------- SEARCH ---------------- */
  const GetSearch = useCallback(async (word: string) => {
    try {
      setIsSearching(true);
      const res = await UserService.search(word);
      setSearchResults(res?.data?.data?.products || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      GetSearch(text.trim());
    }, 400);
  };

  /* ---------------- RENDER PRODUCT ---------------- */
  const renderProduct = ({ item }: { item: any }) => {
    const wished = isWishlisted(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
      >
        <ProductImageCarousel
          images={item.images || [require('../../assets/Png/product.png')]}
        />

        <TouchableOpacity style={styles.wishlistBtn} onPress={() => toggleWishlist(item.id)}>
          <Image
            source={
              wished
                ? require('../../assets/Png/heart1.png')
                : require('../../assets/Png/heart-1.png')
            }
            style={styles.heart}
          />
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>{item?.variants?.[0]?.price} €</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={searchQuery ? searchResults : sellingProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
        horizontal
        showsHorizontalScrollIndicator={false}
      />

      <PromotionalBanner promotional={promotional} />

      <LoginModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
};

export default HomeScreen;

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: { width: 177, paddingHorizontal: 12 },
  cardImage: { width: 177, height: 245, borderRadius: 9 },
  cardBody: { marginTop: 10, alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#000' },
  cardPrice: { marginTop: 6, fontSize: 14, fontWeight: '700' },
  wishlistBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.button[100],
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: { width: 15, height: 15 },
  imageBackground: { width: '100%', height: 520 },
  page: { alignItems: 'center' },
  bannerTextWrap: { position: 'absolute', top: '10%', left: 20, right: 20 },
  title: { fontSize: 18, color: '#338AB1', fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 22, color: '#000', textAlign: 'center', marginTop: 10 },
});
