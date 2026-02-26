// HomeStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen1 from '../screens/HomeTab/HomeScreen1';
import ProductDetails from '../screens/HomeTab/ProductDetails';
import CheckoutScreen from '../screens/HomeTab/CheckoutScreen';
import PaymentSuccess from '../screens/HomeTab/PaymentSuccess';
import Searchpage from '../screens/HomeTab/Searchpage';
import WishlistScreen from '../screens/HomeTab/Wishlist';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen1" component={HomeScreen1} />
      <Stack.Screen name="ProductDetails" component={ProductDetails} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
      <Stack.Screen name="Searchpage" component={Searchpage} />
      <Stack.Screen name="WishlistScreen" component={WishlistScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
