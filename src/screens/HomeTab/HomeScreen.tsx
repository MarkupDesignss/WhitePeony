import React, {
  useRef,
  useEffect,
  useState,
  useContext,
  useCallback,
} from 'react';
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

/* ---------------- PRODUCT TYPE ---------------- */
type ProductFilterType = 'b2c' | 'b2b' | 'both';

/* ---------------- IMAGE CAROUSEL ---------------- */
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

  const source =
    typeof images[index] === 'string'
      ? { uri: images[index] }
      : images[index];

  return (
    <Animated.View style={{ opacity }}>
      <Image source={source} style={styles.cardImage} />
    </Animated.View>
  );
};

/* ---------------- MAIN SCREEN ---------------- */
const HomeScreen = ({ navigation }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  const { setUserData } = useContext<UserData>(UserDataContext);
  const { toggleWishlist, isWishlisted } = useContext(WishlistContext);

  /* 🔥 CHANGE THIS VALUE BASED ON REQUIREMENT */
  const [productType, setProductType] =
    useState<ProductFilterType>('b2c'); // 'b2c' | 'b2b' | 'both'

  const [products, setProducts] = useState<any[]>([]);
  const [promotional, setPromotional] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  /* ---------------- SEARCH ---------------- */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchDebounceRef = useRef<any>(null);

  useEffect(() => {
    loadAll();
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [productType]);

  /* ---------------- COMMON FILTER ---------------- */
  const filterByProductType = (
    list: any[],
    type: ProductFilterType,
  ) => {
    if (type === 'both') return list;
    return list.filter(
      item => item.product_type?.toLowerCase() === type,
    );
  };

  const loadAll = async () => {
    Profile();
    getSellingProducts();
    getHeader();
  };

  /* ---------------- API CALLS ---------------- */
  const Profile = async () => {
    try {
      showLoader();
      const res = await UserService.profile();
      setUserData(res?.data?.user || {});
    } finally {
      hideLoader();
    }
  };

  const getSellingProducts = async () => {
    try {
      showLoader();
      const res = await UserService.mostsellingproduct();
      const allProducts = res?.data?.data || [];

      const filtered = filterByProductType(
        allProducts,
        productType,
      );

      setProducts(filtered);
    } finally {
      hideLoader();
    }
  };

  const getHeader = async () => {
    try {
      const res = await UserService.header();
      const banners = res?.data?.banners || [];

      setPromotional(
        banners
          .filter((b: any) => b.type === 'promotional')
          .map((b: any) => ({
            ...b,
            image_url: Image_url + b.image_url,
          })),
      );
    } catch { }
  };

  /* ---------------- SEARCH ---------------- */
  const GetSearch = useCallback(
    async (word: string) => {
      try {
        const res = await UserService.search(word);
        const searchData = res?.data?.data?.products || [];

        const filtered = filterByProductType(
          searchData,
          productType,
        );

        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      }
    },
    [productType],
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current)
      clearTimeout(searchDebounceRef.current);

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
        onPress={() =>
          navigation.navigate('ProductDetails', {
            productId: item.id,
          })
        }
      >
        <ProductImageCarousel
          images={item.images || [require('../../assets/Png/product.png')]}
        />

        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={() => toggleWishlist(item.id)}
        >
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
          <Text style={styles.cardPrice}>
            {item?.variants?.[0]?.price} €
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 🔥 Example Toggle Buttons */}
      <View style={styles.filterRow}>
        {['b2c', 'b2b', 'both'].map(type => (
          <TouchableOpacity
            key={type}
            onPress={() =>
              setProductType(type as ProductFilterType)
            }
          >
            <Text
              style={[
                styles.filterBtn,
                productType === type && styles.activeBtn,
              ]}
            >
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={searchQuery ? searchResults : products}
        keyExtractor={item => String(item.id)}
        renderItem={renderProduct}
        horizontal
        showsHorizontalScrollIndicator={false}
      />

      <LoginModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
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
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  filterBtn: {
    padding: 8,
    color: '#555',
    fontWeight: '600',
  },
  activeBtn: {
    color: '#338AB1',
    textDecorationLine: 'underline',
  },
});
