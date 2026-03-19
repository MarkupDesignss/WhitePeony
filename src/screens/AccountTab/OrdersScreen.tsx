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

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Items Modal ───────────────────────────────────────────────────────────────
// KEY FIX: The sheet is given a fixed maxHeight and the ScrollView fills the
// remaining space via `flex: 1`. The backdrop tap-to-close uses a separate
// absolute-positioned Pressable so it never intercepts scroll touches.
const SHEET_MAX_H = SCREEN_H * 0.88;

const ItemsModal = ({
  order,
  visible,
  onClose,
  displayPrice,
}: {
  order: UiOrder | null;
  visible: boolean;
  onClose: () => void;
  displayPrice: (v: any) => string;
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
      {/* Backdrop — separate layer, never overlaps sheet */}
      <Pressable style={ms.backdrop} onPress={onClose} />

      {/* Sheet — NOT inside the backdrop Pressable */}
      <View style={ms.sheet}>
        {/* Drag handle */}
        <View style={ms.handle} />

        {/* Header — fixed, does not scroll */}
        <View style={ms.modalHeader}>
          <View>
            <Text style={ms.modalTitle}>Order #{order.id}</Text>
            <Text style={ms.modalSub}>
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={ms.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={ms.closeX}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={ms.divider} />

        {/* Scrollable content — flex:1 means it takes all remaining height */}
        <ScrollView
          style={ms.scroll}
          contentContainerStyle={ms.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {order.items.map((orderItem, idx) => {
            const p = orderItem.product;
            return (
              <View
                key={orderItem.id}
                style={[ms.itemCard, idx > 0 && { marginTop: 12 }]}
              >
                {/* Images */}
                <View style={ms.imagesRow}>
                  <Image
                    source={imgUri(p?.front_image)}
                    style={ms.imgMain}
                    resizeMode="cover"
                  />
                  {p?.back_image ? (
                    <Image
                      source={imgUri(p.back_image)}
                      style={ms.imgSecond}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>

                {/* Body */}
                <View style={ms.itemBody}>
                  <Text style={ms.itemName} numberOfLines={2}>
                    {p?.name || 'Product'}
                  </Text>

                  {/* Variant chips */}
                  {p?.variants && p.variants.length > 0 && (
                    <View style={ms.variantsRow}>
                      {p.variants.map(v => (
                        <View key={v.id} style={ms.variantChip}>
                          <Text style={ms.variantText}>{v.unit}</Text>
                          <Text style={ms.variantPrice}>
                            {displayPrice(v.price)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Qty + subtotal */}
                  <View style={ms.itemFooter}>
                    <Text style={ms.itemQtyLabel}>
                      Qty:{' '}
                      <Text style={ms.itemQtyVal}>{orderItem.quantity}</Text>
                    </Text>
                    <Text style={ms.itemSubtotal}>
                      {displayPrice(orderItem.subtotal)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Order total summary */}
          <View style={ms.totalCard}>
            {Number(order.discount_amount) > 0 && (
              <>
                <View style={ms.totalRow}>
                  <Text style={ms.totalLbl}>Subtotal</Text>
                  <Text style={ms.totalVal}>
                    {displayPrice(order.total_amount)}
                  </Text>
                </View>
                <View style={ms.totalRow}>
                  <Text style={ms.totalLbl}>Discount</Text>
                  <Text style={[ms.totalVal, { color: '#2A6A4A' }]}>
                    −{displayPrice(order.discount_amount)}
                  </Text>
                </View>
              </>
            )}
            <View style={[ms.totalRow, ms.grandRow]}>
              <Text style={ms.grandLbl}>Total</Text>
              <Text style={ms.grandVal}>{displayPrice(order.final_total)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  // Full-screen backdrop sits behind the sheet
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.overlay,
  },
  // Sheet anchored to the bottom, fixed max height, flex column
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_H,
    backgroundColor: T.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // flex column so header is fixed and ScrollView stretches
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
    flexShrink: 0, // header never shrinks
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

  // ScrollView fills remaining space
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
});

// ── Order Card ────────────────────────────────────────────────────────────────
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
    <View style={cs.card}>
      <View style={cs.cardTop}>
        <Image
          source={imgUri(firstProduct?.front_image)}
          style={cs.thumb}
          resizeMode="cover"
        />
        <View style={cs.cardMid}>
          <Text style={cs.orderId}>Order #{item.id}</Text>
          {firstProduct?.name ? (
            <Text style={cs.productName} numberOfLines={1}>
              {firstProduct.name}
            </Text>
          ) : null}
          <Text style={cs.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={cs.cardRight}>
          <Text style={cs.amount}>{total}</Text>
          <View style={[cs.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[cs.badgeText, { color: statusStyle.text }]}>
              {label}
            </Text>
          </View>
        </View>
      </View>

      <View style={cs.divider} />
      <View style={cs.detailStrip}>
        {item.tracking_number ? (
          <View style={cs.stripItem}>
            <Text style={cs.stripLabel}>Tracking</Text>
            <Text
              style={[cs.stripValue, { color: T.accent }]}
              numberOfLines={1}
            >
              {item.tracking_number}
            </Text>
          </View>
        ) : null}
        <View style={cs.stripItem}>
          <Text style={cs.stripLabel}>Payment</Text>
          <Text style={cs.stripValue}>{payText}</Text>
        </View>
        <View style={cs.stripItem}>
          <Text style={cs.stripLabel}>Items</Text>
          <Text style={cs.stripValue}>{itemCount}</Text>
        </View>
      </View>

      {itemCount > 0 && (
        <>
          <View style={cs.divider} />
          <TouchableOpacity
            style={cs.viewBtn}
            onPress={onViewItems}
            activeOpacity={0.8}
          >
            <Text style={cs.viewBtnText}>View Items</Text>
            <Text style={cs.viewBtnArrow}>›</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const cs = StyleSheet.create({
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

// ── Main Screen ───────────────────────────────────────────────────────────────
const OrdersScreen = ({ navigation }: { navigation: any }) => {
  const { translatedText: searchPlaceholder } =
    useAutoTranslate('Search orders…');
  const { userData } = useContext(UserDataContext);

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
