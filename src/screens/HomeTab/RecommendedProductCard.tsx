// RecommendedProductCard.tsx
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useCart } from '../../context/CartContext'; // adjust your path
import { widthPercentageToDP } from '../../constant/dimentions';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Colors } from '../../constant';

// ✅ Extracted reusable component outside the main file
const RecommendedProductCard = ({ item, navigation, loadProduct }) => {
    const { cart, addToCart } = useCart(); // ✅ safe hook usage
    const [isInCart, setIsInCart] = useState(false);
    const { showLoader, hideLoader } = CommonLoader();


    useEffect(() => {
        const present = Array.isArray(cart)
            ? cart.some(c => {
                const productId = c.product_id ?? c.id;
                return Number(productId) === Number(item.id);
            })
            : false;
        setIsInCart(present);
    }, [cart, item.id]);

    const handleCartAction = async () => {
        try {
            showLoader();
            await addToCart(item.id, item.variants?.[0]?.id ?? null);
            hideLoader();
            setIsInCart(true);
            Toast.show({ type: 'success', text1: 'Added to cart!' });
        } catch (err) {
            hideLoader();
            Toast.show({ type: 'error', text1: 'Failed to add to cart' });
        }
    };

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => loadProduct(item.id)}
        >
            <Image
                source={{ uri: item.images?.[0] }}
                style={styles.cardImage} resizeMode='cover'
            />
            <View style={styles.cardBody}>
                <Text numberOfLines={1} style={styles.cardTitle}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, }}>
                    <Text style={styles.cardPrice}>{Math.round(item.price)}</Text>
                    <Text style={styles.cardPrice}> €</Text>
                </View>

                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {[1, 2, 3, 4, 5].map((r) => {
                        const isFull = item?.average_rating >= r;
                        const isHalf = item?.average_rating >= r - 0.5 && item?.average_rating < r;
                        return (
                            <View key={r} style={{ width: 18, height: 18, position: 'relative' }}>
                                <Text style={{ color: '#ccc', fontSize: 18, position: 'absolute' }}>★</Text>
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
                        )
                    })}
                </View>

                <TouchableOpacity
                    style={[styles.cartButton, isInCart && styles.cartButtonActive]}
                    onPress={isInCart ? () => navigation.navigate('CheckoutScreen') : handleCartAction}
                    disabled={isInCart}>

                    <Text style={styles.cartButtonText}>
                        {isInCart ? 'Go to Cart' : 'Add to Bag'}
                    </Text>

                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export default RecommendedProductCard;

const styles = StyleSheet.create({
    skelCard: { width: 140, marginRight: 12 },
    skelCardImage: {
        width: 140,
        height: 110,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    skelCardTitle: {
        width: '80%',
        height: 12,
        backgroundColor: '#eee',
        marginTop: 8,
        borderRadius: 6,
    },
    cartButton: {
        justifyContent: 'center',
        backgroundColor: Colors.button[100],
        width: widthPercentageToDP(35),
        height: 45, borderRadius: 20,
        marginTop: 16,
    },
    cartButtonActive: {
        backgroundColor: Colors.button[100],
    },
    cartButtonDisabled: {
        opacity: 0.7,
    },
    card: {
        paddingHorizontal: 8,
    },
    CateView: {
        width: 'auto',
        height: 32,
        backgroundColor: Colors.button[100],
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        paddingHorizontal: 10,
        margin: 5,
    },
    cardImage: { width: 177, height: 245, borderRadius: 9 },
    cartButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
        alignSelf: 'center'
    },

    cardBody: { padding: 8, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 13, fontWeight: '600' },
    cardPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },

})
