import React, { useEffect, useState, useContext } from 'react';
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
import { UserDataContext } from '../../context'; // Import the context

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
  // Use the UserDataContext
  const { userData } = useContext(UserDataContext);
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
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [existingComment, setExistingComment] = useState<string>('');

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

        // Debug: Check user data
        console.log('=== USER DATA CONTEXT ===');
        console.log('User Data:', userData);
        console.log(
          'User ID from context:',
          userData?.id || userData?.user_id || userData?.userId,
        );

        // Check specifically for ratings in the response
        console.log('=== CHECKING RATINGS IN ORDER DATA ===');
        apiOrders.forEach((order: any, index: number) => {
          console.log(`Order ${index + 1} (ID: ${order.id}):`);
          console.log('  - Items:', order.items);

          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any, itemIndex: number) => {
              console.log(`  Item ${itemIndex + 1}:`);
              console.log(`    - Product:`, item.product?.name);
              console.log(`    - Product reviews:`, item.product?.reviews);

              // Check for user's review
              if (
                item.product?.reviews &&
                Array.isArray(item.product.reviews)
              ) {
                const currentUserId =
                  userData?.id || userData?.user_id || userData?.userId;
                const userReview = item.product.reviews.find(
                  (review: any) =>
                    review.user_id === currentUserId ||
                    review.userId === currentUserId ||
                    review.user?.id === currentUserId,
                );

                if (userReview) {
                  console.log(`    - User's review found:`, userReview);
                } else {
                  console.log(
                    `    - No user review found for ID: ${currentUserId}`,
                  );
                }
              }
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
        review:
          newComment ||
          (existingRating !== null ? 'Updated review' : 'No comment'),
        product_id: selectedProductId,
        // Include review_id if updating
        ...(existingReviewId && { review_id: existingReviewId }),
      };

      console.log('=== REVIEW API CALLED ===');
      console.log('Product ID:', selectedProductId);
      console.log('Is Update:', existingRating !== null);
      console.log('Existing Review ID:', existingReviewId);
      console.log('New rating:', newRating);
      console.log('Previous rating:', existingRating);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      showLoader();

      const res = await UserService.Review(payload, selectedProductId);

      console.log('=== REVIEW API RESPONSE ===');
      console.log('Response status:', res?.status);
      console.log('Response data:', JSON.stringify(res?.data, null, 2));

      if (res && res?.data && res?.status === HttpStatusCode.Ok) {
        hideLoader();

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

        // Refresh order list with a slight delay
        setTimeout(() => {
          OrderList();
        }, 500);
      } else {
        hideLoader();
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

      let errorMessage = 'Something went wrong! Please try again.';
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);

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
    console.log('=== OPENING REVIEW MODAL ===');
    console.log('Product ID:', productId);
    console.log('Product Name:', productName);
    console.log('User Data from Context:', userData);

    if (!productId) {
      console.log('No productId provided!');
      Toast.show({
        type: 'error',
        text1: 'Product information not available',
      });
      return;
    }

    // Get current user ID from context - check for customer_id field
    const currentUserId =
      userData?.customer_id ||
      userData?.id ||
      userData?.user_id ||
      userData?.userId;
    console.log(
      'Current User ID from context (looking for customer_id):',
      currentUserId,
    );
    console.log('userData.customer_id:', userData?.customer_id);
    console.log('userData.id:', userData?.id);

    if (!currentUserId) {
      console.log('No user ID found!');
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

    // Debug: Log all orders to see structure
    console.log('=== SEARCHING FOR EXISTING REVIEW ===');
    console.log('Total orders:', order.length);

    // Search through all orders and items to find the user's review for this product
    order.forEach((orderItem: any, orderIndex: number) => {
      const itemsList = getItemsList(orderItem?.items);

      itemsList.forEach((item: any, itemIndex: number) => {
        const product = item?.product || item;
        const itemProductId =
          product?.id?.toString() || product?.product_id?.toString();

        console.log(`Order ${orderIndex}, Item ${itemIndex}:`);
        console.log('  - Item Product ID:', itemProductId);
        console.log('  - Target Product ID:', productId);
        console.log('  - Product reviews:', product?.reviews);

        if (itemProductId === productId) {
          console.log('  - PRODUCT MATCH FOUND!');

          // Check if there's a review from the current user
          if (product?.reviews && Array.isArray(product.reviews)) {
            console.log('  - Checking', product.reviews.length, 'reviews');

            // Find current user's review - check for customer_id field
            const currentUserReview = product.reviews.find((review: any) => {
              const reviewUserId =
                review.customer_id ||
                review.user_id ||
                review.userId ||
                review.user?.id;
              console.log('    - Review customer_id:', review.customer_id);
              console.log('    - Review user_id:', review.user_id);
              console.log('    - Current user ID:', currentUserId);
              console.log('    - Match?', reviewUserId == currentUserId);
              return reviewUserId == currentUserId;
            });

            if (currentUserReview) {
              console.log('  - USER REVIEW FOUND:', currentUserReview);
              foundRating = Number(currentUserReview.rating);
              foundComment =
                currentUserReview.review ||
                currentUserReview.comment ||
                currentUserReview.text ||
                '';
              foundReviewId =
                currentUserReview.id || currentUserReview.review_id || null;
            } else {
              console.log(
                '  - No user review found for customer_id:',
                currentUserId,
              );
              // Log all review customer IDs for debugging
              product.reviews.forEach((review: any, idx: number) => {
                console.log(
                  `    Review ${idx}: customer_id=${review.customer_id}, rating=${review.rating}`,
                );
              });
            }
          } else {
            console.log('  - No reviews array found');
          }
        }
      });
    });

    console.log('=== SEARCH RESULTS ===');
    console.log('Found rating:', foundRating);
    console.log('Found comment:', foundComment);
    console.log('Found review ID:', foundReviewId);

    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setExistingRating(foundRating);
    setExistingReviewId(foundReviewId);
    setExistingComment(foundComment);

    // Set the rating for the modal
    // If existing rating found, use it. Otherwise default to 5
    setNewRating(foundRating || 5);
    setNewComment(foundComment);

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
      // Get current user ID from context - check for customer_id field
      const currentUserId =
        userData?.customer_id ||
        userData?.id ||
        userData?.user_id ||
        userData?.userId;
      console.log('extractProductInfo - Current User ID:', currentUserId);

      // Try to find product ID in different possible paths
      let productId = null;
      let productName = null;
      let productRating = null;
      let userRating = null; // User's specific rating
      let customerReviews = [];

      // Path 1: items[0].product
      if (item?.items?.[0]?.product) {
        const product = item.items[0].product;
        productId = product.id.toString();
        productName = product.name;

        // Extract rating from reviews
        if (product.reviews && Array.isArray(product.reviews)) {
          customerReviews = product.reviews;

          // Find current user's review - check for customer_id field
          if (currentUserId) {
            console.log(
              'Looking for user review in',
              product.reviews.length,
              'reviews',
            );

            const userReview = product.reviews.find((review: any) => {
              // Check for customer_id (from API) or user_id (what your code expects)
              const reviewUserId =
                review.customer_id ||
                review.user_id ||
                review.userId ||
                review.user?.id;
              console.log(
                'Review customer_id:',
                review.customer_id,
                'Current user ID:',
                currentUserId,
                'Match?',
                reviewUserId == currentUserId,
              );
              return reviewUserId == currentUserId;
            });

            if (userReview) {
              console.log(
                'USER REVIEW FOUND in extractProductInfo:',
                userReview,
              );
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
      }
      // Path 2: items[0].product_id
      else if (item?.items?.[0]?.product_id) {
        productId = item.items[0].product_id.toString();
        productName = item.items[0].product_name || 'Product';
      }
      // Path 3: items[0].id (if it's the product itself)
      else if (item?.items?.[0]?.id) {
        productId = item.items[0].id.toString();
        productName = item.items[0].name || 'Product';
      }
      // Path 4: Check if items is an array with nested structure
      else if (Array.isArray(item?.items) && item.items.length > 0) {
        // Try to find any product reference in the array
        for (const orderItem of item.items) {
          if (orderItem?.product?.id) {
            productId = orderItem.product.id.toString();
            productName = orderItem.product.name;

            // Extract rating
            if (
              orderItem.product.reviews &&
              Array.isArray(orderItem.product.reviews)
            ) {
              customerReviews = orderItem.product.reviews;

              // Find user's rating - check for customer_id field
              if (currentUserId) {
                const userReview = orderItem.product.reviews.find(
                  (review: any) => {
                    const reviewUserId =
                      review.customer_id ||
                      review.user_id ||
                      review.userId ||
                      review.user?.id;
                    return reviewUserId == currentUserId;
                  },
                );

                if (userReview) {
                  userRating = Number(userReview.rating);
                }
              }

              if (orderItem.product.reviews.length > 0) {
                const sum = orderItem.product.reviews.reduce((acc, review) => {
                  return acc + Number(review.rating || 0);
                }, 0);
                productRating = sum / orderItem.product.reviews.length;
              }
            }
            break;
          }
        }
      }

      // If still not found, check direct product properties
      if (!productId && item?.product_id) {
        productId = item.product_id.toString();
        productName = item.product_name || 'Product';
      }

      console.log('extractProductInfo result:', {
        productId,
        productName,
        productRating,
        userRating,
        reviewCount: customerReviews.length,
      });

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
  };

  const renderOrder = ({ item }: { item: any }) => {
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

    // Use user's rating if available, otherwise use product average
    const displayRating = userRating !== null ? userRating : productRating;

    // Log the extracted rating for debugging
    console.log('Rendering order:', {
      orderId: item.id,
      productId,
      productName,
      productRating,
      userRating,
      displayRating,
      reviewCount: customerReviews.length,
    });

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
            <Text style={styles.rateReviewLabel}>
              {userRating !== null ? 'Update Review' : 'Rate & Review'}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: -10 }}>
              {[1, 2, 3, 4, 5].map(r => {
                const numericRating = Number(displayRating) || 0;

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

                // Calculate rating for this specific product
                let itemRating = null;
                let userItemRating = null;
                let itemReviewCount = 0;

                if (p?.reviews && Array.isArray(p.reviews)) {
                  itemReviewCount = p.reviews.length;

                  // Get current user ID
                  const currentUserId =
                    userData?.id || userData?.user_id || userData?.userId;

                  // Find user's review
                  const userReview = p.reviews.find((review: any) => {
                    const reviewUserId =
                      review.user_id || review.userId || review.user?.id;
                    return reviewUserId == currentUserId;
                  });

                  if (userReview) {
                    userItemRating = Number(userReview.rating);
                  }

                  // Calculate average rating
                  if (p.reviews.length > 0) {
                    const sum = p.reviews.reduce((acc, review) => {
                      return acc + Number(review.rating || 0);
                    }, 0);
                    itemRating = sum / p.reviews.length;
                  }
                }

                // Use user's rating if available
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
                      <Text style={{ fontWeight: '600' }}>
                        {currentProductName}
                      </Text>
                      <Text style={{ color: '#666', fontSize: 13 }}>
                        Qty: {it?.quantity || it?.qty || 1}{' '}
                        {p?.price ? `• ${p.price} €` : ''}
                      </Text>

                      {/* Display rating for this item */}
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
                          <Text
                            style={{
                              fontSize: 11,
                              color: '#666',
                              marginLeft: 4,
                            }}
                          >
                            ({displayItemRating.toFixed(1)}, {itemReviewCount}{' '}
                            review
                            {itemReviewCount !== 1 ? 's' : ''})
                            {userItemRating !== null && ' • Your rating'}
                          </Text>
                        </View>
                      )}

                      {currentProductId && (
                        <TouchableOpacity
                          onPress={() =>
                            handleOpenReviewModal(
                              currentProductId,
                              currentProductName,
                            )
                          }
                          style={[
                            styles.reviewButton,
                            userItemRating !== null &&
                              styles.updateReviewButton,
                          ]}
                        >
                          <Text style={styles.reviewButtonText}>
                            {userItemRating !== null
                              ? 'Update Review'
                              : 'Rate this item'}
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
                <Text style={styles.modalTitle}>
                  {existingRating !== null
                    ? 'Update Your Review'
                    : 'Write a Review'}
                </Text>
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
                  <View>
                    <Text style={styles.productNameLabel}>
                      Product: {selectedProductName}
                    </Text>
                    {existingRating !== null && (
                      <Text style={styles.existingReviewNote}>
                        You've already reviewed this product
                      </Text>
                    )}
                  </View>
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
                  {/* {existingRating !== null && (
                    <Text style={styles.previousRatingText}>
                      {' '}
                      (Previous: {existingRating})
                    </Text>
                  )} */}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Your Review{' '}
                  {existingRating !== null ? '(Edit)' : '(Optional)'}
                </Text>
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
                  <Text style={styles.submitButtonText}>
                    {existingRating !== null
                      ? 'Update Review'
                      : 'Submit Review'}
                  </Text>
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
  updateReviewButton: {
    backgroundColor: '#FF9500', // Orange color for update
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
