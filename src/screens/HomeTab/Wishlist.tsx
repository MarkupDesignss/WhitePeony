import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { WishlistContext } from '../../context/wishlistContext';
import Toast from 'react-native-toast-message';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { HttpStatusCode } from 'axios';
import { useCart } from '../../context/CartContext';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';

type DisplayWishlistItem = {
  id: string; // product id as string (used as key)
  wishlistItemId: string;
  name: string;
  price: string;
  image?: string | null; // full URI
  isInCart?: boolean;
  price_numeric?: number;
  product_id?: number; // numeric id for addToCart
  variants?: { variant_id?: number }[];
  average_rating?: number;
};

const WishlistScreen = ({ navigation }: { navigation: any }) => {
  const { removeFromWishlist, wishlistIds } = React.useContext(WishlistContext);
  const [items, setItems] = useState<DisplayWishlistItem[]>([]);
  const { isLoggedIn } = useContext<UserData>(UserDataContext);
  const { showLoader, hideLoader } = CommonLoader();
  const { cart, addToCart } = useCart();

  useEffect(() => {
    loadWishlistItems();
  }, [isLoggedIn, wishlistIds]);

  // Update items' cart status when cart changes
  useEffect(() => {
    if (!cart) return;
    setItems(currentItems =>
      currentItems.map(item => {
        const isInCart = cart.some(cartItem => String(cartItem.id) === item.id);
        return { ...item, isInCart };
      }),
    );
  }, [cart]);

  const loadWishlistItems = async () => {
    if (isLoggedIn) {
      await fetchServerWishlist();
    } else {
      await loadLocalWishlist();
    }
  };

  const fetchServerWishlist = async () => {
    try {
      showLoader();
      const res = await UserService.wishlist();
      const apiItems = res?.data?.data || [];
      console.log('Wishlist API items:', apiItems);
      const mapped: DisplayWishlistItem[] = (
        Array.isArray(apiItems) ? apiItems : []
      ).map((p: any) => {
        const productId = Number(p.product_id ?? p.id ?? p.productId ?? 0);
        const front = p.front_image ?? p.image ?? null;
        return {
          id: String(productId || (p.id ?? p.product_id ?? p.product_id ?? '')),
          wishlistItemId: String(
            p.wishlist_item_id ?? p.id ?? p.product_id ?? '',
          ),
          name: p.name ?? p.product_name ?? p.product_name ?? '',
          price: p.variants[0]?.price
            ? `${p.variants[0]?.price} €`
            : p.variants[0]?.price
            ? `${p.variants[0]?.price} €`
            : '0 €',
          price_numeric: Number(
            p.variants[0]?.price ?? p.variants[0]?.price ?? 0,
          ),
          image: front ? Image_url + front : null,
          product_id: productId,
          variants: p.variants ?? [],
          average_rating: Number(p.average_rating ?? p.averageRating ?? 0),
          isInCart: cart
            ? cart.some((ci: any) => String(ci.id) === String(productId))
            : false,
        };
      });
      hideLoader();
      setItems(mapped);
    } catch (e) {
      hideLoader();
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        Toast.show({ type: 'error', text1: 'Failed to load wishlist' });
      }
    }
  };

  const loadLocalWishlist = async () => {
    try {
      showLoader();
      const localItems = wishlistIds || [];
      const mapped: DisplayWishlistItem[] = localItems.map(id => {
        const pid = Number(id);
        return {
          id: String(id),
          wishlistItemId: String(id),
          name: `Product ${id}`,
          price: '0 €',
          price_numeric: 0,
          image: null,
          product_id: pid,
          variants: [],
          average_rating: 0,
          isInCart: cart
            ? cart.some(cartItem => String(cartItem.id) === String(id))
            : false,
        };
      });
      hideLoader();
      setItems(mapped);
    } catch (e) {
      hideLoader();
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        Toast.show({ type: 'error', text1: 'Failed to load wishlist' });
      }
    }
  };

  const handleAddToBag = async (item: DisplayWishlistItem) => {
    try {
      const productId = item.product_id ?? Number(item.id);
      const variantId = item.variants?.[0]?.variant_id ?? null;
      await addToCart(productId, variantId);

      // refresh UI: if guest just mark item as in cart; for logged-in we've already synced cart in CartContext
      if (!isLoggedIn) {
        setItems(currentItems =>
          currentItems.map(i =>
            i.id === item.id ? { ...i, isInCart: true } : i,
          ),
        );
      }

      Toast.show({ type: 'success', text1: 'Added to cart successfully' });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      Toast.show({ type: 'error', text1: 'Failed to add to cart' });
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      showLoader();
      if (isLoggedIn) {
        // Remove from server for logged-in users
        const res = await UserService.wishlistDelete(productId);
        if (res?.status === HttpStatusCode.Ok) {
          hideLoader();
          setItems(prev => prev.filter(i => i.id !== productId));
          await removeFromWishlist(productId);
          Toast.show({
            type: 'success',
            text1: 'Removed from wishlist',
          });
        } else {
          console.log('wishlist error', JSON.stringify(res?.data));
          Toast.show({
            type: 'error',
            text1: res?.data?.message || 'Failed to remove from wishlist',
          });
        }
      } else {
        console.log('removeglobal', productId);
        // Remove locally for guests
        await removeFromWishlist(productId);
        setItems(prev => prev.filter(i => i.id !== productId));
        Toast.show({
          type: 'success',
          text1: 'Removed from wishlist',
        });
      }
    } catch (err) {
      hideLoader();

      console.log('Wishlist remove error:', JSON.stringify(err));
      Toast.show({
        type: 'error',
        text1: 'Failed to remove from wishlist',
      });
    }
  };

  const renderItem = ({ item }: { item: DisplayWishlistItem }) => (
    <View style={styles.card}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, { backgroundColor: '#eee' }]} />
      )}
      <View style={styles.details}>
        <Text style={styles.productName}>{item.name}</Text>

        <View style={{ flexDirection: 'row', marginTop: 0 }}>
          {[1, 2, 3, 4, 5].map(r => {
            const avg = item.average_rating ?? 0;
            const isFull = avg >= r;
            const isHalf = avg >= r - 0.5 && avg < r;
            return (
              <View
                key={r}
                style={{ width: 18, height: 18, position: 'relative' }}
              >
                <Text
                  style={{ color: '#ccc', fontSize: 18, position: 'absolute' }}
                >
                  ★
                </Text>
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

        <Text style={styles.price}>{item.price}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.addToBagBtn, item.isInCart && styles.goToCartBtn]}
            activeOpacity={0.7}
            onPress={() =>
              item.isInCart
                ? navigation.navigate('CheckoutScreen')
                : handleAddToBag(item)
            }
          >
            <Image
              source={require('../../assets/Png/bag.png')}
              style={{ width: 16, height: 16, marginRight: 5 }}
            />
            <Text
              style={[
                styles.addToBagText,
                item.isInCart && styles.goToCartText,
              ]}
            >
              {item.isInCart ? ' Go To Cart' : ' Add To Bag'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favoriteBtn}
            activeOpacity={0.7}
            onPress={() => handleRemove(item.id)}
          >
            <Image
              source={require('../../assets/Png/heart1.png')}
              style={{ width: 16, height: 16 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.headerButton}
        >
          <Image
            source={require('../../assets/Png/back.png')}
            style={{ width: 20, height: 20 }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CheckoutScreen')}
          style={styles.headerButton}
        >
          <Image
            source={require('../../assets/Png/bag.png')}
            style={{ width: 20, height: 20 }}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.collectionLabel}>
        <Image
          source={require('../../assets/Png/star-fill.png')}
          style={{ width: 20, height: 20 }}
        />
        <Text style={styles.collectionLabelText}>
          {' '}
          My Collection ({items.length})
        </Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 4,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  collectionLabel: {
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionLabelText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#444',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginRight: 16,
    resizeMode: 'cover',
  },
  details: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  price: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addToBagBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.button[100],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 12,
  },
  addToBagText: {
    fontWeight: '600',
    fontSize: 12,
    color: '#5E6935',
  },
  favoriteBtn: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.button[100],
    backgroundColor: Colors.button[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToCartBtn: {
    backgroundColor: '#5E6935',
  },
  goToCartText: {
    color: '#FFFFFF',
  },
});

export default WishlistScreen;
