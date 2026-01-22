import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Platform,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { formatDate } from '../../helpers/helpers';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { key: 'placed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'shipped', label: 'Delivered' },
];

type UiOrder = {
  id: string | number;
  status?: string;
  total_amount?: string | number;
  payment_status?: string;
  tracking_number?: string;
  created_at?: string;
  updated_at?: string;
  items?: any;
};

const OrdersScreen = ({ navigation }: { navigation: any }) => {
  const { showLoader, hideLoader } = CommonLoader();
  const [activeTab, setActiveTab] = useState('placed');
  const [searchText, setSearchText] = useState('');
  const [order, setOrder] = useState<UiOrder[]>([]);
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Array<string | number>>([]);

  useEffect(() => {
    OrderList();
  }, []);

  const OrderList = async () => {
    try {
      showLoader();
      const res = await UserService.order();

      console.log('=== ORDER API CALLED ===');
      console.log('API Endpoint: Order list');
      console.log('Response status:', res?.status);
      console.log('Full response:', JSON.stringify(res?.data, null, 2));

      if (res && res.data && res.status === HttpStatusCode.Ok) {
        hideLoader();

        const apiOrders = Array.isArray(res?.data?.orders)
          ? res.data.orders
          : [];

        // Check specifically for ratings in the response
        console.log('=== CHECKING RATINGS IN ORDER DATA ===');
        apiOrders.forEach((order: any, index: number) => {
          console.log(`Order ${index + 1} (ID: ${order.id}):`);
          console.log('  - Direct rating property:', order.rating);
          console.log('  - Reviews array:', order.reviews);
          console.log('  - Items:', order.items);

          // Check if rating is in items
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any, itemIndex: number) => {
              console.log(`  Item ${itemIndex + 1}:`);
              console.log(`    - Item rating:`, item.rating);
              console.log(`    - Item product rating:`, item.product?.rating);
              console.log(`    - Item product reviews:`, item.product?.reviews);
            });
          }
        });

        setOrder(apiOrders);
      } else {
        hideLoader();
        console.log('Order API response not OK');
      }
    } catch (err) {
      hideLoader();
      console.log('Order API error:', err);
    }
  };

  const PostReview = async () => {
    if (!newRating) {
      Toast.show({
        type: 'error',
        text1: 'Please select a rating',
      });
      return;
    }

    if (!selectedProductId) {
      Toast.show({
        type: 'error',
        text1: 'Product not found',
      });
      return;
    }

    try {
      const payload = {
        rating: newRating,
        review: newComment || 'No comment',
        product_id: selectedProductId,
      };

      console.log('=== REVIEW API CALLED ===');
      console.log('Product ID:', selectedProductId);
      console.log('Selected rating (newRating):', newRating);
      console.log('Payload being sent:', JSON.stringify(payload, null, 2));

      showLoader();

      const res = await UserService.Review(payload, selectedProductId);

      console.log('=== REVIEW API RESPONSE ===');
      console.log('Response status:', res?.status);
      console.log('Response data:', JSON.stringify(res?.data, null, 2));

      if (res && res?.data && res?.status === HttpStatusCode.Ok) {
        hideLoader();
        Toast.show({
          type: 'success',
          text1: 'Thank you for your rating and review!',
          text2: 'Your feedback has been submitted successfully.',
        });

        // Log what happened
        console.log('Review submitted successfully!');
        console.log('Submitted rating:', newRating);
        console.log('Selected product ID:', selectedProductId);

        // Close modal and reset
        setWriteModalVisible(false);
        setNewComment('');
        setNewRating(5);
        setSelectedProductId('');
        setSelectedProductName('');

        // Refresh order list
        OrderList();
      } else {
        hideLoader();
        console.log('Review API returned error status:', res?.status);
        Toast.show({
          type: 'error',
          text1: 'Something went wrong!',
          text2: 'Please try again.',
        });
      }
    } catch (error: any) {
      hideLoader();
      console.log('=== REVIEW SUBMISSION ERROR ===');
      console.log('Error:', error);

      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
      }

      let errorMessage = 'Something went wrong! Please try again.';
      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      Toast.show({
        type: 'error',
        text1: errorMessage,
      });
    }
  };

  const handleOpenReviewModal = (productId: string, productName: string) => {
    console.log('handleOpenReviewModal called with:', {
      productId,
      productName,
    });

    if (!productId) {
      console.log('No productId provided!');
      Toast.show({
        type: 'error',
        text1: 'Product information not available',
      });
      return;
    }

    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setNewRating(5);
    setNewComment('');

    console.log('Setting modal visible: true');
    setWriteModalVisible(true);
  };

  const toggleExpand = (id: string | number) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const getItemsList = (rawItems: any) => {
    if (!rawItems) return [];
    if (Array.isArray(rawItems)) {
      if (rawItems.length > 0 && Array.isArray(rawItems[0])) {
        return rawItems[0];
      }
      return rawItems;
    }
    return [];
  };

  const extractProductInfo = (item: any) => {
    try {
      console.log('Item data:', JSON.stringify(item, null, 2));

      // First, let's log the entire items structure
      console.log('Item items:', item?.items);

      // Try to find product ID in different possible paths
      let productId = null;
      let productName = null;

      // Path 1: items[0].product.id
      if (item?.items?.[0]?.product?.id) {
        productId = item.items[0].product.id.toString();
        productName = item.items[0].product.name;
        console.log('Found via path 1:', { productId, productName });
      }
      // Path 2: items[0].product_id
      else if (item?.items?.[0]?.product_id) {
        productId = item.items[0].product_id.toString();
        productName = item.items[0].product_name || 'Product';
        console.log('Found via path 2:', { productId, productName });
      }
      // Path 3: items[0].id (if it's the product itself)
      else if (item?.items?.[0]?.id) {
        productId = item.items[0].id.toString();
        productName = item.items[0].name || 'Product';
        console.log('Found via path 3:', { productId, productName });
      }
      // Path 4: Check if items is an array with nested structure
      else if (Array.isArray(item?.items) && item.items.length > 0) {
        // Try to find any product reference in the array
        for (const orderItem of item.items) {
          if (orderItem?.product?.id) {
            productId = orderItem.product.id.toString();
            productName = orderItem.product.name;
            console.log('Found via path 4:', { productId, productName });
            break;
          }
        }
      }

      // If still not found, check direct product properties
      if (!productId && item?.product_id) {
        productId = item.product_id.toString();
        productName = item.product_name || 'Product';
        console.log('Found via direct product_id:', { productId, productName });
      }

      console.log('Final extracted:', { productId, productName });
      return { productId, productName };
    } catch (error) {
      console.log('Error extracting product info:', error);
      return { productId: null, productName: null };
    }
  };

  const renderOrder = ({ item }: { item: any }) => {
    const itemsList = getItemsList(item?.items);
    const { product, productId, productName } = extractProductInfo(item);
    const isExpanded = expandedIds.includes(item.id);
    const formData = formatDate(item?.created_at || item?.updated_at);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.9}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.deliveryInfo}>
          <Image
            source={require('../../assets/Png/orderLogo.png')}
            style={{
              width: 22,
              height: 22,
              backgroundColor: '#EAFDFF',
              borderRadius: 20,
            }}
          />
          <View style={{ marginLeft: 6 }}>
            <Text style={styles.deliveryDate}>
              {item?.status
                ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                : 'Order'}{' '}
              • {formData}
            </Text>
            <Text style={styles.deliveryStatus}>
              {item?.tracking_number
                ? `${item.tracking_number}`
                : item?.payment_status
                ? item.payment_status
                : 'No tracking info'}
            </Text>
          </View>
          <Image
            source={require('../../assets/Png/next.png')}
            style={{ marginLeft: 'auto', width: 14, height: 14 }}
          />
        </View>

        <View style={styles.productInfo}>
          {product?.front_image ? (
            <Image
              source={{
                uri: Image_url + product?.front_image,
              }}
              style={styles.productImage}
            />
          ) : (
            <Image
              source={require('../../assets/Png/product.png')}
              style={styles.productImage}
            />
          )}
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{productName || 'Item'}</Text>
            <Text style={styles.productName}>
              {item?.total_amount ? `${item.total_amount} €` : ''}
            </Text>
            <Text style={styles.productQty}>
              Qty :{' '}
              {itemsList?.reduce(
                (sum: number, it: any) => sum + (it?.quantity || it?.qty || 1),
                1,
              )}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() =>
            productId &&
            handleOpenReviewModal(productId, productName || 'Product')
          }
          activeOpacity={0.7}
          disabled={!productId}
        >
          <View
            style={[
              styles.rateReviewRow,
              !productId && styles.disabledRateReview,
            ]}
          >
            <Text style={styles.rateReviewLabel}>Rate & Review </Text>
            <View style={{ flexDirection: 'row', marginTop: -10 }}>
              {[1, 2, 3, 4, 5].map(r => {
                // Get rating from ALL possible locations
                const rating =
                  item.rating ||
                  item?.reviews?.[0]?.rating ||
                  item?.items?.[0]?.rating ||
                  item?.items?.[0]?.product?.rating ||
                  item?.items?.[0]?.product?.reviews?.[0]?.rating ||
                  0;

                console.log(`Star ${r}: Looking for rating...`);
                console.log(`  - item.rating: ${item.rating}`);
                console.log(
                  `  - item.reviews?.[0]?.rating: ${item.reviews?.[0]?.rating}`,
                );
                console.log(
                  `  - item.items?.[0]?.rating: ${item.items?.[0]?.rating}`,
                );
                console.log(
                  `  - item.items?.[0]?.product?.rating: ${item.items?.[0]?.product?.rating}`,
                );
                console.log(`  - Final rating value: ${rating}`);

                const numericRating = Number(rating) || 0;

                // NO RATING → TEXT STARS
                if (numericRating === 0) {
                  return (
                    <Text
                      key={r}
                      style={{
                        color: '#ccc',
                        fontSize: 18,
                        marginRight: 2,
                      }}
                    >
                      ★
                    </Text>
                  );
                }

                // HAS RATING → IMAGE STARS
                const isFull = numericRating >= r;

                console.log(
                  `Star ${r}: Showing ${
                    isFull ? 'filled' : 'empty'
                  } star for rating ${numericRating}`,
                );

                return (
                  <Image
                    key={r}
                    source={require('../../assets/Png/star.png')}
                    style={{
                      width: 18,
                      height: 18,
                      marginRight: 2,
                      tintColor: isFull ? '#F0C419' : '#ccc',
                    }}
                  />
                );
              })}
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.detailLabel}>
              Order ID: <Text style={styles.detailValue}>{item?.id}</Text>
            </Text>
            <Text style={styles.detailLabel}>
              Tracking:{' '}
              <Text style={styles.detailValue}>
                {item?.tracking_number || '—'}
              </Text>
            </Text>
            <Text style={styles.detailLabel}>
              Payment:{' '}
              <Text style={styles.detailValue}>
                {item?.payment_status || '—'}
              </Text>
            </Text>
            <Text style={styles.detailLabel}>
              Total:{' '}
              <Text style={styles.detailValue}>
                {item?.total_amount ? `${item.total_amount} €` : '—'}
              </Text>
            </Text>

            <Text style={[styles.detailLabel, { marginTop: 8 }]}>Items:</Text>
            {itemsList && itemsList.length > 0 ? (
              itemsList.map((it: any, idx: number) => {
                const p = it?.product || it;
                const currentProductId = p?.id?.toString();
                const currentProductName = p?.name || 'Item';

                return (
                  <View key={idx} style={styles.itemRow}>
                    <Image
                      source={
                        p?.front_image
                          ? { uri: Image_url + p.front_image }
                          : require('../../assets/Png/product.png')
                      }
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        marginRight: 8,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>
                        {currentProductName}
                      </Text>
                      <Text style={{ color: '#666', fontSize: 13 }}>
                        Qty: {it?.quantity || it?.qty || 1}{' '}
                        {p?.price ? `• ${p.price} €` : ''}
                      </Text>
                      {currentProductId && (
                        <TouchableOpacity
                          onPress={() =>
                            handleOpenReviewModal(
                              currentProductId,
                              currentProductName,
                            )
                          }
                          style={styles.reviewButton}
                        >
                          <Text style={styles.reviewButtonText}>
                            Rate this item
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#666' }}>No items available</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredOrders = order.filter(
    o => (o?.status || '').toLowerCase() === activeTab,
  );

  const renderModal = () => (
    <Modal
      visible={writeModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setWriteModalVisible(false);
        setNewComment('');
        setNewRating(5);
        setSelectedProductId('');
        setSelectedProductName('');
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Write a Review</Text>
                <TouchableOpacity
                  onPress={() => {
                    setWriteModalVisible(false);
                    setNewComment('');
                    setNewRating(5);
                    setSelectedProductId('');
                    setSelectedProductName('');
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {selectedProductName && (
                  <Text style={styles.productNameLabel}>
                    Product: {selectedProductName}
                  </Text>
                )}

                <Text style={styles.modalSubtitle}>
                  How would you rate this product?
                </Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setNewRating(r)}
                      style={styles.starButton}
                    >
                      <Text
                        style={[
                          styles.star,
                          newRating >= r
                            ? styles.starActive
                            : styles.starInactive,
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {newRating === 5
                    ? 'Excellent'
                    : newRating === 4
                    ? 'Good'
                    : newRating === 3
                    ? 'Average'
                    : newRating === 2
                    ? 'Poor'
                    : newRating === 1
                    ? 'Terrible'
                    : 'Select a rating'}
                </Text>

                <Text style={styles.modalSubtitle}>Your Review (Optional)</Text>
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholderTextColor={Colors.text[200]}
                  placeholder="Share your experience with this product..."
                  style={styles.reviewInput}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  blurOnSubmit={true}
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setWriteModalVisible(false);
                    setNewComment('');
                    setNewRating(5);
                    setSelectedProductId('');
                    setSelectedProductName('');
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={PostReview}
                  style={[
                    styles.submitButton,
                    !newRating && styles.submitButtonDisabled,
                  ]}
                  disabled={!newRating}
                >
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation?.goBack()}
            >
              <Image
                source={require('../../assets/Png/back.png')}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Orders</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Products..."
                placeholderTextColor={Colors.text[200]}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchButton} activeOpacity={0.7}>
                <Image
                  source={require('../../assets/Png/search.png')}
                  style={{ width: 16, height: 16 }}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
              {TABS.map(tab => {
                const isActive = tab.key === activeTab;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                    style={[
                      styles.tabItem,
                      isActive ? styles.tabItemActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isActive ? styles.tabTextActive : null,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FlatList
              keyExtractor={item => String(item.id)}
              data={filteredOrders}
              renderItem={renderOrder}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 20,
              }}
              ListEmptyComponent={
                <View style={{ marginTop: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#888', fontSize: 16 }}>
                    No orders found for "{activeTab}".
                  </Text>
                </View>
              }
            />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
      {renderModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: { width: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 20,
    height: 40,
    color: '#444',
    borderColor: '#444',
    fontSize: 14,
    borderWidth: 1,
  },
  searchButton: {
    backgroundColor: Colors.button[100],
    marginLeft: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FCFCEC',
    marginHorizontal: 20,
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    marginHorizontal: 0,
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: { backgroundColor: '#DEE9A0' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#AAA' },
  tabTextActive: { color: '#000' },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 16,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryDate: { fontWeight: '500', color: '#000', fontSize: 12 },
  deliveryStatus: { fontSize: 10, color: '#999' },
  productInfo: { flexDirection: 'row', marginBottom: 12 },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginRight: 16,
    resizeMode: 'cover',
  },
  productDetails: { flex: 1 },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  productQty: { fontSize: 12, color: '#555', fontWeight: '500' },
  rateReviewRow: {
    backgroundColor: '#FCFCEC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  disabledRateReview: {
    opacity: 0.5,
  },
  rateReviewLabel: { fontSize: 14, fontWeight: '600', color: '#000' },
  orderDetails: {
    marginTop: 12,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 12,
  },
  detailLabel: { fontSize: 13, color: '#444', marginTop: 6 },
  detailValue: { fontWeight: '700', color: '#333' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  reviewButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
  },
  closeButtonText: {
    fontSize: 22,
    color: '#666',
    lineHeight: 24,
  },
  modalScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  productNameLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 10,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 20,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    marginHorizontal: 8,
    padding: 4,
  },
  star: {
    fontSize: 36,
  },
  starActive: {
    color: '#F0C419',
  },
  starInactive: {
    color: '#e0e0e0',
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 140,
    marginBottom: 20,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',

    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#c0c0c0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default OrdersScreen;
