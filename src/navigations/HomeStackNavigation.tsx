import React, { FC, useContext, useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabScreen from "./BottomtabNavigation";
import HomeScreen from "../screens/HomeTab/HomeScreen";
import CategoryScreen from "../screens/CategoryTab/CategoryScreen";
import EventScreen from "../screens/EventTab/EventScreen";
import ArticleScreen from "../screens/ArticleTab/ArticleScreen";
import AccountScreen from "../screens/AccountTab/AccountScreen";
import ArticleDetails from "../screens/ArticleTab/ArticleDetails";
import EventDetails from "../screens/EventTab/EventDetails";
import BookingSuccess from "../screens/EventTab/BookingSuccess";
import SplashScreens from "../SplashScreens";
import CategoryDetailsList from "../screens/CategoryTab/CategoryDetailsList";
import ProductDetails from "../screens/HomeTab/ProductDetails";
import EditProfile from "../screens/ProfileTab/EditProfile";
import NotificationScreen from "../screens/Notification";
import WishlistScreen from "../screens/HomeTab/Wishlist";
import OrdersScreen from "../screens/AccountTab/OrdersScreen";
import CheckoutScreen from "../screens/HomeTab/CheckoutScreen";
import IntroScreen from "../screens/IntroScreen/IntroScreen";
import PaymentSuccess from "../screens/HomeTab/PaymentSuccess";
import { checkFirstLaunch, setFirstLaunch } from "../helpers/helpers";
import MyEventsScreen from "../screens/EventTab/MyEvents";
import Slugs from "../screens/ProfileTab/Slugs";
import SelectLanguageScreen from "../SelectLanguageScreen";
import Searchpage from "../screens/HomeTab/Searchpage";



const HomeStackNavigator: FC = () => {
  const Stack = createNativeStackNavigator();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);


  useEffect(() => {
    const init = async () => {
      const first = await checkFirstLaunch();
      setIsFirstLaunch(first);
      if (first) await setFirstLaunch();
      setTimeout(() => setShowSplash(false), 2000); // Show splash for 2 seconds
    };
    init();
  }, []);

  if (showSplash || isFirstLaunch === null) {
    return <SplashScreens />;
  }


  return (
    <Stack.Navigator initialRouteName={isFirstLaunch ? "SelectLanguageScreen" : "BottomTabScreen"} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SplashScreens" component={SplashScreens} />
      <Stack.Screen name="SelectLanguageScreen" component={SelectLanguageScreen} />
      <Stack.Screen name="BottomTabScreen" component={BottomTabScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="CategoryScreen" component={CategoryScreen} />
      <Stack.Screen name="EventScreen" component={EventScreen} />
      <Stack.Screen name="ArticleScreen" component={ArticleScreen} />
      <Stack.Screen name="AccountScreen" component={AccountScreen} />
      <Stack.Screen name="ArticleDetails" component={ArticleDetails} />
      <Stack.Screen name="EventDetails" component={EventDetails} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccess} />
      <Stack.Screen name="CategoryDetailsList" component={CategoryDetailsList} />
      <Stack.Screen name="ProductDetails" component={ProductDetails} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
      <Stack.Screen name="WishlistScreen" component={WishlistScreen} />
      <Stack.Screen name="OrdersScreen" component={OrdersScreen} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <Stack.Screen name="IntroScreen" component={IntroScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
      <Stack.Screen name="MyEventsScreen" component={MyEventsScreen} />
      <Stack.Screen name="Searchpage" component={Searchpage} />
      <Stack.Screen name="Slugs" component={Slugs} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
