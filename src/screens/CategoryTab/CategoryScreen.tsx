import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  FlatList,
  Dimensions,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { Colors } from '../../constant';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';

const CategoryScreen = ({ navigation }) => {

  const { showLoader, hideLoader } = CommonLoader();


  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.tile} activeOpacity={0.9} onPress={() => navigation.navigate('CategoryDetailsList', { categoryId: item.id, categoryTitle: item.name })}>
      <ImageBackground
        source={{ uri: Image_url + item?.image }}
        style={styles.tileImage}
        imageStyle={{ borderRadius: 10 }}
      >
        <View style={styles.tileOverlay}>
          <Text style={styles.tileText}>{item.name}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const [category, setApiCateProducts] = useState([]);
  useEffect(() => {

    GetCategoryProducts()
  }, []);

  const GetCategoryProducts = async () => {
    try {
      showLoader();
      const res = await UserService.GetCategory();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.categories || [];
        setApiCateProducts(fetchedProducts);
      } else {
        // handle non-OK response if needed
      }
    } catch (err) {
      // handle network/error

    } finally {
      hideLoader();
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <View style={{ backgroundColor: '#FFFFF', height: 160 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Categories</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Searchpage')}>
          <View style={styles.searchRow}>
            <Text style={[styles.searchInput, { color: Colors.text[200], textAlignVertical:"center" }]}>Search Products....</Text>
            <TouchableOpacity style={styles.microphone}>
              <Image
                source={require('../../assets/Png/search.png')}
                style={styles.iconSmall}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <FlatList
          data={category}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 200 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      </View>
    </View>
  );
};

export default CategoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', marginTop: StatusBar.currentHeight },
  header: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',

  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  logoutIcon: { position: 'absolute', right: 16, top: 28 },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchBtn: {
    marginLeft: 8,
    width: 44,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: { width: '100%', height: 72, borderRadius: 10, overflow: 'hidden' },
  tileImage: { flex: 1, justifyContent: 'center', resizeMode: 'stretch', width: '100%', height: 72 },
  tileOverlay: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tileText: { color: '#fff', fontWeight: '700' },
  microphone: {
    marginLeft: 8,
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSmall: { width: 14, height: 14 },
});
