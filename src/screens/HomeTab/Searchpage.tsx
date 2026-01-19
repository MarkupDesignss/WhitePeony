import { View, Text, Image, TextInput, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions, Keyboard, StatusBar } from 'react-native'
import React, { useCallback, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { Colors } from '../../constant';
import { heightPercentageToDP, widthPercentageToDP } from '../../constant/dimentions';

const { width } = Dimensions.get('window');

const Searchpage = ({ navigation }: any) => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const GetSearch = useCallback(async (word: string) => {
        try {
            setIsSearching(true);
            const res = await UserService.search(word);
            if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
                const dataRaw = Array.isArray(res.data?.data?.products) ? res.data?.data?.products : (res.data?.data?.products ?? []);
                //console.log("searchdata", dataRaw)
                const list = Array.isArray(dataRaw) ? dataRaw : [];
                const baseUrl = res?.data?.base_url || Image_url || '';
                const mapped = list.map((p: any) => {
                    const ID = p.id;
                    const images = [p.front_image, p.back_image, p.side_image]
                        .filter(Boolean)
                        .map((img: string) => (img.startsWith('http') ? img : `${baseUrl}${img}`));
                    const variant = p.variants && p.variants.length ? p.variants[0] : null;
                    const price = variant?.price || p.main_price || p.price || '0';
                    const unit = variant?.unit || p.unit || '';
                    return { ...p, images, price, unit, ID };
                });
                setSearchResults(mapped);
            } else {
                setSearchResults([]);
            }
        } catch (err) {
            console.log('errrsearch', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const onSubmit = () => {
        const trimmed = query.trim();
        Keyboard.dismiss();
        if (!trimmed) return setSearchResults([]);
        GetSearch(trimmed);
    }

    const renderItem = ({ item }: { item: any }) => {
        const imageUri = item.images && item.images.length ? item.images[0] : null;
        return (
            <TouchableOpacity onPress={() => navigation.navigate('ProductDetails', { productId: item?.ID })} style={styles.card} activeOpacity={0.8}>
                <Image source={imageUri ? { uri: imageUri } : require('../../assets/peony_logo.png')} style={styles.cardImage} />
                <View style={styles.cardBody}>
                    <Text numberOfLines={2} style={styles.cardTitle}>{item.name || item.title || item.product_name || 'Unnamed product'}</Text>
                    <Text style={styles.cardPrice}>€ {item.price} {item.unit ? ` / ${item.unit}` : ''}</Text>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFF0' }}>
            <StatusBar barStyle={'dark-content'} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: heightPercentageToDP(3), paddingHorizontal: widthPercentageToDP(3) }}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Image
                        source={require('../../assets/Png/back.png')}
                        style={{ width: 20, height: 20 }}
                    />
                </TouchableOpacity>
                <Image source={require('../../assets/peony_logo.png')} style={{ width: 140, height: 25, resizeMode: 'contain', left: 10 }} />
                <View></View>
            </View>
            <View style={styles.searchRow}>
                <Image source={require('../../assets/Searchx.png')} style={styles.icon} />
                <TextInput
                    placeholder={`Search Products`}
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                    returnKeyType="search"
                    onSubmitEditing={onSubmit}
                    clearButtonMode="while-editing"
                />
                <View style={styles.sep} />
                <TouchableOpacity activeOpacity={0.8} onPress={() => { /* TODO: voice input */ }}>
                    <Image source={require('../../assets/micx.png')} style={styles.icon} />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}>
                {isSearching ? (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <ActivityIndicator size="large" color={Colors.button[100]} />
                    </View>
                ) : (
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, idx) => `${item.id ?? item._id ?? idx}`}
                        renderItem={renderItem}
                        ListEmptyComponent={() => (
                            <View style={{ marginTop: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#888' }}>{query ? 'No products found' : 'Search for products by typing above'}</Text>
                            </View>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    backBtn: {

        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E1E1E1',
        borderRadius: 28,
        height: 50,
        paddingHorizontal: 10,
    },
    icon: { width: 20, height: 20, resizeMode: 'contain' },
    input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#222' },
    sep: { width: 1, height: 28, backgroundColor: '#E1E1E1', marginHorizontal: 10 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    cardImage: { width: 88, height: 88, borderRadius: 8, resizeMode: 'cover' },
    cardBody: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
    cardTitle: { fontSize: 15, color: '#111', marginBottom: 6 },
    cardPrice: { fontSize: 14, color: Colors.button[100], fontWeight: '600' },
});

export default Searchpage