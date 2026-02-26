import { Image, StyleSheet, Text, View, Animated } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, Images } from '../constant';
import { heightPercentageToDP, widthPercentageToDP } from '../constant/dimentions';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

import EventScreen from '../screens/EventTab/EventScreen';
import AccountScreen from '../screens/AccountTab/AccountScreen';
import ArticleScreen from '../screens/ArticleTab/ArticleScreen';
import HomeStack from './HomeStack';
import CategoryStackNavigator from './CategoryStackNavigation';
import CheckoutScreen from '../screens/HomeTab/CheckoutScreen'; // Updated import path
import { useAutoTranslate } from '../hooks/useAutoTranslate';
import { useCart } from '../context/CartContext';
import { UserService } from '../service/ApiService';

const Tab = createBottomTabNavigator();

// Premium color palette
const COLORS = {
  primary: '#2E7D32', // Rich green
  primaryLight: '#4CAF50', // Lighter green
  inactive: '#8E8E93', // iOS-style gray
  inactiveLight: '#C6C6C8', // Very light gray
  background: '#FFFFFF',
  cardBackground: '#F8F9FA',
  badgeBackground: '#FF3B30', // iOS-style red
  badgeText: '#FFFFFF',
  shadow: '#000000',
  white: '#FFFFFF',
  activeBackground: 'rgba(46, 125, 50, 0.08)', // Subtle green background
};

interface TabBarIconProps {
  source: any;
  focused: boolean;
  badgeCount?: number;
  label: string;
  routeName: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({
  source,
  focused,
  badgeCount,
  label,
  routeName,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Enhanced active animation sequence
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 3,
          tension: 45,
        }),
        Animated.spring(translateYAnim, {
          toValue: -4,
          useNativeDriver: true,
          friction: 3,
          tension: 45,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
          tension: 45,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 3,
          tension: 45,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [focused]);

  // Background color interpolation
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', COLORS.activeBackground],
  });

  // Different icon styles based on route
  const getIconStyle = () => {
    switch (routeName) {
      case 'Cart':
        return styles.cartIcon;
      case 'Account':
        return styles.accountIcon;
      default:
        return {};
    }
  };

  return (
    <Animated.View
      style={[
        styles.iconWrapper,
        {
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {/* Icon with animated background */}
        <Animated.View style={[styles.iconBackground, { backgroundColor }]}>
          <Image
            source={source}
            style={[
              styles.icon,
              getIconStyle(),
              {
                tintColor: focused ? COLORS.primary : COLORS.inactive,
              },
            ]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Premium badge design */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <View style={styles.badgeInner}>
              <Text style={styles.badgeText}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Label with smaller, refined text */}
      <Text
        style={[
          styles.label,
          {
            color: focused ? COLORS.primary : COLORS.inactive,
            fontWeight: focused ? '500' : '400',
            opacity: focused ? 1 : 0.7,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* Elegant active indicator */}
      {focused && (
        <Animated.View
          style={[
            styles.activeIndicator,
            { opacity: opacityAnim }
          ]}
        />
      )}
    </Animated.View>
  );
};

const BottomTabScreen = () => {
  const navigation = useNavigation();
  const [cartItemCount, setCartItemCount] = useState(0);
  const { cart } = useCart();

  const { translatedText: homeText } = useAutoTranslate('Home');
  const { translatedText: categoryText } = useAutoTranslate('Category');
  const { translatedText: cartText } = useAutoTranslate('Cart');
  const { translatedText: newsText } = useAutoTranslate('News');
  const { translatedText: accountText } = useAutoTranslate('Account');

  // Professional cart count fetch
  const fetchCartCount = async () => {
    try {
      const res = await UserService.viewCart();
      if (res?.data) {
        const cartData = res.data.cart || res.data;
        const items = cartData?.items || [];
        setCartItemCount(items.length);
      }
    } catch (error) {
      console.log('Error fetching cart count:', error);
      setCartItemCount(0);
    }
  };

  // Update cart count from context
  useEffect(() => {
    if (Array.isArray(cart)) {
      setCartItemCount(cart.length);
    }
  }, [cart]);

  // Refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCartCount();
    }, [])
  );

  // Initial fetch
  useEffect(() => {
    fetchCartCount();
  }, []);

  // Professional icon mapping with active/inactive variants
  const getTabBarIcon = (routeName: string, focused: boolean) => {
    const iconConfigs = {
      Home: {
        source: focused ? Images.HomeActive || Images.Home : Images.Home,
        label: homeText || 'Home',
      },
      Category: {
        source: focused ? Images.CategoryActive || Images.Category : Images.Category,
        label: categoryText || 'Category',
      },
      Cart: {
        source: focused ? Images.cartActive || Images.cart : Images.cart,
        label: cartText || 'Cart',
        badgeCount: cartItemCount,
      },
      News: {
        source: focused ? Images.NewsActive || Images.News : Images.News,
        label: newsText || 'News',
      },
      Account: {
        source: focused ? Images.accountActive || Images.account : Images.account,
        label: accountText || 'Account',
      },
    };

    const config = iconConfigs[routeName as keyof typeof iconConfigs];

    return (
      <TabBarIcon
        source={config.source}
        focused={focused}
        label={config.label}
        routeName={routeName}
        badgeCount={'badgeCount' in config ? config.badgeCount : undefined}
      />
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            onPress={props.onPress}
            style={[props.style, styles.tabButton]}
            activeOpacity={0.6}
          />
        ),
        tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Category" component={CategoryStackNavigator} />
      <Tab.Screen 
        name="Cart" 
        component={CheckoutScreen}
        options={{ 
          headerShown: false,
          // Optional: Unmount when blur to reset state
          unmountOnBlur: true,
        }} 
      />
      <Tab.Screen name="News" component={ArticleScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    height: heightPercentageToDP(8.5),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 20,
    paddingBottom: heightPercentageToDP(0.8),
    paddingHorizontal: widthPercentageToDP(1),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: widthPercentageToDP(15),
    paddingVertical: heightPercentageToDP(0.5),
  },
  iconContainer: {
    position: 'relative',
    marginBottom: heightPercentageToDP(0.2),
  },
  iconBackground: {
    width: widthPercentageToDP(8),
    height: widthPercentageToDP(8),
    borderRadius: widthPercentageToDP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: widthPercentageToDP(5.2),
    height: widthPercentageToDP(5.2),
  },
  cartIcon: {
    width: widthPercentageToDP(5.6),
    height: widthPercentageToDP(5.6),
  },
  accountIcon: {
    width: widthPercentageToDP(5),
    height: widthPercentageToDP(5),
  },
  label: {
    fontSize: widthPercentageToDP(2.4),
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.2,
    marginTop: heightPercentageToDP(0.3),
    fontFamily: 'System',
  },
  badge: {
    position: 'absolute',
    right: -widthPercentageToDP(1.5),
    top: -heightPercentageToDP(0.4),
    borderRadius: widthPercentageToDP(3),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeInner: {
    minWidth: widthPercentageToDP(4),
    height: widthPercentageToDP(4),
    backgroundColor: COLORS.badgeBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: widthPercentageToDP(0.8),
  },
  badgeText: {
    color: COLORS.badgeText,
    fontSize: widthPercentageToDP(2),
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -heightPercentageToDP(1.2),
    width: widthPercentageToDP(1.2),
    height: widthPercentageToDP(1.2),
    borderRadius: widthPercentageToDP(0.6),
    backgroundColor: COLORS.primary,
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default BottomTabScreen;