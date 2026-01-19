import { View, Text, StatusBar, Image, FlatList, Dimensions, StyleSheet, ScrollView, Platform, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity, ImageBackground, Alert } from 'react-native'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { heightPercentageToDP, widthPercentageToDP } from '../../constant/dimentions';
import { Colors, Fonts } from '../../constant';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { formatDate } from '../../helpers/helpers';
import { WishlistContext } from '../../context';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginModal from '../../components/LoginModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const SMALL_CARD_WIDTH = Math.round(width * 0.30);
const WISHLIST_CARD_WIDTH = Math.round(width * 0.35);

const GAP = 12;
const SMALL_HEIGHT = 120;
const BIG_HEIGHT = SMALL_HEIGHT * 2 + GAP;


const HomeScreen1 = ({ navigation }: any) => {
    const { setUserData, isLoggedIn } = useContext<UserData>(UserDataContext);

    const { toggleWishlist, isWishlisted, removeFromWishlist, wishlistIds } = React.useContext(WishlistContext);
    const [category, setApiCateProducts] = useState([]);
    const [categoryProduct, setcategoryProduct] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(1);
    const [FeaturesProduct, setFeaturesProduct] = useState([]);
    const [salesProduct, setsalesProduct] = useState([]);
    const [apiRecommend, setApiRecommend] = useState<any[]>();
    const [wishlistitem, setwishlistitem] = useState<any[]>();
    const [orderitem, setorderitem] = useState<any[]>();
    const [lowestitem, setlowestitem] = useState<any[]>();
    const [Promotional, setPromotional] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);


    const { showLoader, hideLoader } = CommonLoader();
    const topPadding = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
    const [activeRec, setActiveRec] = useState(0);
    const recRef = useRef<FlatList<any>>(null);

    const onRecommendedScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / (WISHLIST_CARD_WIDTH + 12));
        setActiveRec(index);
    };

    useEffect(() => {
        GetCategoryProducts();
        bigsale();
        RecommendProducts();
        OrderList();
        ApiSorting();
        GetHeader();

    }, [])

    // update wishlist items depending on login state (server vs local)
    useEffect(() => {
        if (isLoggedIn) {
            fetchServerWishlist();
        } else {
            // map local wishlist ids to minimal display objects
            const localIds = Array.isArray(wishlistIds) ? wishlistIds : [];
            const mapped = localIds.map((id) => ({ id: String(id), name: `Product ${id}`, front_image: null, variants: [{ price: 0 }] }));
            setwishlistitem(mapped);
        }
    }, [isLoggedIn, wishlistIds]);

    const GetHeader = async () => {
        try {
            showLoader();
            const res = await UserService.header();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                const banners = res?.data?.data?.b2c || [];
                //console.log("header", res?.data?.data?.b2c)

                setPromotional(banners)
            } else {
                // handle non-OK response if needed
            }
        } catch (err) {
            // handle network/error
        } finally {
            hideLoader();
        }
    };

    const GetCategoryProducts = async () => {
        try {
            showLoader();
            const res = await UserService.GetCategory();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                const fetchedProducts = res.data?.categories || [];
                setApiCateProducts(fetchedProducts);
                const defaultId = fetchedProducts?.[0]?.id ?? 1;
                setSelectedCategoryId(defaultId);
                GetCategoryID(defaultId);
            }
        } catch (err) {
            console.log("error catogry", err)
            hideLoader();
        }
    };

    const GetCategoryID = async (categoryId: any) => {
        // console.log("itemid", categoryId)
        try {
            showLoader();
            const res = await UserService.GetCategoryByID(categoryId);
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                const fetchedProducts = res?.data?.data || [];
                //console.log("GetCategoryByID", fetchedProducts)
                setcategoryProduct(fetchedProducts);
                await featuredproduct();
            } else {
                console.log("rescatdata", res?.data)
            }
        } catch (err) {
            console.log("error catogry", err)
            hideLoader();
            // handle network/error
        }
    };

    const featuredproduct = async () => {
        try {
            showLoader();
            const res = await UserService.featuredproducts();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                const fetchedProducts = res?.data?.data || [];
                //console.log("featuredproduct", fetchedProducts?.b2c)
                setFeaturesProduct(fetchedProducts?.b2c);
                await isLoggedIn ? OrderList() : null

            } else {
                console.log("featuredproductelse", res?.data)
            }
        } catch (err) {
            console.log("error featuredproduct", err)
            hideLoader();
            // handle network/error
        }
    };

    const bigsale = async () => {
        try {
            showLoader();
            const res = await UserService.bigsales();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                const fetchedProducts = res.data?.data || [];
                //console.log("bigsale", fetchedProducts?.b2c)
                setsalesProduct(fetchedProducts?.b2c);
            } else {
                console.log("else sales", res.data)
                // handle non-OK response if needed
            }
        } catch (err) {
            console.log("error catogry", err)
            hideLoader();
        }
    };

    const RecommendProducts = async () => {
        try {
            showLoader();
            const res = await UserService.recommended();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                const fetchedProducts = res.data?.data || [];
                const b2cProducts = fetchedProducts.filter(
                    item => item.product_type === 'b2c'
                );
                setApiRecommend(b2cProducts);
                //console.log("recommenddata", b2cProducts)
            } else {
                console.log("recommendelse", res?.data)
                // handle non-OK response if needed
            }
        } catch (err) {
            hideLoader();
            console.log("recommenderror", err)
            // handle network/error
        }
    };

    const fetchServerWishlist = async () => {
        try {
            showLoader();
            const res = await UserService.wishlist();
            const apiItems = res?.data?.data || [];
            hideLoader();

            setwishlistitem(apiItems);
            //console.log("addwishlist", apiItems)
        } catch (e) {
            hideLoader();
            const error = e as any;
            if (error.status === 401) {
                console.log('Unauthorized access - perhaps token expired');
            } else {
                console.log('Unauthorized access - perhaps token Required');
            }
        }
    };

    const OrderList = async () => {
        try {
            showLoader();
            const res = await UserService.order();
            if (res && res.data && res.status === HttpStatusCode.Ok) {
                hideLoader();
                const apiOrders = Array.isArray(res?.data?.orders) ? res.data.orders : [];
                //console.log("orderlist", apiOrders[0]?.items)
                setorderitem(apiOrders);
            } else {
                console.log("ordererr", res?.data)
                hideLoader();
            }
        } catch (err) {
            hideLoader();
            console.log('error', err);
        }
    };

    const ApiSorting = async () => {
        try {
            showLoader();
            const res = await UserService.Sorting('price_asc');

            if (res?.status === HttpStatusCode.Ok) {
                const sortedProducts = res?.data?.data || [];
                const b2cProducts = sortedProducts.filter(
                    item => item.product_type === 'b2c'
                );

                setlowestitem(b2cProducts);
                //console.log('ApiSorting -> setting products', sortedProducts);
            } else {
                console.log('Failed to sort products:', res);
                Toast.show({
                    type: 'error',
                    text1: 'Failed to sort products'
                });
            }
        } catch (err) {
            console.log('Sorting error:', err);
            Toast.show({
                type: 'error',
                text1: 'Failed to sort products'
            });
        }
    };

    const PromotionalBanner: React.FC<{ promotional: any[] }> = ({ promotional = [] as any[] }) => {
        if (!promotional.length) return null;
        return (
            <View style={{ margin: 12, borderRadius: 12 }}>
                {promotional.map((item: any, index: number) => (
                    <View key={String(index)} style={styles.page}>
                        <Image
                            source={{ uri: Image_url + item.image_url }}
                            style={styles.imageBackground}
                            resizeMode='cover' />

                        <View style={{ position: 'absolute', top: '20%', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 }}>
                            <Text style={styles.bannertittle}>White Peony Tea Co</Text>
                            <Text style={[styles.bannertittle, { fontSize: 18, marginTop: 7 }]}>{item?.title}</Text>

                            <TouchableOpacity style={styles.button} onPress={() =>
                                navigation.navigate('ProductDetails', { productId: item.product_id })}>

                                <Text style={styles.buttonText}>Shop Now</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFF0' }}>
            <StatusBar barStyle={'dark-content'} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: heightPercentageToDP(3), paddingHorizontal: widthPercentageToDP(3) }}>
                <View />
                <Image source={require('../../assets/peony_logo.png')} style={{ width: 140, height: 25, resizeMode: 'contain', left: 10 }} />
                <TouchableOpacity onPress={() => isLoggedIn ? navigation.navigate('EditProfile') : setModalVisible(true)}>
                    <View style={{ borderColor: '#A7A7A7', borderWidth: 1, borderRadius: 20, padding: 5, marginRight: 10 }}>
                        <Image source={require('../../assets/userx.png')} style={{ width: 15, height: 15, resizeMode: 'cover' }} />
                    </View>
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: '#FFFFF0', }}>

                <TouchableOpacity onPress={() => navigation.navigate('Searchpage')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderColor: '#A7A7A7', borderWidth: 1, borderRadius: 30, height: 50, backgroundColor: '#fff', marginHorizontal: widthPercentageToDP(3) }}>
                        <Image source={require('../../assets/Searchx.png')} style={{ width: 20, height: 20, resizeMode: 'contain', marginLeft: 10, alignSelf: 'center' }} />
                        <Text style={{ alignSelf: 'center', color: '#A7A7A7', fontSize: 16, flex: 1, marginLeft: 10 }}>Search "Products"</Text>
                        <View style={{ borderWidth: 1, borderColor: '#A7A7A7', marginVertical: 8, right: 10 }} />
                        <Image source={require('../../assets/micx.png')} style={{ width: 20, height: 20, resizeMode: 'contain', marginRight: 10, alignSelf: 'center' }} />
                    </View>
                </TouchableOpacity>
                <View style={{ backgroundColor: '#fff', flex: 1 }}>


                    <View style={{ paddingVertical: heightPercentageToDP(2), flexDirection: 'row', alignItems: "center", paddingHorizontal: widthPercentageToDP(3), backgroundColor: "#FFFFF0" }}>
                        <FlatList
                            data={category}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item }) => {
                                const isActive = item?.id === selectedCategoryId;
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedCategoryId(item.id);
                                            GetCategoryID(item.id);
                                        }}
                                        style={{ alignItems: 'center', marginHorizontal: 10 }}
                                    >
                                        <Image
                                            source={{ uri: Image_url + item?.image }}
                                            style={{
                                                width: 25,
                                                height: 25,
                                                resizeMode: 'cover',
                                                opacity: isActive ? 1 : 0.35,
                                                transform: [{ scale: isActive ? 1.05 : 1 }],
                                            }}
                                        />
                                        <Text style={{
                                            fontWeight: '700',
                                            fontSize: 12,
                                            marginTop: heightPercentageToDP(1),
                                            color: isActive ? '#000' : '#A7A7A7'
                                        }}>
                                            {item?.name}
                                        </Text>

                                        <View style={{
                                            marginTop: 6,
                                            height: 3,
                                            width: 30,
                                            borderRadius: 4,
                                            backgroundColor: isActive ? '#2E2E2E' : 'transparent'
                                        }} />
                                    </TouchableOpacity>
                                )
                            }}
                        />
                    </View>
                    <View style={{ borderWidth: 0.7, borderColor: '#A7A7A7', width: widthPercentageToDP(111), paddingHorizontal: 0, marginTop: heightPercentageToDP(-2.2) }} />

                    {/* Categories as 2-column grid */}
                    {categoryProduct.length !== 0 ? (
                        <View style={styles.container}>
                            <View style={styles.row}>
                                {/* BIG CARD */}
                                <LinearGradient
                                    colors={['#EFEFCA', '#E2E689']}
                                    start={{ x: 0.5, y: 0 }}   // top
                                    end={{ x: 0.5, y: 1 }}     // bottom
                                    style={{ flex: 1, borderRadius: 12 }}
                                >
                                    <TouchableOpacity onPress={() =>
                                        navigation.navigate('ProductDetails', { productId: categoryProduct[0].id })}>
                                        <View style={[styles.card, { height: BIG_HEIGHT }]}>
                                            <Text style={styles.title}>All</Text>
                                            <Text numberOfLines={2} style={[styles.title, { color: '#000', marginTop: -10 }]}>{categoryProduct[0].name}</Text>
                                            <View style={{ borderRadius: 4, backgroundColor: '#5f621a', width: 40, alignSelf: 'center', marginTop: 10, justifyContent: 'center' }}>
                                                <Text style={{ fontWeight: '700', fontSize: 12, alignSelf: 'center', color: '#fff', textDecorationLine: 'line-through', textAlignVertical: "center" }}>{Math.round(categoryProduct[0]?.variants[0]?.price)} €</Text>
                                            </View>
                                            <View style={{ borderRadius: 4, backgroundColor: '#E0CB54', width: 50, alignSelf: 'center' }}>
                                                <Text style={{ fontWeight: '700', fontSize: 12, alignSelf: 'center', padding: 5, color: '#000', }}>{Math.round(categoryProduct[0]?.variants[0]?.price)} €</Text>
                                            </View>
                                            <Image source={{ uri: Image_url + categoryProduct[0].front_image }} style={styles.imageBig} />

                                        </View>
                                    </TouchableOpacity>
                                </LinearGradient>

                                {/* RIGHT STACK: render one small card per item */}
                                <View style={styles.stack}>
                                    <View style={{ justifyContent: 'space-between', gap: 8 }}>
                                        {categoryProduct.slice(1, 3).map((item) => (
                                            <LinearGradient
                                                colors={['#EFEFCA', '#E2E689']}
                                                start={{ x: 0.5, y: 0 }}   // top
                                                end={{ x: 0.5, y: 1 }}     // bottom
                                                style={{ flex: 1, borderRadius: 12, }}
                                            >
                                                <TouchableOpacity onPress={() =>
                                                    navigation.navigate('ProductDetails', { productId: item.id })}>
                                                    <View key={`${item.id}`} style={[styles.card, { height: SMALL_HEIGHT }]}>
                                                        <Text numberOfLines={2} style={styles.title}>{item.name}</Text>
                                                        <Image source={{ uri: Image_url + item.front_image }} style={styles.imageSmall} />
                                                    </View>
                                                </TouchableOpacity>
                                            </LinearGradient>
                                        ))}
                                    </View>

                                    <View style={{ justifyContent: 'space-between', gap: 8 }}>
                                        {categoryProduct.slice(3, 5).map((item) => (
                                            <LinearGradient
                                                colors={['#EFEFCA', '#E2E689']}
                                                start={{ x: 0.5, y: 0 }}   // top
                                                end={{ x: 0.5, y: 1 }}     // bottom
                                                style={{ flex: 1, borderRadius: 12, }}
                                            >
                                                <TouchableOpacity onPress={() =>
                                                    navigation.navigate('ProductDetails', { productId: item.id })}>
                                                    <View key={`${item.id}`} style={[styles.card, { height: SMALL_HEIGHT }]}>
                                                        <Text numberOfLines={2} style={styles.title}>{item.name}</Text>
                                                        <Image source={{ uri: Image_url + item.front_image }} style={styles.imageSmall} />
                                                    </View>
                                                </TouchableOpacity>
                                            </LinearGradient>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text>No data Found</Text>
                        </View>
                    )}


                    {/* FREQUENTLY BOUGHT */}
                    <View style={{ paddingHorizontal: widthPercentageToDP(3), backgroundColor: '#fff', }}>
                        {orderitem?.length != null ?
                            <>
                                <Text style={styles.sectionTitle}>Frequently Bought</Text>

                                <FlatList
                                    data={orderitem}
                                    keyExtractor={(item) => String(item.id)}
                                    horizontal
                                    // columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
                                    renderItem={(item) => {
                                        //console.log('itemm', item?.item)
                                        return (
                                            <TouchableOpacity onPress={() =>
                                                navigation.navigate('ProductDetails', { productId: item?.item?.items[0]?.product?.front_image.id })}>
                                                <View style={styles.freqCard}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                                        <Image source={{ uri: Image_url + item?.item?.items[0]?.product?.front_image }} style={styles.freqImage} />
                                                        <View style={{ marginLeft: 5 }}></View>
                                                        <Image source={{ uri: Image_url + item?.item?.items[0]?.product?.back_image }} style={styles.freqImage} />
                                                    </View>
                                                    <Text style={styles.freqText}>{item?.item?.items[0]?.product?.name}</Text>
                                                </View>
                                            </TouchableOpacity>

                                        )
                                    }}
                                />
                            </>
                            :
                            <View></View>}

                        {/* FEATURED */}
                        <Text style={styles.sectionTitle}>Featured This Week</Text>

                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={FeaturesProduct}
                            keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
                            renderItem={({ item }) => {
                                //console.log('urlss', item?.product?.front_image)
                                return (
                                    <TouchableOpacity onPress={() =>
                                        navigation.navigate('ProductDetails', { productId: item?.product?.id })}>
                                        <View style={styles.featuredCard}>
                                            <Image source={{ uri: Image_url + item?.product?.front_image }} style={styles.featuredImage} />
                                            {item.tag && (
                                                <View style={styles.tag}>
                                                    <Text style={styles.tagText}>{item.tag}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>

                                );
                            }}
                        />

                    </View>

                    <View style={{ width: '100%', height: heightPercentageToDP(30), marginTop: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fecf5d', }}>
                        <Image source={require('../../assets/bg3x.png')} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />

                        <View style={{ position: 'absolute', top: 10, alignItems: 'center' }}>
                            <Image source={require('../../assets/bigsales.png')} style={{ width: 75, height: 65, resizeMode: 'cover' }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', marginTop: 15 }}>{formatDate(salesProduct[0]?.start_date).slice(0, 13)} - {formatDate(salesProduct[0]?.end_date).slice(0, 13)}</Text>
                            <FlatList
                                data={salesProduct}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item, index) => String(index)}
                                renderItem={(item) => {
                                    return (
                                        <TouchableOpacity onPress={() =>
                                            navigation.navigate('ProductDetails', { productId: item?.item?.product?.id })}>
                                            <View style={{ borderRadius: 8, alignItems: 'center', backgroundColor: '#FFEEBC', width: 100, height: 100, marginLeft: 10, marginTop: heightPercentageToDP(3) }}>
                                                <View style={{ backgroundColor: '#FFFFFF', width: 70, height: 17, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', alignSelf: 'center', }}>Upto {item?.item?.percentage}% Off</Text>
                                                </View>
                                                <Image source={{ uri: Image_url + item?.item?.product?.front_image }} style={{ width: 70, height: 80, resizeMode: 'cover', marginTop: 5, borderRadius: 8 }} />
                                            </View>
                                        </TouchableOpacity>
                                    )
                                }}
                            />
                        </View>
                    </View>

                    {/* Lowest Prices Ever - horizontal small cards */}
                    <View style={{ width: '100%', height: heightPercentageToDP(35), marginTop: heightPercentageToDP(1), justifyContent: 'center', alignItems: 'center' }}>
                        <Image source={require('../../assets/Subtraction2.png')} style={{ width: '100%', height: heightPercentageToDP(40), resizeMode: 'cover' }} />
                        <View style={{ position: 'absolute', top: 10, paddingHorizontal: widthPercentageToDP(3), }}>
                            <Text style={[styles.sectionTitle, { alignSelf: 'center' }]}>LOWEST PRICES EVER</Text>
                            <FlatList
                                data={lowestitem}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item, index) => String(index)}
                                renderItem={({ item }) => {
                                    const wished = isWishlisted(item.id);

                                    return (


                                        <TouchableOpacity onPress={() =>
                                            navigation.navigate('ProductDetails', { productId: item.id })}>
                                            <View style={[styles.smallCard, { width: SMALL_CARD_WIDTH }]}>
                                                <Image source={{ uri: Image_url + item?.front_image }} style={styles.smallImage} />
                                                <Text numberOfLines={2} style={[styles.smallTitle, { height: heightPercentageToDP(4) }]}>{item?.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                                    <Text style={styles.smallPrice}>{Math.round(item?.variants[0]?.price)} €</Text>
                                                    {item?.variants[0]?.price && <Text style={styles.smallOldPrice}>{Math.round(item?.variants[0]?.price)} €</Text>}
                                                </View>
                                                <View style={{ backgroundColor: '#EAE6B9', borderRadius: 4, marginVertical: 10, flexDirection: 'row', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 3 }}>
                                                    <Text style={{ fontSize: 10, color: '#000' }}>see more like this  <Text style={{ color: '#008009' }}>▶</Text> </Text>
                                                </View>

                                                <TouchableOpacity
                                                    onPress={async () => {
                                                        if (wished) {
                                                            // Remove from wishlist
                                                            try {
                                                                toggleWishlist(item.id); // update local state immediately
                                                                if (isLoggedIn) {
                                                                    showLoader();
                                                                    const res = await UserService.wishlistDelete(item.id);
                                                                    if (res?.status === HttpStatusCode.Ok) {
                                                                        await removeFromWishlist(item.id);
                                                                        Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                                                                    } else {
                                                                        Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                                                                    }
                                                                    hideLoader();
                                                                } else {
                                                                    removeFromWishlist(item.id);
                                                                    Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                                                                }
                                                            } catch (err) {
                                                                hideLoader();
                                                                console.log('Wishlist remove error:', err);
                                                                Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                                                            }
                                                        } else {
                                                            // Add to wishlist
                                                            try {
                                                                toggleWishlist(item.id); // update local state immediately
                                                                if (!isLoggedIn) {
                                                                    Toast.show({ type: 'success', text1: 'Added to wishlist' });
                                                                    return;
                                                                }
                                                            } catch (err) {
                                                                hideLoader();
                                                                console.log('Wishlist add error:', err);
                                                                Toast.show({ type: 'error', text1: 'Failed to add to wishlist' });
                                                            }
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                    style={{
                                                        position: 'absolute', top: heightPercentageToDP(1.5), right: widthPercentageToDP(4), backgroundColor: Colors.button[100], padding: 6, borderRadius: 12, width: 20, height: 20, justifyContent: 'center'
                                                    }}
                                                >
                                                    <Image
                                                        source={wished ? require('../../assets/Png/heart1.png') : require('../../assets/Png/heart-1.png')}
                                                        style={{ position: 'absolute', width: 12, height: 12, alignSelf: 'center', resizeMode: 'cover' }}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                }}
                            />

                            <TouchableOpacity onPress={() => navigation.navigate('CategoryScreen')} >
                                <View
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        height: 40,
                                        width: widthPercentageToDP(90),
                                        alignSelf: 'center'
                                    }}
                                >
                                    <Image
                                        source={require('../../assets/Png/Ellipse.png')}
                                        style={{
                                            width: 14,
                                            height: 14,
                                            alignSelf: 'center',
                                            right: 10,
                                        }}
                                    />
                                    <Text
                                        style={[
                                            styles.moveToWishlistText,
                                            { alignSelf: 'center', color: '#000' },
                                        ]}
                                    >
                                        See all products
                                    </Text>
                                    <Image
                                        source={require('../../assets/Png/next.png')}
                                        style={{ width: 12, height: 12, alignSelf: 'center', left: 10, tintColor: '#000000' }}
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Your Wishlist - horizontal scroll with slightly larger cards */}
                    {wishlistitem?.length != 0 ? <View style={{ paddingHorizontal: widthPercentageToDP(3), marginTop: heightPercentageToDP(2) }}>
                        <Text style={styles.sectionTitle}>Your Wishlist</Text>
                        <FlatList
                            data={wishlistitem}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingVertical: 8 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() =>
                                    navigation.navigate('ProductDetails', { productId: item.id })}>
                                    <View style={[styles.wishlistCard, { width: WISHLIST_CARD_WIDTH }]}>
                                        <Image source={{ uri: Image_url + item?.front_image }} style={styles.wishlistImage} />
                                        <Text numberOfLines={2} style={[styles.wishlistTitle, { fontWeight: '400', height: heightPercentageToDP(4) }]}>{item?.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                            <Text style={styles.smallPrice}>{Math.round(item?.variants[0]?.price)} €</Text>
                                            {item?.variants[0]?.price && <Text style={styles.smallOldPrice}>{Math.round(item?.variants[0]?.price)} €</Text>}
                                        </View>

                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
                                            style={{ position: 'absolute', top: heightPercentageToDP(1.5), right: widthPercentageToDP(4), backgroundColor: Colors.button[100], padding: 6, borderRadius: 12, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
                                        >
                                            <Image
                                                source={require('../../assets/Png/heart1.png')}
                                                style={{ width: 14, height: 14, resizeMode: 'cover' }}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View> :
                        null}

                    <View style={{ marginTop: wishlistitem?.length == 0 ? heightPercentageToDP(3) : null }}></View>
                    <PromotionalBanner promotional={Promotional} />

                    {/* Recommended For You - horizontal with simple pagination */}
                    <View style={{ paddingHorizontal: widthPercentageToDP(3), marginTop: heightPercentageToDP(2), marginBottom: heightPercentageToDP(4) }}>
                        <Text style={styles.sectionTitle}>Recommended For You</Text>
                        <FlatList
                            ref={recRef}
                            data={apiRecommend}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            snapToInterval={WISHLIST_CARD_WIDTH + 12}
                            decelerationRate="fast"
                            contentContainerStyle={{ paddingVertical: 8 }}
                            onScroll={onRecommendedScroll}
                            renderItem={({ item }) => {
                                const wished = isWishlisted(item.id);

                                return (
                                    <TouchableOpacity onPress={() =>
                                        navigation.navigate('ProductDetails', { productId: item.id })}>
                                        <View style={[styles.wishlistCard, { width: WISHLIST_CARD_WIDTH }]}>
                                            <Image source={{ uri: Image_url + item?.front_image }} style={styles.wishlistImage} />
                                            <Text numberOfLines={2} style={[styles.wishlistTitle, { fontWeight: '400', height: heightPercentageToDP(4) }]}>{item?.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.smallPrice}>{Math.round(item.variants[0]?.price)}  €</Text>
                                                {item.variants[0]?.price && <Text style={styles.smallOldPrice}>{Math.round(item.variants[0]?.price)}  €</Text>}
                                            </View>

                                            <TouchableOpacity
                                                onPress={async () => {
                                                    if (wished) {
                                                        // Remove from wishlist
                                                        try {
                                                            toggleWishlist(item.id); // update local state immediately
                                                            if (isLoggedIn) {
                                                                showLoader();
                                                                const res = await UserService.wishlistDelete(item.id);
                                                                if (res?.status === HttpStatusCode.Ok) {
                                                                    await removeFromWishlist(item.id);
                                                                    Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                                                                } else {
                                                                    Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                                                                }
                                                                hideLoader();
                                                            } else {
                                                                removeFromWishlist(item.id);
                                                                Toast.show({ type: 'success', text1: 'Removed from wishlist' });
                                                            }
                                                        } catch (err) {
                                                            hideLoader();
                                                            console.log('Wishlist remove error:', err);
                                                            Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
                                                        }
                                                    } else {
                                                        // Add to wishlist
                                                        try {
                                                            toggleWishlist(item.id); // update local state immediately
                                                            if (!isLoggedIn) {
                                                                Toast.show({ type: 'success', text1: 'Added to wishlist' });
                                                                return;
                                                            }
                                                        } catch (err) {
                                                            hideLoader();
                                                            console.log('Wishlist add error:', err);
                                                            Toast.show({ type: 'error', text1: 'Failed to add to wishlist' });
                                                        }
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                                style={{
                                                    position: 'absolute', top: heightPercentageToDP(1.5), right: widthPercentageToDP(4), backgroundColor: Colors.button[100], padding: 6, borderRadius: 12, width: 20, height: 20, justifyContent: 'center'
                                                }}
                                            >
                                                <Image
                                                    source={wished ? require('../../assets/Png/heart1.png') : require('../../assets/Png/heart-1.png')}
                                                    style={{ position: 'absolute', width: 12, height: 12, alignSelf: 'center', resizeMode: 'cover' }}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                )
                            }}
                        />

                        {/* Dots */}
                        <View style={styles.dotsContainer}>
                            {Array.isArray(apiRecommend) &&
                                apiRecommend.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.dot,
                                            activeRec === i && styles.activeDot,
                                        ]}
                                    />
                                ))}
                        </View>
                    </View>

                </View>

                <LoginModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onGoogleLogin={() => Alert.alert("Google Login")}
                    onFacebookLogin={() => Alert.alert("Facebook Login")}
                    phoneNumber="email or phone number"
                />

            </ScrollView >
        </SafeAreaView>
    )
}

export default HomeScreen1;

const styles = StyleSheet.create({

    container: {
        paddingVertical: 20, paddingHorizontal: widthPercentageToDP(3), backgroundColor: '#FFFFF0'
    },

    row: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
    },

    stack: {
        justifyContent: 'space-between',
        flexDirection: 'row',
        width: '65%',
        gap: 8
    },

    card: {
        width: widthPercentageToDP(30),
        borderRadius: 14,
        padding: 8,
    },

    imageBig: {
        width: '100%',
        height: 100,
        resizeMode: 'cover',
        top: 10,
        borderRadius: 12
    },

    imageSmall: {
        width: '100%',
        height: 60,
        resizeMode: 'cover',
        top: heightPercentageToDP(1),
        borderRadius: 12
    },

    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2E2E2E',
        width: '90%',
        textAlign: 'center',
        height: 40, textAlignVertical: 'center', fontFamily: Fonts.Anciza_Medium_Italic
    },

    bannertittle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2E2E2E',
        fontFamily: Fonts.Anciza_Medium_Italic
    },
    button: {
        width: '30%',
        backgroundColor: '#fff',
        borderRadius: 4,
        marginTop: 10,
        alignItems: 'center',
        justifyContent: 'center',
        height: 30,
    },
    buttonText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '700',
    },
    grid: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    categoryCard: {
        backgroundColor: '#F1F4C3',
        width: CARD_WIDTH,
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    largeCard: {
        height: 240,
    },
    moveToWishlistText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000000',
    },
    categoryImage: {
        width: '100%',
        height: 90,
        resizeMode: 'contain',
        marginVertical: 8,
    },
    categoryTitle: {
        fontWeight: '700',
        fontSize: 14,
    },
    subtitle: {
        fontSize: 12,
        color: '#4CAF50',
    },
    imageBackground: {
        width: '100%',
        height: 180,
        resizeMode: 'cover',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12
    },

    page: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    oldPrice: {
        textDecorationLine: 'line-through',
        fontSize: 11,
        alignSelf: 'flex-end',
    },
    priceBadge: {
        backgroundColor: '#D4E157',
        paddingHorizontal: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    price: {
        fontWeight: '700',
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginVertical: heightPercentageToDP(1),
    },


    freqCard: {
        padding: 10,
        backgroundColor: '#F4F1E8',
        borderRadius: 10,
    },
    freqImage: {
        width: 60,
        height: 60,
        resizeMode: 'cover',
        borderRadius: 12,
    },
    freqText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 6,
        fontWeight: '700',
        width: CARD_WIDTH - 30,
    },

    featuredCard: {
        width: 110,
        height: 130,
        borderRadius: 10,
        marginRight: 12,
        padding: 5,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#236FE3'
    },
    featuredImage: {
        width: '100%',
        height: heightPercentageToDP(13),
        borderRadius: 10,
        resizeMode: 'cover'
    },
    tag: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: '#8BC34A',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tagText: {
        color: '#fff',
        fontSize: 11,
    },

    /* New small card styles */
    smallCard: {
        borderRadius: 8,
        padding: 8,
        marginRight: 10,
    },
    smallImage: {
        width: '100%',
        height: SMALL_CARD_WIDTH - 0,
        resizeMode: 'cover',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',

    },
    smallTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 6,
    },
    smallPrice: {
        fontWeight: '700',
        fontSize: 14,
        color: '#333'
    },
    smallOldPrice: {
        textDecorationLine: 'line-through',
        color: '#999',
        marginLeft: 8,
        fontSize: 12,
    },

    /* Wishlist / recommended cards */
    wishlistCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 8,
        marginRight: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        alignItems: 'flex-start',
    },
    wishlistImage: {
        width: '100%',
        height: WISHLIST_CARD_WIDTH - 0,
        resizeMode: 'cover',
        borderRadius: 8,
    },
    wishlistTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 8,
    },

    /* Pagination dots */
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 6,
        backgroundColor: '#DDD',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#AEB254',
        width: 30,
        height: 6,
        borderRadius: 6
    },
});