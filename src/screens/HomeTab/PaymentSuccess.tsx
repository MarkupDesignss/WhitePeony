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
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserService, Image_url } from '../../service/ApiService';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../../hooks/useAppSelector';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';

const PaymentSuccess = ({ navigation, route }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  const { orderId, paymentIntentId, amount, currency, status } = route.params || {};
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending'>(status || 'success');

  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );
  const { data: rates } = useGetRatesQuery(undefined);

  const displayPrice = (price: any): string => {
    return convertAndFormatPrice(price, selectedCurrency, rates);
  };

  useEffect(() => {
    fetchOrderDetails();

    // Agar payment pending hai toh 5 second baad status check karo
    if (paymentStatus === 'pending') {
      const interval = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await UserService.getOrderById(orderId);
      if (response?.data?.success) {
        setOrderDetails(response.data.data);
        // Update payment status from API response
        if (response.data.data.payment_status === 'paid') {
          setPaymentStatus('success');
        } else if (response.data.data.payment_status === 'failed') {
          setPaymentStatus('failed');
        } else {
          setPaymentStatus('pending');
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to load order details',
        });
      }
    } catch (error) {
      console.log('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await UserService.getOrderById(orderId);
      if (response?.data?.success) {
        const status = response.data.data.payment_status;
        if (status === 'paid') {
          setPaymentStatus('success');
          setOrderDetails(response.data.data);
          Toast.show({
            type: 'success',
            text1: 'Payment Confirmed!',
            text2: 'Your payment has been successful',
          });
        } else if (status === 'failed') {
          setPaymentStatus('failed');
          Toast.show({
            type: 'error',
            text1: 'Payment Failed',
            text2: 'Your payment could not be processed',
          });
        }
      }
    } catch (error) {
      console.log('Error checking payment status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onShareReceipt = async () => {
    showLoader();
    try {
      const message = `
        🧾 ORDER RECEIPT
        Order #: ${orderDetails?.order_number || orderId}
        Date: ${formatDate(orderDetails?.created_at || new Date())}
        Transaction ID: ${orderDetails?.transaction_id || paymentIntentId}
        
        Items: ${orderDetails?.items?.length || 0}
        Subtotal: ${displayPrice(orderDetails?.subtotal || 0)}
        Discount: -${displayPrice(orderDetails?.discount || 0)}
        Shipping: ${displayPrice(orderDetails?.shipping_cost || 0)}
        VAT: ${displayPrice(orderDetails?.vat_amount || 0)}
        Total: ${displayPrice(orderDetails?.grand_total || amount || 0)}
        
        Payment Status: ${paymentStatus === 'success' ? 'Paid ✅' : paymentStatus === 'failed' ? 'Failed ❌' : 'Pending ⏳'}
        Order Status: ${orderDetails?.order_status || 'Processing'}
        
        Thank you for shopping with White Peony!
      `;

      await Share.share({
        message: message.trim(),
        title: `Order Receipt #${orderDetails?.order_number || orderId}`,
      });
    } catch (err) {
      console.warn('share error', err);
    } finally {
      hideLoader();
    }
  };

  const onTrackOrder = () => {
    navigation.navigate('Orders', {
      screen: 'OrderDetail',
      params: { orderId: orderId },
    });
  };

  const onContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'BottomTabScreen',
          params: { screen: 'HomeScreen' },
        },
      ],
    });
  };

  const onRetryPayment = () => {
    navigation.navigate('Checkout');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AEB254" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  // 🟢 Different UI based on payment status
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
          title: 'Payment Successful!',
          sub: 'Your order has been placed successfully.',
        };
      case 'failed':
        return {
          title: 'Payment Failed',
          sub: 'Your payment could not be processed. Please try again.',
        };
      case 'pending':
        return {
          title: 'Payment Processing',
          sub: 'Your payment is being processed. This may take a few moments.',
        };
    }
  };

  const statusText = renderStatusText();

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Status Icon - Changes based on payment status */}
          {renderStatusIcon()}

          <Text style={[
            styles.heading,
            paymentStatus === 'failed' && styles.failedHeading,
            paymentStatus === 'pending' && styles.pendingHeading
          ]}>
            {statusText.title}
          </Text>
          <Text style={styles.sub}>
            {statusText.sub}
          </Text>

          {/* Order Details Card - Show only if payment successful or we have details */}
          {(paymentStatus === 'success' || orderDetails) && (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>
                  Order #{orderDetails?.order_number || orderId}
                </Text>
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
                  <Text style={styles.statusText}>
                    {paymentStatus === 'success' ? 'Paid' : paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Transaction Details */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {orderDetails?.transaction_id || paymentIntentId || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(orderDetails?.created_at || new Date())}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>
                  {orderDetails?.payment_method || 'Credit Card (Stripe)'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Status:</Text>
                <Text style={styles.detailValue}>
                  {orderDetails?.order_status ||
                    (paymentStatus === 'success' ? 'Confirmed' :
                      paymentStatus === 'failed' ? 'Cancelled' : 'Processing')}
                </Text>
              </View>

              {/* Show error message if payment failed */}
              {paymentStatus === 'failed' && orderDetails?.error_message && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{orderDetails.error_message}</Text>
                </View>
              )}

              <View style={styles.divider} />

              {/* Order Items Summary - Only show if items exist */}
              {orderDetails?.items && orderDetails.items.length > 0 && (
                <>
                  <Text style={styles.itemsTitle}>
                    Items ({orderDetails?.items?.length || 0})
                  </Text>

                  {orderDetails?.items
                    ?.slice(0, 3)
                    .map((item: any, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <Image
                          source={{ uri: Image_url + item.image }}
                          style={styles.itemImage}
                        />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.product_name}
                          </Text>
                          <Text style={styles.itemQuantity}>
                            Qty: {item.quantity}
                          </Text>
                        </View>
                        <Text style={styles.itemPrice}>
                          {displayPrice(item.total_price)}
                        </Text>
                      </View>
                    ))}

                  {orderDetails?.items?.length > 3 && (
                    <Text style={styles.moreItems}>
                      +{orderDetails.items.length - 3} more items
                    </Text>
                  )}

                  <View style={styles.divider} />
                </>
              )}

              {/* Price Breakdown */}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>
                  {displayPrice(orderDetails?.subtotal || 0)}
                </Text>
              </View>

              {orderDetails?.discount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.discountLabel]}>
                    Discount
                  </Text>
                  <Text style={[styles.priceValue, styles.discountValue]}>
                    -{displayPrice(orderDetails?.discount)}
                  </Text>
                </View>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Shipping</Text>
                <Text style={styles.priceValue}>
                  {orderDetails?.shipping_cost > 0
                    ? displayPrice(orderDetails?.shipping_cost)
                    : 'Free'}
                </Text>
              </View>

              {orderDetails?.vat_amount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>VAT</Text>
                  <Text style={styles.priceValue}>
                    {displayPrice(orderDetails?.vat_amount)}
                  </Text>
                </View>
              )}

              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[
                  styles.totalValue,
                  paymentStatus === 'failed' && styles.failedTotalValue
                ]}>
                  {displayPrice(orderDetails?.grand_total || amount || 0)}
                </Text>
              </View>

              {/* Shipping Address - Only show if exists */}
              {orderDetails?.shipping_address && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.addressTitle}>Shipping Address</Text>
                  <Text style={styles.addressText}>
                    {orderDetails.shipping_address.name}
                  </Text>
                  <Text style={styles.addressText}>
                    {orderDetails.shipping_address.full_address}
                  </Text>
                  <Text style={styles.addressText}>
                    {orderDetails.shipping_address.city},{' '}
                    {orderDetails.shipping_address.postal_code}
                  </Text>
                  <Text style={styles.addressText}>
                    Phone: {orderDetails.shipping_address.phone}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Action Buttons - Different based on status */}
          {paymentStatus === 'success' && (
            <>
              <TouchableOpacity style={styles.trackButton} onPress={onTrackOrder}>
                <Text style={styles.trackButtonText}>Track Order</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareButton} onPress={onShareReceipt}>
                <Text style={styles.shareButtonText}>Share Receipt</Text>
              </TouchableOpacity>
            </>
          )}

          {paymentStatus === 'failed' && (
            <>
              <TouchableOpacity style={styles.retryButton} onPress={onRetryPayment}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support')}>
                <Text style={styles.supportButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </>
          )}

          {paymentStatus === 'pending' && (
            <View style={styles.pendingMessage}>
              <ActivityIndicator size="small" color="#FFA500" />
              <Text style={styles.pendingText}>We're confirming your payment...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.homeButton}
            onPress={onContinueShopping}
          >
            <Text style={styles.homeButtonText}>← Continue Shopping</Text>
          </TouchableOpacity>
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
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    marginTop: 20,
  },
  successContainer: {
    // No extra styles needed
  },
  failedContainer: {
    // No extra styles needed
  },
  pendingContainer: {
    // No extra styles needed
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
  },
  failedHeading: {
    color: '#F44336',
  },
  pendingHeading: {
    color: '#FFA500',
  },
  sub: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 0.6,
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 13,
    textAlign: 'center',
  },
  itemsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
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
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEB254',
  },
  moreItems: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
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
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#AEB254',
  },
  failedTotalValue: {
    color: '#F44336',
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
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
  },
  pendingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 16,
  },
  pendingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FFA500',
  },
  homeButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  homeButtonText: {
    fontSize: 14,
    color: '#666',
  },
});