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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { formatDate } from '../../helpers/helpers';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constant';

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
  const [newRating, setNewRating] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>('');
  const [ratingID, setRatingID] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Array<string | number>>([]);

  useEffect(() => {
    OrderList();
  }, []);

  const OrderList = async () => {
    try {
      showLoader();
      const res = await UserService.order();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        hideLoader();
        const apiOrders = Array.isArray(res?.data?.orders) ? res.data.orders : [];
        setOrder(apiOrders);
      } else {
        hideLoader();
      }
    } catch (err) {
      hideLoader();
      console.log('error', err);
    }
  };

  const PostReview = async () => {

    try {
      const payload = {
        rating: newRating,
        review: newComment || 'No comment',
      };

      showLoader();
      await UserService.Review(payload, ratingID)
        .then(async (res) => {
          hideLoader();
          if (res && res?.data && res?.status === HttpStatusCode.Ok) {
            Toast.show({
              type: 'success',
              text1: res?.data?.message,
            });
            OrderList();
            setRatingID('');
            setNewComment('');
            setNewRating(5);
            setWriteModalVisible(false);
          } else {
            Toast.show({
              type: 'error',
              text1: 'Something went wrong!',
            });
          }
        })
        .catch((err) => {
          hideLoader();
          Toast.show({
            type: 'error',
            text1: err.response?.data?.message,
          });
        });
    } catch (error) {
      hideLoader();
      Toast.show({
        type: 'error',
        text1: 'Something went wrong! Please try again.',
      });
    }
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

  const renderOrder = ({ item }: { item: any }) => {
    const itemsList = getItemsList(item?.items);
    const product0 = itemsList?.[0]?.product || itemsList?.[0] || null;
    const isExpanded = expandedIds.includes(item.id);
    const formData= formatDate(item?.created_at || item?.updated_at);

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
              {item?.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Order'} • {formData}
            </Text>
            <Text style={styles.deliveryStatus}>
              {item?.tracking_number ? `${item.tracking_number}` : (item?.payment_status ? item.payment_status : 'No tracking info')}
            </Text>
          </View>
          <Image
            source={require('../../assets/Png/next.png')}
            style={{ marginLeft: 'auto', width: 14, height: 14 }}
          />
        </View>

        <View style={styles.productInfo}>
          {product0?.front_image ? (
            <Image
              source={{
                uri: Image_url + product0?.front_image,
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
            <Text style={styles.productName}>
              {product0?.name || 'Item'}
            </Text>
            <Text style={styles.productName}>{item?.total_amount ? `${item.total_amount} €` : ''}</Text>
            <Text style={styles.productQty}>Qty : {itemsList?.reduce((sum: number, it: any) => sum + (it?.quantity || it?.qty || 1), 1)}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setRatingID(item?.items[0]?.product?.id);
            setWriteModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.rateReviewRow}>
            <Text style={styles.rateReviewLabel}>Rate & Review </Text>
            <View style={{ flexDirection: 'row', marginTop: -10 }}>
              {[1, 2, 3, 4, 5].map((r) => {
                const rating = item?.items[0]?.product?.reviews[0]?.rating || 0;
                const isFull = rating >= r;
                const isHalf = rating >= r - 0.5 && rating < r;
                return (
                  <View
                    key={r}
                    style={{ width: 18, height: 18, position: 'relative' }}
                  >
                    <Text
                      style={{
                        color: '#ccc',
                        fontSize: 18,
                        position: 'absolute',
                      }}
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
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.detailLabel}>Order ID: <Text style={styles.detailValue}>{item?.id}</Text></Text>
            <Text style={styles.detailLabel}>Tracking: <Text style={styles.detailValue}>{item?.tracking_number || '—'}</Text></Text>
            <Text style={styles.detailLabel}>Payment: <Text style={styles.detailValue}>{item?.payment_status || '—'}</Text></Text>
            <Text style={styles.detailLabel}>Total: <Text style={styles.detailValue}>{item?.total_amount ? `${item.total_amount} €` : '—'}</Text></Text>

            <Text style={[styles.detailLabel, { marginTop: 8 }]}>Items:</Text>
            {itemsList && itemsList.length > 0 ? (
              itemsList.map((it: any, idx: number) => {
                const p = it?.product || it;
                return (
                  <View key={idx} style={styles.itemRow}>
                    <Image
                      source={p?.front_image ? { uri: Image_url + p.front_image } : require('../../assets/Png/product.png')}
                      style={{ width: 48, height: 48, borderRadius: 8, marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>{p?.name || 'Item'}</Text>
                      <Text style={{ color: '#666', fontSize: 13 }}>
                        Qty: {it?.quantity || it?.qty || 1} {p?.price ? `• ${p.price} €` : ''}
                      </Text>
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

  const filteredOrders = order.filter(o => (o?.status || '').toLowerCase() === activeTab);

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" enableOnAndroid={true}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Image source={require('../../assets/Png/back.png')} style={{ width: 20, height: 20 }} />
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
              <Image source={require('../../assets/Png/search.png')} style={{ width: 16, height: 16 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                  style={[styles.tabItem, isActive ? styles.tabItemActive : null]}
                >
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            keyExtractor={(item) => String(item.id)}
            data={filteredOrders}
            renderItem={renderOrder}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Text style={{ color: '#888', fontSize: 16 }}>No orders found for "{activeTab}".</Text>
              </View>
            }
          />

          <Modal visible={writeModalVisible} transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>Write a Review</Text>
                <Text style={{ marginTop: 8 }}>Rating</Text>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <TouchableOpacity key={r} onPress={() => setNewRating(r)} style={{ marginRight: 8 }}>
                      <Text style={{ color: newRating >= r ? '#F0C419' : '#ccc', fontSize: 24 }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholderTextColor={Colors.text[200]}
                  placeholder="Write your review"
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, marginTop: 12 }}
                  multiline
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, alignItems:'center' }}>
                  <TouchableOpacity onPress={() => {setWriteModalVisible(false), setNewComment(''), setNewRating(0) }} style={{ marginRight: 8 }}>
                    <Text style={{fontWeight:'500', fontSize:12, }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={PostReview}>
                    <Text style={{ color: '#007AFF' }}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
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

  button: {
    marginTop: 20,
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
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
    borderWidth: 1
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
  tabItemActive: { backgroundColor: '#DEE9A0', },
  tabText: { fontSize: 14, fontWeight: '600', color: '#AAA' },
  tabTextActive: { color: '#000', },
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
  deliveryInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
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
  productName: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 4 },
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
});

export default OrdersScreen;
