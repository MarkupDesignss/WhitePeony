import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useMemo,
} from 'react';
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
import { formatDate } from '../../helpers/helpers';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserDataContext } from '../../context';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
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
  const { translatedText: searchplaceholder } = useAutoTranslate('Search orders...');

  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );

  // Fetch rates with caching
  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });

  // Price display helper
  const displayPrice = useCallback(
    (priceEUR: any): string => {
      return convertAndFormatPrice(priceEUR, selectedCurrency, rates);
    },
    [selectedCurrency, rates],
  );

  // Use the UserDataContext
  const { userData } = useContext(UserDataContext);

  const [activeTab, setActiveTab] = useState('placed');
  const [searchText, setSearchText] = useState('');
  const [order, setOrder] = useState<UiOrder[]>([]);
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Array<string | number>>([]);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [existingComment, setExistingComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper to parse quantities safely
  const parseQuantity = useCallback((value: any): number => {
    const qty = Number(value);
    return Number.isFinite(qty) ? qty : 0;
  }, []);


  // Helper to calculate total quantity from items list
  const calculateTotalQuantity = useCallback((items: any[]): number => {
    if (!Array.isArray(items)) return 0;

    return items.reduce((sum, item) => {
      return sum + Number(item?.quantity || 0);
    }, 0);
  }, []);


  useEffect(() => {
    OrderList();
  }, []);

  const OrderList = async () => {
    try {
      setIsLoading(true);
      const res = await UserService.order();

      console.log('=== ORDER API CALLED ===');
      console.log('API Endpoint: Order list');
      console.log('Response status:', res?.status);

      if (res && res.data && res.status === HttpStatusCode.Ok) {
        setIsLoading(false);

        const apiOrders = Array.isArray(res?.data?.orders)
          ? res.data.orders
          : [];

        // Sort orders by created_at in descending order (latest first)
        const sortedOrders = [...apiOrders].sort((a, b) => {
          const dateA = new Date(a.created_at || a.updated_at || 0);
          const dateB = new Date(b.created_at || b.updated_at || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setOrder(sortedOrders);
      } else {
        setIsLoading(false);
        console.log('Order API response not OK');
      }
    } catch (err) {
      setIsLoading(false);
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
        review:
          newComment ||
          (existingRating !== null ? 'Updated review' : 'No comment'),
        product_id: selectedProductId,
        ...(existingReviewId && { review_id: existingReviewId }),
      };

      console.log('=== REVIEW API CALLED ===');
      console.log('Product ID:', selectedProductId);
      console.log('Is Update:', existingRating !== null);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      setIsLoading(true);

      const res = await UserService.Review(payload, selectedProductId);

      console.log('=== REVIEW API RESPONSE ===');
      console.log('Response status:', res?.status);

      if (res && res?.data && res?.status === HttpStatusCode.Ok) {
        setIsLoading(false);

        Toast.show({
          type: 'success',
          text1:
            existingRating !== null
              ? 'Review updated successfully!'
              : 'Thank you for your rating and review!',
          text2:
            existingRating !== null
              ? 'Your feedback has been updated.'
              : 'Your feedback has been submitted successfully.',
        });

        // Close modal and reset
        setWriteModalVisible(false);
        setNewComment('');
        setNewRating(5);
        setSelectedProductId('');
        setSelectedProductName('');
        setExistingRating(null);
        setExistingReviewId(null);
        setExistingComment('');

        // Refresh order list
        OrderList();
      } else {
        setIsLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Something went wrong!',
          text2: 'Please try again.',
        });
      }
    } catch (error: any) {
      setIsLoading(false);
      console.log('=== REVIEW SUBMISSION ERROR ===');
      console.log('Error:', error);

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

  const handleOpenReviewModal = useCallback(
    (productId: string, productName: string) => {
      if (!productId) {
        Toast.show({
          type: 'error',
          text1: 'Product information not available',
        });
        return;
      }

      // Get current user ID from context
      const currentUserId =
        userData?.customer_id ||
        userData?.id ||
        userData?.user_id ||
        userData?.userId;

      if (!currentUserId) {
        Toast.show({
          type: 'error',
          text1: 'User not authenticated',
          text2: 'Please login to submit reviews',
        });
        return;
      }

      // Find the existing rating for this product
      let foundRating: number | null = null;
      let foundComment: string = '';
      let foundReviewId: string | null = null;

      // Search through all orders and items to find the user's review for this product
      for (const orderItem of order) {
        const itemsList = getItemsList(orderItem?.items);

        for (const item of itemsList) {
          const product = item?.product || item;
          const itemProductId =
            product?.id?.toString() || product?.product_id?.toString();

          if (itemProductId === productId) {
            // Check if there's a review from the current user
            if (product?.reviews && Array.isArray(product.reviews)) {
              // Find current user's review
              const currentUserReview = product.reviews.find((review: any) => {
                const reviewUserId =
                  review.customer_id ||
                  review.user_id ||
                  review.userId ||
                  review.user?.id;
                return reviewUserId == currentUserId;
              });

              if (currentUserReview) {
                foundRating = Number(currentUserReview.rating);
                foundComment =
                  currentUserReview.review ||
                  currentUserReview.comment ||
                  currentUserReview.text ||
                  '';
                foundReviewId =
                  currentUserReview.id || currentUserReview.review_id || null;
              }
            }
            break;
          }
        }
        if (foundRating !== null) break;
      }

      setSelectedProductId(productId);
      setSelectedProductName(productName);
      setExistingRating(foundRating);
      setExistingReviewId(foundReviewId);
      setExistingComment(foundComment);
      setNewRating(foundRating || 5);
      setNewComment(foundComment);
      setWriteModalVisible(true);
    },
    [order, userData],
  );

  const toggleExpand = useCallback((id: string | number) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const getItemsList = useCallback((rawItems: any) => {
    if (!rawItems) return [];

    // API always sends array of order items
    if (Array.isArray(rawItems)) {
      return rawItems;
    }

    // Sometimes wrapped inside { items: [] }
    if (rawItems?.items && Array.isArray(rawItems.items)) {
      return rawItems.items;
    }

    return [];
  }, []);

  const extractProductInfo = useCallback(
    (item: any) => {
      try {
        // Get current user ID from context
        const currentUserId =
          userData?.customer_id ||
          userData?.id ||
          userData?.user_id ||
          userData?.userId;

        let productId = null;
        let productName = null;
        let productRating = null;
        let userRating = null;
        let customerReviews = [];

        // Find product info
        const itemsList = getItemsList(item?.items);
        for (const orderItem of itemsList) {
          const product = orderItem?.product || orderItem;
          if (product?.id || product?.product_id) {
            productId = (product.id || product.product_id).toString();
            productName = product.name || 'Product';

            // Extract rating from reviews
            if (product.reviews && Array.isArray(product.reviews)) {
              customerReviews = product.reviews;

              // Find current user's review
              if (currentUserId) {
                const userReview = product.reviews.find((review: any) => {
                  const reviewUserId =
                    review.customer_id ||
                    review.user_id ||
                    review.userId ||
                    review.user?.id;
                  return reviewUserId == currentUserId;
                });

                if (userReview) {
                  userRating = Number(userReview.rating);
                }
              }

              // Calculate average rating
              if (product.reviews.length > 0) {
                const sum = product.reviews.reduce((acc, review) => {
                  return acc + Number(review.rating || 0);
                }, 0);
                productRating = sum / product.reviews.length;
              }
            }
            break;
          }
        }

        return {
          productId,
          productName,
          productRating,
          userRating,
          customerReviews,
        };
      } catch (error) {
        console.log('Error extracting product info:', error);
        return {
          productId: null,
          productName: null,
          productRating: null,
          userRating: null,
          customerReviews: [],
        };
      }
    },
    [userData, getItemsList],
  );

  const renderOrder = useCallback(
    ({ item }: { item: any }) => {
      const itemsList = getItemsList(item?.items);
      const {
        productId,
        productName,
        productRating,
        userRating,
        customerReviews,
      } = extractProductInfo(item);
      const isExpanded = expandedIds.includes(item.id);
      const formData = formatDate(item?.created_at || item?.updated_at);
      const displayRating = userRating !== null ? userRating : productRating;

      return (
        <TouchableOpacity
          style={styles.orderCard}
          activeOpacity={0.9}
          onPress={() => toggleExpand(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
            <View style={{ marginLeft: 6, flex: 1 }}>
              <TransletText
                text={`${item?.status
                  ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                  : 'Order'
                  } • ${formData}`}
                style={[styles.deliveryDate, { flexShrink: 1 }]}
                numberOfLines={0}
              />
              <TransletText
                text={
                  item?.tracking_number
                    ? `${item.tracking_number}`
                    : item?.payment_status
                      ? item.payment_status
                      : 'No tracking info'
                }
                style={[styles.deliveryStatus, { flexShrink: 1 }]}
                numberOfLines={0}
              />
            </View>


            <Image
              source={require('../../assets/Png/next.png')}
              style={{ marginLeft: 'auto', width: 14, height: 14 }}
            />
          </View>

          <View style={styles.productInfo}>
            {itemsList[0]?.product?.front_image ? (
              <Image
                source={{
                  uri: Image_url + itemsList[0]?.product?.front_image,
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
              {/* Primary product */}
              <TransletText style={styles.productName} text={productName || 'Item'} />

              {/* Secondary summary */}
              {itemsList.length > 1 && (
                <TransletText
                  text={`+${itemsList.length - 1} items`}
                  style={styles.moreItemsText}
                />

              )}

              <TransletText style={styles.productPrice}
                text={item?.total_amount ? displayPrice(item.total_amount) : ''}
              />
            </View>

          </View>

          <TouchableOpacity
            onPress={() =>
              productId &&
              handleOpenReviewModal(productId, productName || 'Product')
            }
            activeOpacity={0.7}
            disabled={!productId}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View
              style={[
                styles.rateReviewRow,
                !productId && styles.disabledRateReview,
              ]}
            >

              <TransletText style={styles.rateReviewLabel}
                text={userRating !== null ? 'Update Review' : 'Rate & Review'}
              />
              <View style={{ flexDirection: 'row', marginTop: -10 }}>
                {[1, 2, 3, 4, 5].map(r => {
                  const numericRating = Number(displayRating) || 0;

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

                  const isFull = numericRating >= r;

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
              <TransletText
                text={`Order ID: ${item?.id}`}
                style={styles.detailLabel}
              />
              <TransletText
                text={`Tracking: ${item?.tracking_number || '—'}`}
                style={styles.detailLabel}
              />
              <TransletText
                text={`Payment: ${item?.payment_status || '—'}`}
                style={styles.detailLabel}
              />
              <TransletText
                text={`Total: ${item?.total_amount ? displayPrice(item.total_amount) : '—'
                  }`}
                style={styles.detailLabel}
              />

              <TransletText text="Items:" style={[styles.detailLabel, { marginTop: 8 }]} />

              {itemsList && itemsList.length > 0 ? (
                itemsList.map((it: any, idx: number) => {
                  const p = it?.product || it;
                  const currentProductId = p?.id?.toString();
                  const currentProductName = p?.name || 'Item';

                  // Calculate rating
                  let itemRating = null;
                  let userItemRating = null;
                  let itemReviewCount = 0;

                  if (p?.reviews && Array.isArray(p.reviews)) {
                    itemReviewCount = p.reviews.length;

                    const currentUserId =
                      userData?.id || userData?.user_id || userData?.userId;

                    const userReview = p.reviews.find((review: any) => {
                      const reviewUserId =
                        review.user_id || review.userId || review.user?.id;
                      return reviewUserId == currentUserId;
                    });

                    if (userReview) {
                      userItemRating = Number(userReview.rating);
                    }

                    if (p.reviews.length > 0) {
                      const sum = p.reviews.reduce((acc, review) => {
                        return acc + Number(review.rating || 0);
                      }, 0);
                      itemRating = sum / p.reviews.length;
                    }
                  }

                  const displayItemRating =
                    userItemRating !== null ? userItemRating : itemRating;

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
                        <TransletText
                          text={currentProductName}
                          style={{ fontWeight: '600' }}
                        />
                        <TransletText
                          text={`Qty: ${parseQuantity(it?.quantity)} ${p?.price ? `• ${displayPrice(p.price)}` : ''
                            }`}
                          style={{ color: '#666', fontSize: 13 }}
                        />

                        {displayItemRating !== null && (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginTop: 4,
                            }}
                          >
                            <View style={{ flexDirection: 'row' }}>
                              {[1, 2, 3, 4, 5].map(r => (
                                <Image
                                  key={r}
                                  source={require('../../assets/Png/star.png')}
                                  style={{
                                    width: 12,
                                    height: 12,
                                    marginRight: 1,
                                    tintColor:
                                      displayItemRating >= r ? '#F0C419' : '#ccc',
                                  }}
                                />
                              ))}
                            </View>
                            <TransletText
                              text={`(${displayItemRating.toFixed(1)}, ${itemReviewCount} review${itemReviewCount !== 1 ? 's' : ''
                                }${userItemRating !== null ? ' • Your rating' : ''})`}
                              style={{
                                fontSize: 11,
                                color: '#666',
                                marginLeft: 4,
                              }}
                            />
                          </View>
                        )}

                        {currentProductId && (
                          <TouchableOpacity
                            onPress={() =>
                              handleOpenReviewModal(currentProductId, currentProductName)
                            }
                            style={[
                              styles.reviewButton,
                              userItemRating !== null && styles.updateReviewButton,
                            ]}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <TransletText
                              text={userItemRating !== null ? 'Update Review' : 'Rate this item'}
                              style={styles.reviewButtonText}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <TransletText text="No items available" style={{ color: '#666' }} />
              )}
            </View>
          )}

        </TouchableOpacity>
      );
    },
    [
      expandedIds,
      getItemsList,
      extractProductInfo,
      displayPrice,
      handleOpenReviewModal,
      toggleExpand,
      userData,
      parseQuantity,
      calculateTotalQuantity,
    ],
  );

  const filteredOrders = useMemo(() => {
    return order
      .filter(o => (o?.status || '').toLowerCase() === activeTab)
      .sort((a, b) => {
        // Ensure latest products come first
        const dateA = new Date(a.created_at || a.updated_at || 0);
        const dateB = new Date(b.created_at || b.updated_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [order, activeTab]);

  const renderModal = useMemo(
    () => (
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
          setExistingRating(null);
          setExistingReviewId(null);
          setExistingComment('');
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
                  <TransletText
                    text={existingRating !== null ? 'Update Your Review' : 'Write a Review'}
                    style={styles.modalTitle}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setWriteModalVisible(false);
                      setNewComment('');
                      setNewRating(5);
                      setSelectedProductId('');
                      setSelectedProductName('');
                      setExistingRating(null);
                      setExistingReviewId(null);
                      setExistingComment('');
                    }}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <TransletText text="×" style={styles.closeButtonText} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {selectedProductName && (
                    <View>
                      <TransletText
                        text={`Product: ${selectedProductName}`}
                        style={styles.productNameLabel}
                      />
                      {existingRating !== null && (
                        <TransletText
                          text="You've already reviewed this product"
                          style={styles.existingReviewNote}
                        />
                      )}
                    </View>
                  )}

                  <TransletText
                    text="How would you rate this product?"
                    style={styles.modalSubtitle}
                  />
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setNewRating(r)}
                        style={styles.starButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text
                          style={[
                            styles.star,
                            newRating >= r ? styles.starActive : styles.starInactive,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TransletText
                    text={
                      newRating === 5
                        ? 'Excellent'
                        : newRating === 4
                          ? 'Good'
                          : newRating === 3
                            ? 'Average'
                            : newRating === 2
                              ? 'Poor'
                              : newRating === 1
                                ? 'Terrible'
                                : 'Select a rating'
                    }
                    style={styles.ratingText}
                  />

                  <TransletText
                    text={`Your Review ${existingRating !== null ? '(Edit)' : '(Optional)'}`}
                    style={styles.modalSubtitle}
                  />
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholderTextColor={Colors.text[200]}
                    placeholder={
                      existingRating !== null
                        ? 'Update your review...'
                        : 'Share your experience with this product...'
                    }
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
                      setExistingRating(null);
                      setExistingReviewId(null);
                      setExistingComment('');
                    }}
                    style={styles.cancelButton}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  >
                    <TransletText text="Cancel" style={styles.cancelButtonText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={PostReview}
                    style={[styles.submitButton, !newRating && styles.submitButtonDisabled]}
                    disabled={!newRating}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  >
                    <TransletText
                      text={existingRating !== null ? 'Update Review' : 'Submit Review'}
                      style={styles.submitButtonText}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>

      </Modal>
    ),
    [
      writeModalVisible,
      newRating,
      newComment,
      selectedProductName,
      existingRating,
      selectedProductId,
      existingReviewId,
    ],
  );

  const renderEmptyComponent = useMemo(
    () => (
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#888', fontSize: 16 }}>
          No orders found for "{activeTab}".
        </Text>
      </View>
    ),
    [activeTab],
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation?.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image
                source={require('../../assets/Png/back.png')}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <TransletText style={styles.headerTitle} text="Orders" />

            <View style={{ width: 24 }} />
          </View>

          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={searchplaceholder}
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
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <TransletText
                      style={[
                        styles.tabText,
                        isActive ? styles.tabTextActive : null,
                      ]}
                      text={tab.label}
                    />

                  </TouchableOpacity>
                );
              })}
            </View>

            {isLoading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 100,
                }}
              >
                <TransletText style={{ color: '#888', fontSize: 16 }} text="Loading orders..." />

              </View>
            ) : (
              <FlatList
                keyExtractor={item => String(item.id)}
                data={filteredOrders}
                renderItem={renderOrder}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 20,
                }}
                ListEmptyComponent={renderEmptyComponent}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={21}
                removeClippedSubviews={true}
              />
            )}
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
      {renderModal}
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
  updateReviewButton: {
    backgroundColor: '#FF9500',
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
  moreItemsText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginTop: 4,
  },

  closeButtonText: {
    fontSize: 22,
    color: '#666',
    lineHeight: 24,
  },
  existingReviewNote: {
    fontSize: 14,
    color: '#FF9500',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  previousRatingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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