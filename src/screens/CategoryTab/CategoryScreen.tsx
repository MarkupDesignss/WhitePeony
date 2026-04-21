import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  TextInput,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { Colors } from '../../constant';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
import TransletText from '../../components/TransletText';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - 32 - CARD_MARGIN) / 2; // 32 = left+right padding (16*2)

const CategoryScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = CommonLoader();
  const { translatedText: searchCategoryText } =
    useAutoTranslate('Search Category....');

  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    try {
      showLoader();
      const res = await UserService.GetCategory();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetched = res.data?.categories || [];
        setCategories(fetched);
        setFilteredCategories(fetched);
      }
    } catch (err) {
      console.error('Category fetch error:', err);
    } finally {
      hideLoader();
    }
  };

  // Filter categories when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredCategories(filtered);
    }
  }, [searchQuery, categories]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const AnimatedTouchable = ({ children, onPress }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => {
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
      }).start();
    };
    const onPressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }).start();
    };
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }) => (
    <AnimatedTouchable
      onPress={() =>
        navigation.navigate('CategoryDetailsList', {
          categoryId: item.id,
          categoryTitle: item.name,
        })
      }
    >
      <View style={[styles.card, { marginLeft: index % 2 === 0 ? 0 : CARD_MARGIN }]}>
        <Image
          source={{ uri: Image_url + item?.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <TransletText text={item.name} style={styles.categoryName} numberOfLines={2} />
          <View style={styles.arrowContainer}>
            <Image
              source={require('../../assets/Png/next.png')}
              style={styles.arrowIcon}
            />
          </View>
        </View>
      </View>
    </AnimatedTouchable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="#FFFFFF"
      />

      {/* Header Section */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerTop}>
          <TransletText text="Categories" style={styles.headerTitle} />
        </View>

        {/* Search Input - Live Filter */}
        <View style={styles.searchContainer}>
          <Image
            source={require('../../assets/Png/search.png')}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Category..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            // clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Grid */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <TransletText text="No categories found" style={styles.emptyText} />
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default CategoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E2F',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F8',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 30,
    height: 48,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#8E8E93',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E1E2F',
    paddingVertical: 12,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.1,
    backgroundColor: '#EFF3F8',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E2F',
    letterSpacing: -0.2,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrowIcon: {
    width: 12,
    height: 12,
    tintColor: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#A0A0B0',
    fontWeight: '500',
  },
});