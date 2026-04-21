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
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { formatDate } from '../../helpers/helpers';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
import { UserDataContext } from '../../context';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Theme ────────────────────────────────────────────────────────────────────
const T = {
  accent: '#AEB254',
  accentBg: '#F4F5E8',
  accentDark: '#8A8C3E',
  bg: '#F6F6F4',
  card: '#FFFFFF',
  border: '#EBEBEB',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textHint: '#AAAAAA',
  overlay: 'rgba(0,0,0,0.45)',
  status: {
    placed: { text: '#8A6D20', bg: '#FDF5E6' },
    confirmed: { text: '#2A6A4A', bg: '#EAF6EF' },
    shipped: { text: '#7A5A8A', bg: '#F3EDF8' },
    delivered: { text: '#2A6A4A', bg: '#EAF6EF' },
    cancelled: { text: '#9B3333', bg: '#FDEAEA' },
  },
};

// ── Types ────────────────────────────────────────────────────────────────────
type ProductVariant = {
  id: number;
  unit: string;
  stock: string;
  price: string;
  discount: string | null;
};

type OrderProduct = {
  id: number;
  name: string;
  description?: string;
  front_image?: string;
  back_image?: string;
  variants?: ProductVariant[];
};

type OrderItem = {
  id: number;
  order_id: string;
  product_id: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
  product: OrderProduct;
};

type UiOrder = {
  id: number;
  customer_id: string;
  cart_id: string;
  status: string;
  address_id: string;
  shipping_id: string;
  total_amount: string;
  discount_amount: string;
  final_total: string;
  stripe_order_id: string;
  payment_status: string;
  tracking_number: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

// ── Helper functions ─────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const paymentLabel: Record<string, string> = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
};

const imgUri = (path?: string | null) =>
  path ? { uri: Image_url + path } : require('../../assets/Png/product.png');

// ===================== REVIEW MODAL (Professional & Independent) =====================
// ===================== REVIEW MODAL (Keyboard‑friendly) =====================
import {
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

const ReviewModal = ({
  visible,
  onClose,
  product,
  customerId,
  onReviewSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  product: OrderProduct | null;
  customerId: string | null;
  onReviewSubmitted?: () => void;
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  // Inline error state
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible && product && customerId) {
      loadExistingReview();
    } else {
      setRating(0);
      setReviewText('');
      setExistingReviewId(null);
      setErrorMsg('');
    }
  }, [visible, product, customerId]);

  const loadExistingReview = async () => {
    if (!product) return;
    setFetching(true);
    try {
      const res = await UserService.Reviewlist(product.id);
      if (res?.data?.data && Array.isArray(res.data.data)) {
        const myReview = res.data.data.find(
          (rev: any) => String(rev.customer_id) === String(customerId),
        );
        if (myReview) {
          setRating(myReview.rating);
          setReviewText(myReview.review);
          setExistingReviewId(myReview.id);
        } else {
          setRating(0);
          setReviewText('');
          setExistingReviewId(null);
        }
      }
    } catch (error) {
      console.log('Error loading review:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!product) return;
    // Inline validation – no Toast
    if (rating === 0) {
      setErrorMsg('Please select a rating');
      return;
    }
    if (!reviewText.trim()) {
      setErrorMsg('Please write a review');
      return;
    }
    setErrorMsg(''); // clear any previous error

    setLoading(true);
    try {
      const payload = {
        rating: rating,
        review: reviewText.trim(),
      };
      await UserService.Review(payload, product.id);
      Toast.show({
        type: 'success',
        text1: existingReviewId ? 'Review updated' : 'Review submitted',
      });
      onReviewSubmitted?.();
      onClose();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to save review' });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => (
    <View style={reviewStyles.starsRow}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => {
            setRating(star);
            setErrorMsg(''); // clear error when user interacts
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              reviewStyles.star,
              star <= rating ? reviewStyles.starFilled : reviewStyles.starEmpty,
            ]}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={reviewStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={reviewStyles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={reviewStyles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View style={reviewStyles.productHeader}>
                <Image
                  source={imgUri(product.front_image)}
                  style={reviewStyles.productImage}
                />
                <Text style={reviewStyles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
              </View>

              <Text style={reviewStyles.title}>
                {existingReviewId ? 'Update Your Review' : 'Write a Review'}
              </Text>

              {fetching ? (
                <ActivityIndicator
                  color={T.accent}
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <>
                  {renderStars()}
                  <TextInput
                    style={[
                      reviewStyles.input,
                      errorMsg ? reviewStyles.inputError : null,
                    ]}
                    placeholder="Share your experience with this product..."
                    placeholderTextColor={T.textHint}
                    multiline
                    numberOfLines={4}
                    value={reviewText}
                    onChangeText={text => {
                      setReviewText(text);
                      if (errorMsg) setErrorMsg('');
                    }}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                  {errorMsg ? (
                    <Text style={reviewStyles.errorText}>{errorMsg}</Text>
                  ) : null}
                  <View style={reviewStyles.buttonsRow}>
                    <TouchableOpacity
                      style={[reviewStyles.btn, reviewStyles.cancelBtn]}
                      onPress={onClose}
                    >
                      <Text style={reviewStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        reviewStyles.btn,
                        reviewStyles.submitBtn,
                        loading && { opacity: 0.6 },
                      ]}
                      onPress={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={reviewStyles.submitText}>
                          {existingReviewId ? 'Update Review' : 'Submit Review'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const reviewStyles = StyleSheet.create({
  inputError: {
    borderColor: '#E53935',
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
    marginLeft: 4,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.overlay,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: SCREEN_H * 0.85, // limit height, enables scrolling
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: T.bg,
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.text,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  star: {
    fontSize: 32,
    marginHorizontal: 4,
  },
  starFilled: {
    color: '#FFB800',
  },
  starEmpty: {
    color: '#D3D3D3',
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: T.text,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  submitBtn: {
    backgroundColor: T.accent,
  },
  cancelText: {
    color: T.textSub,
    fontWeight: '600',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
});

// ===================== ITEMS MODAL (No review modal inside, just callback) =====================
const SHEET_MAX_H = SCREEN_H * 0.88;

const ItemsModal = ({
  order,
  visible,
  onClose,
  displayPrice,
  onWriteReview,
}: {
  order: UiOrder | null;
  visible: boolean;
  onClose: () => void;
  displayPrice: (v: any) => string;
  onWriteReview: (product: OrderProduct) => void;
}) => {
  if (!order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={itemsStyles.backdrop} onPress={onClose} />
      <View style={itemsStyles.sheet}>
        <View style={itemsStyles.handle} />
        <View style={itemsStyles.modalHeader}>
          <View>
            <Text style={itemsStyles.modalTitle}>Order #{order.id}</Text>
            <Text style={itemsStyles.modalSub}>
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={itemsStyles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={itemsStyles.closeX}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={itemsStyles.divider} />
        <ScrollView
          style={itemsStyles.scroll}
          contentContainerStyle={itemsStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {order.items.map((orderItem, idx) => {
            const p = orderItem.product;
            return (
              <View
                key={orderItem.id}
                style={[itemsStyles.itemCard, idx > 0 && { marginTop: 12 }]}
              >
                <View style={itemsStyles.imagesRow}>
                  <Image
                    source={imgUri(p?.front_image)}
                    style={itemsStyles.imgMain}
                    resizeMode="cover"
                  />
                  {p?.back_image ? (
                    <Image
                      source={imgUri(p.back_image)}
                      style={itemsStyles.imgSecond}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
                <View style={itemsStyles.itemBody}>
                  <Text style={itemsStyles.itemName} numberOfLines={2}>
                    {p?.name || 'Product'}
                  </Text>
                  {p?.variants && p.variants.length > 0 && (
                    <View style={itemsStyles.variantsRow}>
                      {p.variants.map(v => (
                        <View key={v.id} style={itemsStyles.variantChip}>
                          <Text style={itemsStyles.variantText}>{v.unit}</Text>
                          <Text style={itemsStyles.variantPrice}>
                            {displayPrice(v.price)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={itemsStyles.itemFooter}>
                    <Text style={itemsStyles.itemQtyLabel}>
                      Qty:{' '}
                      <Text style={itemsStyles.itemQtyVal}>
                        {orderItem.quantity}
                      </Text>
                    </Text>
                    <Text style={itemsStyles.itemSubtotal}>
                      {displayPrice(orderItem.subtotal)}
                    </Text>
                  </View>
                  {/* Review Button */}
                  <TouchableOpacity
                    style={itemsStyles.reviewBtn}
                    onPress={() => p && onWriteReview(p)}
                  >
                    <Text style={itemsStyles.reviewBtnText}>
                      Write a Review
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <View style={itemsStyles.totalCard}>
            {Number(order.discount_amount) > 0 && (
              <>
                <View style={itemsStyles.totalRow}>
                  <Text style={itemsStyles.totalLbl}>Subtotal</Text>
                  <Text style={itemsStyles.totalVal}>
                    {displayPrice(order.total_amount)}
                  </Text>
                </View>
                <View style={itemsStyles.totalRow}>
                  <Text style={itemsStyles.totalLbl}>Discount</Text>
                  <Text style={[itemsStyles.totalVal, { color: '#2A6A4A' }]}>
                    −{displayPrice(order.discount_amount)}
                  </Text>
                </View>
              </>
            )}
            <View style={[itemsStyles.totalRow, itemsStyles.grandRow]}>
              <Text style={itemsStyles.grandLbl}>Total</Text>
              <Text style={itemsStyles.grandVal}>
                {displayPrice(order.final_total)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const itemsStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_H,
    backgroundColor: T.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    flexShrink: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexShrink: 0,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  modalSub: { fontSize: 12, color: T.textHint, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    fontSize: 20,
    color: T.textSub,
    lineHeight: 22,
    textAlign: 'center',
  },
  divider: { height: 0.5, backgroundColor: T.border, flexShrink: 0 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  itemCard: {
    backgroundColor: T.bg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: T.border,
  },
  imagesRow: { flexDirection: 'row', height: 160 },
  imgMain: { flex: 1, backgroundColor: '#EFEFED' },
  imgSecond: {
    width: 100,
    backgroundColor: '#EFEFED',
    borderLeftWidth: 0.5,
    borderLeftColor: T.border,
  },
  itemBody: { padding: 12, backgroundColor: T.card },
  itemName: { fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 8 },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.accentBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: T.accent,
  },
  variantText: { fontSize: 11, color: T.accentDark, fontWeight: '500' },
  variantPrice: { fontSize: 11, color: T.accentDark, fontWeight: '700' },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: T.border,
  },
  itemQtyLabel: { fontSize: 12, color: T.textHint },
  itemQtyVal: { color: T.textSub, fontWeight: '600' },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: T.accent },
  totalCard: {
    marginTop: 14,
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: T.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLbl: { fontSize: 13, color: T.textHint },
  totalVal: { fontSize: 13, color: T.textSub, fontWeight: '500' },
  grandRow: {
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: T.border,
    marginBottom: 0,
  },
  grandLbl: { fontSize: 14, fontWeight: '700', color: T.text },
  grandVal: { fontSize: 16, fontWeight: '800', color: T.accent },
  reviewBtn: {
    marginTop: 12,
    backgroundColor: T.accentBg,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  reviewBtnText: { fontSize: 12, fontWeight: '600', color: T.accentDark },
});

// ===================== ORDER CARD =====================
const OrderCard = ({
  item,
  onViewItems,
  displayPrice,
}: {
  item: UiOrder;
  onViewItems: () => void;
  displayPrice: (v: any) => string;
}) => {
  const statusKey = item.status?.toLowerCase() || '';
  const statusStyle = (T.status as any)[statusKey] || {
    text: T.textSub,
    bg: '#F5F5F5',
  };
  const label = statusLabel[statusKey] || item.status || '—';
  const payKey = item.payment_status?.toLowerCase() || '';
  const payText = paymentLabel[payKey] || item.payment_status || '—';
  const total = displayPrice(item.final_total || item.total_amount);
  const itemCount = item.items?.length || 0;
  const firstProduct = item.items?.[0]?.product;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardTop}>
        <Image
          source={imgUri(firstProduct?.front_image)}
          style={cardStyles.thumb}
          resizeMode="cover"
        />
        <View style={cardStyles.cardMid}>
          <Text style={cardStyles.orderId}>Order #{item.id}</Text>
          {firstProduct?.name ? (
            <Text style={cardStyles.productName} numberOfLines={1}>
              {firstProduct.name}
            </Text>
          ) : null}
          <Text style={cardStyles.orderDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={cardStyles.cardRight}>
          <Text style={cardStyles.amount}>{total}</Text>
          <View style={[cardStyles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[cardStyles.badgeText, { color: statusStyle.text }]}>
              {label}
            </Text>
          </View>
        </View>
      </View>
      <View style={cardStyles.divider} />
      <View style={cardStyles.detailStrip}>
        {item.tracking_number ? (
          <View style={cardStyles.stripItem}>
            <Text style={cardStyles.stripLabel}>Tracking</Text>
            <Text
              style={[cardStyles.stripValue, { color: T.accent }]}
              numberOfLines={1}
            >
              {item.tracking_number}
            </Text>
          </View>
        ) : null}
        <View style={cardStyles.stripItem}>
          <Text style={cardStyles.stripLabel}>Payment</Text>
          <Text style={cardStyles.stripValue}>{payText}</Text>
        </View>
        <View style={cardStyles.stripItem}>
          <Text style={cardStyles.stripLabel}>Items</Text>
          <Text style={cardStyles.stripValue}>{itemCount}</Text>
        </View>
      </View>
      {itemCount > 0 && (
        <>
          <View style={cardStyles.divider} />
          <TouchableOpacity
            style={cardStyles.viewBtn}
            onPress={onViewItems}
            activeOpacity={0.8}
          >
            <Text style={cardStyles.viewBtnText}>View Items</Text>
            <Text style={cardStyles.viewBtnArrow}>›</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: T.card,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: T.border,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: T.bg },
  cardMid: { flex: 1, gap: 2 },
  orderId: { fontSize: 13, fontWeight: '700', color: T.text },
  productName: { fontSize: 12, color: T.textSub },
  orderDate: { fontSize: 11, color: T.textHint },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  amount: { fontSize: 14, fontWeight: '700', color: T.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: T.border },
  detailStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  stripItem: { flex: 1, alignItems: 'center' },
  stripLabel: { fontSize: 11, color: T.textHint, marginBottom: 2 },
  stripValue: { fontSize: 12, fontWeight: '600', color: T.textSub },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    backgroundColor: T.accentBg,
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: T.accentDark },
  viewBtnArrow: { fontSize: 16, color: T.accentDark, lineHeight: 18 },
});

// ===================== MAIN SCREEN =====================
const OrdersScreen = ({ navigation }: { navigation: any }) => {
  const { translatedText: searchPlaceholder } =
    useAutoTranslate('Search orders…');
  const { userData } = useContext(UserDataContext);
  const customerId = userData?.id ? String(userData.id) : null;

  const selectedCurrency = useAppSelector(s => s.currency.selectedCurrency);
  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });
  const displayPrice = useCallback(
    (v: any) => convertAndFormatPrice(v, selectedCurrency, rates),
    [selectedCurrency, rates],
  );

  const [searchText, setSearchText] = useState('');
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOrder, setModalOrder] = useState<UiOrder | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<OrderProduct | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await UserService.order();
      if (res?.data?.success && res?.data?.orders) {
        const sorted = [...res.data.orders].sort(
          (a: UiOrder, b: UiOrder) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setOrders(sorted);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load orders' });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const openModal = useCallback((order: UiOrder) => {
    setModalOrder(order);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleWriteReview = useCallback((product: OrderProduct) => {
    // Close items modal first, then open review modal
    setModalVisible(false);
    // Small delay to allow modal close animation to finish (optional but smoother)
    setTimeout(() => {
      setReviewProduct(product);
      setReviewModalVisible(true);
    }, 200);
  }, []);

  const closeReviewModal = useCallback(() => {
    setReviewModalVisible(false);
    setReviewProduct(null);
  }, []);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return orders;
    const q = searchText.toLowerCase();
    return orders.filter(
      o =>
        o.id?.toString().includes(q) ||
        o.tracking_number?.toLowerCase().includes(q),
    );
  }, [orders, searchText]);

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={T.card} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Image
            source={require('../../assets/Png/back.png')}
            style={s.backIcon}
          />
        </TouchableOpacity>
        <TransletText text="My Orders" style={s.headerTitle} />
        <View style={{ width: 36 }} />
      </View>
      <View style={s.searchWrap}>
        <Image
          source={require('../../assets/Png/search.png')}
          style={s.searchIcon}
        />
        <TextInput
          style={s.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={T.textHint}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.clearX}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      {isLoading && !refreshing ? (
        <View style={s.loader}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <OrderCard
              item={item}
              onViewItems={() => openModal(item)}
              displayPrice={displayPrice}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>
                {searchText ? 'No results' : 'No orders yet'}
              </Text>
              <Text style={s.emptySub}>
                {searchText
                  ? 'Try different keywords.'
                  : 'Your orders will appear here.'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[T.accent]}
              tintColor={T.accent}
            />
          }
        />
      )}
      <ItemsModal
        order={modalOrder}
        visible={modalVisible}
        onClose={closeModal}
        displayPrice={displayPrice}
        onWriteReview={handleWriteReview}
      />
      <ReviewModal
        visible={reviewModalVisible}
        onClose={closeReviewModal}
        product={reviewProduct}
        customerId={customerId}
        onReviewSubmitted={() => {
          // Optional: refresh orders or show a toast
        }}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.card,
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.bg,
    borderWidth: 0.5,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { width: 16, height: 16, tintColor: T.textSub },
  headerTitle: { fontSize: 16, fontWeight: '600', color: T.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderWidth: 0.5,
    borderColor: T.border,
    borderRadius: 10,
    marginHorizontal: 14,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: { width: 15, height: 15, tintColor: T.textHint },
  searchInput: { flex: 1, fontSize: 13, color: T.text, padding: 0 },
  clearX: { fontSize: 18, color: T.textHint, lineHeight: 20 },
  listContent: { paddingHorizontal: 14, paddingBottom: 24 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: T.text,
    marginBottom: 6,
  },
  emptySub: { fontSize: 13, color: T.textHint, textAlign: 'center' },
});

export default OrdersScreen;
