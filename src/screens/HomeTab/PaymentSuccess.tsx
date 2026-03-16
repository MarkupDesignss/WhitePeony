import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserService, Image_url } from '../../service/ApiService';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../../hooks/useAppSelector';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import TransletText from '../../components/TransletText'; // Add this import

const PaymentSuccess = ({ navigation, route }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  // Get params from route - ALL backend fields except client_secret
  const {
    orderId,
    paymentIntentId,  // stripe_order_id
    amount,           // amount_to_pay
    currency,
    status,
    errorMessage,
    trackingNumber,   // tracking_number
    message,          // backend message
  } = route.params || {};

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    'success' | 'failed' | 'pending'
  >(status || 'success');
  const [verifying, setVerifying] = useState(false);

  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );
  const { data: rates } = useGetRatesQuery(undefined);

  const displayPrice = (price: any): string => {
    return convertAndFormatPrice(price, selectedCurrency, rates);
  };

  useEffect(() => {
    fetchOrderDetails();

    if (paymentStatus === 'pending') {
      const interval = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      if (orderId) {
        const response = await UserService.getOrderById(orderId);
        console.log('📦 Order Details Response:', response.data);

        if (response?.data?.success) {
          setOrderDetails(response.data.data);

          if (
            response.data.data.payment_status === 'paid' ||
            response.data.data.payment_status === 'success'
          ) {
            setPaymentStatus('success');
          } else if (response.data.data.payment_status === 'failed') {
            setPaymentStatus('failed');
          } else {
            setPaymentStatus('pending');
          }
        } else {
          // Fallback to route params
          setOrderDetails({
            order_number: orderId,
            stripe_order_id: paymentIntentId,
            transaction_id: paymentIntentId,
            tracking_number: trackingNumber,
            grand_total: amount,
            currency: currency,
            message: message,
          });

          Toast.show({
            type: 'warning',
            text1: 'Order placed but details pending',
            text2: message || 'Your order is confirmed. Details will update shortly.',
          });
        }
      }
    } catch (error) {
      console.log('Error fetching order details:', error);

      setOrderDetails({
        order_number: orderId,
        stripe_order_id: paymentIntentId,
        transaction_id: paymentIntentId,
        tracking_number: trackingNumber,
        grand_total: amount,
        currency: currency,
        message: message,
      });

      Toast.show({
        type: 'error',
        text1: 'Could not load order details',
        text2: 'But your order is confirmed!',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (verifying) return;

    setVerifying(true);
    try {
      const response = await UserService.getOrderById(orderId);
      if (response?.data?.success) {
        const status = response.data.data.payment_status;

        if (status === 'paid' || status === 'success') {
          setPaymentStatus('success');
          setOrderDetails(response.data.data);
          Toast.show({
            type: 'success',
            text1: 'Payment Confirmed!',
            text2: 'Your payment has been successful',
          });
        } else if (status === 'failed') {
          setPaymentStatus('failed');
          setOrderDetails(response.data.data);
          Toast.show({
            type: 'error',
            text1: 'Payment Failed',
            text2:
              response.data.data.error_message ||
              'Your payment could not be processed',
          });
        }
      }
    } catch (error) {
      console.log('Error checking payment status:', error);
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const onShareReceipt = async () => {
    showLoader();
    try {
      const message = `
        🧾 ORDER RECEIPT
        🏢 White Peony
        
        Order #: ${orderDetails?.order_number || orderId}
        Date: ${formatDate(orderDetails?.created_at || new Date())}
        Transaction ID: ${orderDetails?.stripe_order_id || orderDetails?.transaction_id || paymentIntentId}
        Tracking Number: ${orderDetails?.tracking_number || trackingNumber || 'N/A'}
        
        📦 Order Summary
        Items: ${orderDetails?.items?.length || 0}
        Subtotal: ${displayPrice(orderDetails?.subtotal || 0)}
        Discount: -${displayPrice(orderDetails?.discount || 0)}
        Shipping: ${displayPrice(orderDetails?.shipping_cost || 0)}
        VAT: ${displayPrice(orderDetails?.vat_amount || 0)}
        Total: ${displayPrice(orderDetails?.grand_total || amount || 0)}
        
        💳 Payment Details
        Payment Status: ${paymentStatus === 'success'
          ? '✅ Paid'
          : paymentStatus === 'failed'
            ? '❌ Failed'
            : '⏳ Pending'
        }
        Order Status: ${orderDetails?.order_status || 'Processing'}
        Currency: ${currency || selectedCurrency}
        
        ${message ? `Note: ${message}` : ''}
        
        Thank you for shopping with White Peony!
        www.whitepoeny.com
      `;

      await Share.share({
        message: message.trim(),
        title: `Order Receipt #${orderDetails?.order_number || orderId}`,
      });
    } catch (err) {
      console.warn('share error', err);
      Alert.alert('Error', 'Could not share receipt');
    } finally {
      hideLoader();
    }
  };

  const onTrackOrder = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "OrdersScreen" }],
    });
  };

  const onContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'BottomTabScreen',
          params: { screen: 'Home' },
        },
      ],
    });
  };

  const onRetryPayment = () => {
    navigation.navigate('BottomTabScreen', {
      screen: 'Cart'
    });
  };

  const onContactSupport = () => {
    navigation.navigate('Support', {
      orderId: orderId,
      issue: 'payment_failed',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AEB254" />
        <TransletText text="Loading order details..." style={styles.loadingText} />
      </SafeAreaView>
    );
  }

  const renderStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return (
          <View style={[styles.iconContainer, styles.successContainer]}>
            <View style={[styles.statusCircle, styles.successCircle]}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.iconContainer, styles.failedContainer]}>
            <View style={[styles.statusCircle, styles.failedCircle]}>
              <Text style={styles.crossmark}>✕</Text>
            </View>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.iconContainer, styles.pendingContainer]}>
            <View style={[styles.statusCircle, styles.pendingCircle]}>
              <ActivityIndicator size="large" color="#FFA500" />
            </View>
          </View>
        );
    }
  };

  const renderStatusText = () => {
    switch (paymentStatus) {
      case 'success':
        return {
          title: 'Payment Successful! 🎉',
          sub: message || 'Your order has been placed successfully. Thank you for shopping with us!',
        };
      case 'failed':
        return {
          title: 'Payment Failed ❌',
          sub:
            errorMessage ||
            message ||
            'Your payment could not be processed. Please try again or use another payment method.',
        };
      case 'pending':
        return {
          title: 'Payment Processing ⏳',
          sub: message || 'Your payment is being processed. This may take a few moments. Please do not close the app.',
        };
    }
  };

  const statusText = renderStatusText();

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Status Icon */}
          {renderStatusIcon()}

          {/* Status Text */}
          <TransletText
            text={statusText.title}
            style={[
              styles.heading,
              paymentStatus === 'failed' && styles.failedHeading,
              paymentStatus === 'pending' && styles.pendingHeading,
            ]}
          />
          <TransletText text={statusText.sub} style={styles.sub} />

          {/* Order Details Card */}
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <TransletText
                text={`Order #${orderDetails?.order_number || orderId}`}
                style={styles.orderNumber}
              />
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      paymentStatus === 'success'
                        ? '#4CAF50'
                        : paymentStatus === 'failed'
                          ? '#F44336'
                          : '#FFA500',
                  },
                ]}
              >
                <TransletText
                  text={
                    paymentStatus === 'success'
                      ? 'Paid'
                      : paymentStatus === 'failed'
                        ? 'Failed'
                        : 'Pending'
                  }
                  style={styles.statusText}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Backend Response Details (excluding client_secret) */}
            <View style={styles.detailRow}>
              <TransletText text="Transaction ID:" style={styles.detailLabel} />
              <Text style={styles.detailValue} numberOfLines={1}>
                {orderDetails?.stripe_order_id ||
                  orderDetails?.transaction_id ||
                  paymentIntentId ||
                  'N/A'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <TransletText text="Tracking Number:" style={styles.detailLabel} />
              <Text style={styles.detailValue} numberOfLines={1}>
                {orderDetails?.tracking_number || trackingNumber || 'N/A'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <TransletText text="Date & Time:" style={styles.detailLabel} />
              <Text style={styles.detailValue}>
                {formatDate(orderDetails?.created_at || new Date())}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <TransletText text="Payment Method:" style={styles.detailLabel} />
              <TransletText
                text={orderDetails?.payment_method || 'Credit Card (Stripe)'}
                style={styles.detailValue}
              />
            </View>

            <View style={styles.detailRow}>
              <TransletText text="Order Status:" style={styles.detailLabel} />
              <TransletText
                text={
                  orderDetails?.order_status ||
                  (paymentStatus === 'success'
                    ? 'Confirmed'
                    : paymentStatus === 'failed'
                      ? 'Cancelled'
                      : 'Processing')
                }
                style={styles.detailValue}
              />
            </View>

            {/* Show backend message if available */}
            {(message || orderDetails?.message) && (
              <View style={styles.messageContainer}>
                <TransletText
                  text={message || orderDetails?.message}
                  style={styles.messageText}
                />
              </View>
            )}

            {/* Show error message if payment failed */}
            {paymentStatus === 'failed' &&
              (errorMessage || orderDetails?.error_message) && (
                <View style={styles.errorContainer}>
                  <TransletText
                    text={errorMessage || orderDetails?.error_message}
                    style={styles.errorText}
                  />
                </View>
              )}

            {/* Show pending message with retry option */}
            {paymentStatus === 'pending' && (
              <View style={styles.pendingContainer}>
                <ActivityIndicator size="small" color="#FFA500" />
                <TransletText
                  text={verifying ? 'Verifying payment...' : 'Waiting for confirmation...'}
                  style={styles.pendingStatusText}
                />
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={checkPaymentStatus}
                  disabled={verifying}
                >
                  <TransletText
                    text={verifying ? 'Checking...' : 'Refresh Status'}
                    style={styles.refreshButtonText}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />

            {/* Order Items Summary */}
            {orderDetails?.items && orderDetails.items.length > 0 && (
              <>
                <TransletText
                  text={`Items (${orderDetails?.items?.length})`}
                  style={styles.itemsTitle}
                />

                {orderDetails?.items
                  ?.slice(0, 3)
                  .map((item: any, index: number) => (
                    <View key={index} style={styles.itemRow}>
                      <Image
                        source={{
                          uri: Image_url + (item.image || item.product_image),
                        }}
                        style={styles.itemImage}
                        defaultSource={require('../../assets/Png/product.png')}
                      />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.product_name || item.name}
                        </Text>
                        <TransletText
                          text={`Qty: ${item.quantity}`}
                          style={styles.itemQuantity}
                        />
                      </View>
                      <Text style={styles.itemPrice}>
                        {displayPrice(item.total_price || item.price)}
                      </Text>
                    </View>
                  ))}

                {orderDetails?.items?.length > 3 && (
                  <TransletText
                    text={`+${orderDetails.items.length - 3} more items`}
                    style={styles.moreItems}
                  />
                )}

                <View style={styles.divider} />
              </>
            )}

            {/* Price Breakdown */}
            <View style={styles.priceRow}>
              <TransletText text="Subtotal" style={styles.priceLabel} />
              <Text style={styles.priceValue}>
                {displayPrice(orderDetails?.subtotal || 0)}
              </Text>
            </View>

            {orderDetails?.discount > 0 && (
              <View style={styles.priceRow}>
                <TransletText text="Discount" style={[styles.priceLabel, styles.discountLabel]} />
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -{displayPrice(orderDetails?.discount)}
                </Text>
              </View>
            )}

            <View style={styles.priceRow}>
              <TransletText text="Shipping" style={styles.priceLabel} />
              <TransletText
                text={orderDetails?.shipping_cost && orderDetails?.shipping_cost > 0
                  ? displayPrice(orderDetails?.shipping_cost)
                  : 'Free'}
                style={styles.priceValue}
              />
            </View>

            {orderDetails?.vat_amount > 0 && (
              <View style={styles.priceRow}>
                <TransletText text="VAT" style={styles.priceLabel} />
                <Text style={styles.priceValue}>
                  {displayPrice(orderDetails?.vat_amount)}
                </Text>
              </View>
            )}

            <View style={[styles.priceRow, styles.totalRow]}>
              <TransletText text="Total Paid" style={styles.totalLabel} />
              <Text
                style={[
                  styles.totalValue,
                  paymentStatus === 'failed' && styles.failedTotalValue,
                ]}
              >
                {displayPrice(orderDetails?.grand_total || amount || 0)}
              </Text>
            </View>

            {/* Shipping Address */}
            {orderDetails?.shipping_address && (
              <>
                <View style={styles.divider} />
                <TransletText text="Shipping Address" style={styles.addressTitle} />
                <TransletText
                  text={orderDetails.shipping_address.name}
                  style={styles.addressText}
                />
                <TransletText
                  text={orderDetails.shipping_address.full_address ||
                    `${orderDetails.shipping_address.address_line1}, ${orderDetails.shipping_address.address_line2 || ''
                    }`}
                  style={styles.addressText}
                />
                <TransletText
                  text={`${orderDetails.shipping_address.city}, ${orderDetails.shipping_address.postal_code}`}
                  style={styles.addressText}
                />
                <TransletText
                  text={`Phone: ${orderDetails.shipping_address.phone}`}
                  style={styles.addressText}
                />
              </>
            )}
          </View>

          {/* Action Buttons */}
          {paymentStatus === 'success' && (
            <>
              <TouchableOpacity
                style={styles.trackButton}
                onPress={onTrackOrder}
                activeOpacity={0.8}
              >
                <TransletText text="Track Order" style={styles.trackButtonText} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={onShareReceipt}
                activeOpacity={0.8}
              >
                <TransletText text="Share Receipt" style={styles.shareButtonText} />
              </TouchableOpacity>
            </>
          )}

          {paymentStatus === 'failed' && (
            <>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetryPayment}
                activeOpacity={0.8}
              >
                <TransletText text="Try Again" style={styles.retryButtonText} />
              </TouchableOpacity>

              {/* <TouchableOpacity
                style={styles.supportButton}
                onPress={onContactSupport}
                activeOpacity={0.8}
              >
                <TransletText text="Contact Support" style={styles.supportButtonText} />
              </TouchableOpacity> */}
            </>
          )}

          {paymentStatus === 'pending' && !verifying && (
            <>
              <TouchableOpacity
                style={styles.checkStatusButton}
                onPress={checkPaymentStatus}
                activeOpacity={0.8}
              >
                <TransletText
                  text="Check Payment Status"
                  style={styles.checkStatusButtonText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={onContinueShopping}
                activeOpacity={0.8}
              >
                <TransletText
                  text="Continue Shopping →"
                  style={styles.homeButtonText}
                />
              </TouchableOpacity>
            </>
          )}

          {paymentStatus !== 'pending' && (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={onContinueShopping}
              activeOpacity={0.8}
            >
              <TransletText
                text="← Continue Shopping"
                style={styles.homeButtonText}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentSuccess;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    marginTop: 20,
  },
  successContainer: {},
  failedContainer: {},
  pendingContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 16,
  },
  statusCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successCircle: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  failedCircle: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },
  pendingCircle: {
    backgroundColor: '#FFF3E0',
    shadowColor: '#FFA500',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  checkmark: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  crossmark: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  failedHeading: {
    color: '#F44336',
  },
  pendingHeading: {
    color: '#FFA500',
  },
  sub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Poppins-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    flex: 0.4,
    fontFamily: 'Poppins-Regular',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 0.6,
    textAlign: 'right',
    fontFamily: 'Poppins-Medium',
  },
  messageContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  messageText: {
    color: '#2E7D32',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  pendingStatusText: {
    marginTop: 8,
    fontSize: 13,
    color: '#FFA500',
    fontFamily: 'Poppins-Medium',
  },
  refreshButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#FFA500',
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  itemsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
    fontFamily: 'Poppins-Medium',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEB254',
    fontFamily: 'Poppins-SemiBold',
  },
  moreItems: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    fontFamily: 'Poppins-Medium',
  },
  discountLabel: {
    color: '#4CAF50',
  },
  discountValue: {
    color: '#4CAF50',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Poppins-SemiBold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#AEB254',
    fontFamily: 'Poppins-Bold',
  },
  failedTotalValue: {
    color: '#F44336',
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'Poppins-SemiBold',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  trackButton: {
    backgroundColor: '#AEB254',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  shareButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#AEB254',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#AEB254',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  supportButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    marginBottom: 12,
  },
  supportButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  checkStatusButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkStatusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  homeButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  homeButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Medium',
  },
});