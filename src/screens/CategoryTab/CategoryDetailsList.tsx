import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCart } from '../../context/CartContext'; // adjust import path if needed
import { Image_url, UserService } from '../../service/ApiService'; // replace with your actual functions
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import { Colors } from '../../constant';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import { HttpStatusCode } from 'axios';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

const CategoryDetailsList = ({ navigation, route }: any) => {
  const { addToCart, cart } = useCart();
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const { showLoader, hideLoader } = CommonLoader();
  const { categoryId, categoryTitle, mode } = route.params || {};
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  // Filter state
  const [filterRating, setFilterRating] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const ProductImageCarousel = ({
    images,
    width,
  }: {
    images: any[];
    width?: number;
  }) => {
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
          <Image
            source={source}
            style={[styles.cardImage, width ? { width } : {}]}
          />
        ) : (
          <View
            style={[
              styles.cardImage,
              width ? { width } : {},
              { backgroundColor: '#eee' },
            ]}
          />
        )}
      </Animated.View>
    );
  };

  // 🧩 Fetch products based on mode
  const fetchProducts = async (filterParams: any = {}) => {
    showLoader();
    try {
      let response: any = [];

      if (mode === 'recommended') response = await UserService.recommended();
      else if (mode === 'Best Sale')
        response = await UserService.mostsellingproduct();
      else if (mode === 'all') response = await UserService.product();
      else if (categoryId) {
        const hasFilter =
          filterParams &&
          (filterParams.rating ||
            filterParams.min_price ||
            filterParams.max_price);

        if (hasFilter) {
          response = await UserService.FilterProducts({ ...filterParams });
        } else {
          response = await UserService.GetCategoryByID(categoryId);
        }
      }

      // 🔍 FULL API RESPONSE
      console.log('🔴 RAW API RESPONSE:', response?.data);

      const payload = response?.data?.data ?? response?.data ?? response ?? [];
      console.log('🟡 PAYLOAD:', payload);

      const productsArray = Array.isArray(payload)
        ? payload
        : payload?.data ?? [];

      // 🔵 FIRST PRODUCT (MOST IMPORTANT)
      if (productsArray.length > 0) {
        console.log('🟢 FIRST PRODUCT:', productsArray[0]);
      }

      setApiProducts(productsArray); // ✅ IMPORTANT
    } catch (error) {
      console.log('❌ fetchProducts error:', error);
    } finally {
      hideLoader();
    }
  };

  // 🧠 Fetch products initially (once when page loads)
  useEffect(() => {
    fetchProducts();
  }, [categoryId, mode]);

  // 🔁 Recalculate `is_cart` whenever cart changes (no refetch needed)
  useEffect(() => {
    if (apiProducts.length) {
      const cartIds = new Set(
        cart.map((c: any) => String(c.id || c.product_id)),
      );
      setApiProducts(prev =>
        prev.map(p => ({
          ...p,
          is_cart: cartIds.has(String(p.id)) ? 'true' : 'false',
        })),
      );
    }
  }, [cart]);

  const handleAddToCart = async (item: any) => {
    // CartContext.addToCart expects (productId, selectedVariant?)
    const productId = item?.id ?? item?.product_id;
    const variantId = item?.variants?.[0]?.id ?? item?.variant_id ?? null;
    if (!productId) {
      console.log('handleAddToCart: missing product id', item);
      return;
    }
    try {
      await addToCart(Number(productId), variantId);
      // no optimistic update here; cart effect will re-run and update is_cart
    } catch (e) {
      console.log('addToCart failed', e);
    }
  };

  // 🧩 Handle sorting of products
  const ApiSorting = async (sortType: string) => {
    try {
      showLoader();
      const res = await UserService.Sorting(sortType);

      if (res?.status === HttpStatusCode.Ok) {
        const sortedProducts = res?.data?.data || [];
        // normalize ids and update cart status
        const cartIds = new Set(
          cart.map((c: any) => String(c.id || c.product_id)),
        );
        const updatedProducts = sortedProducts.map((p: any) => {
          const pid = String(p.id ?? p.product_id ?? p.productId ?? '');
          return {
            ...p,
            id: pid,
            is_cart: cartIds.has(pid) ? 'true' : 'false',
          };
        });

        console.log(
          'ApiSorting -> setting products',
          updatedProducts.length,
          updatedProducts[0],
        );
        setApiProducts(updatedProducts);
        setSortVisible(false); // Close the sorting modal
        Toast.show({ type: 'success', text1: 'Products sorted successfully' });
      } else {
        console.log('Failed to sort products:', res);
        Toast.show({
          type: 'error',
          text1: 'Failed to sort products',
        });
      }
    } catch (err) {
      console.log('Sorting error:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to sort products',
      });
    } finally {
      hideLoader();
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ProductDetails', { productId: item.id })
        }
        activeOpacity={0.8}
      >
        <ProductImageCarousel
          images={[
            {
              uri: `https://www.markupdesigns.net/whitepeony/storage/${item.front_image}`,
            },
          ]}
          width={ITEM_WIDTH}
        />

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map(r => {
              const isFull = item?.average_rating >= r;
              const isHalf =
                item?.average_rating >= r - 0.5 && item?.average_rating < r;
              return (
                <View
                  key={r}
                  style={{ width: 18, height: 18, position: 'relative' }}
                >
                  {/* base gray star */}
                  <Text
                    style={{
                      color: '#ccc',
                      fontSize: 18,
                      position: 'absolute',
                    }}
                  >
                    ★
                  </Text>
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
              );
            })}
          </View>
          <Text style={styles.cardPrice}>
            {Math.round(item?.variants[0]?.price)} €{' '}
            {item?.variants[0]?.weight
              ? `- ${item?.variants[0]?.weight}`
              : item?.variants[0]?.unit
              ? `- ${item?.variants[0]?.unit}`
              : ''}
          </Text>

          {item.stock_quantity === 0 ? (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          ) : (
            <TouchableOpacity
              onPress={() =>
                item.is_cart === 'true'
                  ? navigation.navigate('CheckoutScreen') // Navigate to cart screen
                  : handleAddToCart(item)
              }
              style={styles.filterBtn}
            >
              <Text style={styles.filterText}>
                {item.is_cart === 'true' ? 'Go to Cart' : 'Add to Bag'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#F3F3F3', '#FFFFFF']} style={styles.container}>
        {/* In your return statement, modify the header section */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Image
              source={require('../../assets/Png/back.png')}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CheckoutScreen')}
            style={{ position: 'relative' }}
          >
            <Image
              source={require('../../assets/Png/order.png')}
              style={styles.icon}
            />
            {/* Cart Badge */}
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cart.length > 99 ? '99+' : cart.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterVisible(true)}
          >
            <Text style={styles.filterText}>Filters ▾</Text>{' '}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortVisible(true)}
          >
            <Text style={styles.sortText}>Sort ▾</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={apiProducts}
          extraData={apiProducts}
          keyExtractor={(i, idx) => (i?.id ? String(i.id) : String(idx))}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={() => {
            return (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignSelf: 'center',
                  marginTop: heightPercentageToDP(40),
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700' }}>
                  No Data Found
                </Text>
              </View>
            );
          }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />{' '}
        {/* Filter Modal */}
        {/* Filter Modal */}
        {/* Filter Modal */}
        <Modal visible={filterVisible} animationType="slide" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFilterVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.modalContent}>
                  {/* Header with title and close icon */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Filters</Text>
                    <TouchableOpacity onPress={() => setFilterVisible(false)}>
                      <Image
                        source={require('../../assets/Png/close.png')}
                        style={styles.closeIcon}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginVertical: 10 }}>
                    <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                      Rating
                    </Text>
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                      {[5, 4, 3, 2, 1].map(r => (
                        <TouchableOpacity
                          key={r}
                          style={{
                            backgroundColor:
                              filterRating == String(r) ? '#AEB254' : '#eee',
                            borderRadius: 12,
                            padding: 8,
                            marginRight: 8,
                          }}
                          onPress={() => setFilterRating(String(r))}
                        >
                          <Text style={{ fontWeight: '600' }}>{r}★</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                      Min Price
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Text>€</Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ccc',
                          borderRadius: 8,
                          padding: 10,
                          marginLeft: 6,
                          width: 100,
                        }}
                        keyboardType="numeric"
                        placeholderTextColor={Colors.text[200]}
                        value={filterMinPrice}
                        onChangeText={text => {
                          // Allow only numbers
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setFilterMinPrice(numericValue);

                          // Validate min <= max if both are set
                          if (
                            filterMaxPrice &&
                            numericValue &&
                            Number(numericValue) > Number(filterMaxPrice)
                          ) {
                            Toast.show({
                              type: 'error',
                              text1:
                                'Min price cannot be greater than max price',
                            });
                          }
                        }}
                        placeholder="Min"
                      />
                    </View>
                    <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                      Max Price
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Text>€</Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ccc',
                          borderRadius: 8,
                          padding: 10,
                          marginLeft: 6,
                          width: 100,
                        }}
                        keyboardType="numeric"
                        placeholderTextColor={Colors.text[200]}
                        value={filterMaxPrice}
                        onChangeText={text => {
                          // Allow only numbers
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setFilterMaxPrice(numericValue);

                          // Validate max >= min if both are set
                          if (
                            filterMinPrice &&
                            numericValue &&
                            Number(numericValue) < Number(filterMinPrice)
                          ) {
                            Toast.show({
                              type: 'error',
                              text1: 'Max price cannot be less than min price',
                            });
                          }
                        }}
                        placeholder="Max"
                      />
                    </View>

                    {/* Validation Error Message */}
                    {filterMinPrice &&
                      filterMaxPrice &&
                      Number(filterMinPrice) > Number(filterMaxPrice) && (
                        <Text
                          style={{
                            color: 'red',
                            fontSize: 12,
                            marginBottom: 10,
                          }}
                        >
                          Min price cannot be greater than max price
                        </Text>
                      )}
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { flex: 1, marginRight: 8, backgroundColor: '#f5f5f5' },
                      ]}
                      onPress={async () => {
                        setFilterVisible(false);
                        setFilterRating('');
                        setFilterMinPrice('');
                        setFilterMaxPrice('');
                        await fetchProducts();
                      }}
                    >
                      <Text
                        style={[
                          styles.modalButtonText,
                          { textAlign: 'center', color: '#333' },
                        ]}
                      >
                        Reset
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        {
                          flex: 1,
                          marginLeft: 8,
                          backgroundColor: '#AEB254',
                          opacity:
                            filterMinPrice &&
                            filterMaxPrice &&
                            Number(filterMinPrice) > Number(filterMaxPrice)
                              ? 0.5
                              : 1,
                        },
                      ]}
                      onPress={async () => {
                        // Validate before applying
                        if (
                          filterMinPrice &&
                          filterMaxPrice &&
                          Number(filterMinPrice) > Number(filterMaxPrice)
                        ) {
                          Toast.show({
                            type: 'error',
                            text1: 'Please fix price range before applying',
                          });
                          return;
                        }

                        setFilterVisible(false);
                        await fetchProducts({
                          rating: filterRating,
                          min_price: filterMinPrice,
                          max_price: filterMaxPrice,
                        });
                      }}
                      disabled={
                        filterMinPrice &&
                        filterMaxPrice &&
                        Number(filterMinPrice) > Number(filterMaxPrice)
                      }
                    >
                      <Text
                        style={[
                          styles.modalButtonText,
                          {
                            textAlign: 'center',
                            color: '#fff',
                          },
                        ]}
                      >
                        Apply
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>{' '}
        {/* Filter Modal */}
        {/* Sort Modal */}
        <Modal visible={sortVisible} animationType="slide" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSortVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Sort By</Text>
                    <TouchableOpacity onPress={() => setSortVisible(false)}>
                      <Image
                        source={require('../../assets/Png/close.png')}
                        style={styles.closeIcon}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => ApiSorting('id_asc')}
                    style={styles.sortOption}
                  >
                    <Text style={styles.sortOptionText}>Newest First</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => ApiSorting('id_desc')}
                    style={styles.sortOption}
                  >
                    <Text style={styles.sortOptionText}>Oldest First</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => ApiSorting('price_desc')}
                    style={styles.sortOption}
                  >
                    <Text style={styles.sortOptionText}>
                      Price: High to Low
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => ApiSorting('price_asc')}
                    style={styles.sortOption}
                  >
                    <Text style={styles.sortOptionText}>
                      Price: Low to High
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => ApiSorting('id_asc')}
                    style={styles.sortOption}
                  >
                    <Text style={styles.sortOptionText}>Name: A to Z</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => ApiSorting('id_desc')}
                    style={styles.sortOption}
                  >
                    <Text style={styles.sortOptionText}>Name: Z to A</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default CategoryDetailsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: '#000',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
  },
  outOfStock: { marginTop: 10, fontSize: 14, fontWeight: '600', color: 'red' },
  addBtn: {
    marginTop: 10,
    backgroundColor: '#2DA3C7',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  icon: { width: 20, height: 20, tintColor: undefined },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '95%',
    alignSelf: 'center',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  filterBtn: {
    padding: 8,
    backgroundColor: '#AEB254',
    borderRadius: 20,
    marginVertical: 10,
    width: widthPercentageToDP(30),
    alignItems: 'center',
  },
  filterText: { color: Colors.text[100] },
  sortBtn: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  modalButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  sortText: { color: Colors.text[300] },

  list: {
    marginHorizontal: 10,
    paddingBottom: 24,
  },
  card: {
    width: widthPercentageToDP(45),
    // paddingHorizontal: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#AEB254',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  CategoryView: {
    width: 'auto',
    height: 32,
    // backgroundColor: Colors.button[100],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    paddingHorizontal: 10,
    margin: 5,
  },
  cardImage: {
    width: 177,
    height: 245,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.text[400],
  },
  cardBody: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '600' },
  cardPrice: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3b2e',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalNote: { color: '#666', marginBottom: 12 },
  modalClose: { marginTop: 12, alignSelf: 'flex-end', padding: 10 },
  modalCloseText: { color: Colors.button[300], fontWeight: '600' },
  sortOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.button[100],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,

    marginTop: 16,
  },
  cartButtonActive: {
    backgroundColor: '#2DA3C7',
  },
  cartButtonDisabled: {
    opacity: 0.7,
  },
  cartButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    marginRight: 8,
  },
});
