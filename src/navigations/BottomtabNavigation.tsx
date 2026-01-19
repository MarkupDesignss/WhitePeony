import { Image, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, Images } from '../constant';
import { heightPercentageToDP } from '../constant/dimentions';
import HomeScreen from '../screens/HomeTab/HomeScreen';
import CategoryScreen from '../screens/CategoryTab/CategoryScreen';
import EventScreen from '../screens/EventTab/EventScreen';
import AccountScreen from '../screens/AccountTab/AccountScreen';
import ArticleScreen from '../screens/ArticleTab/ArticleScreen';
import HomeScreen1 from '../screens/HomeTab/HomeScreen1';

const Tab = createBottomTabNavigator();

interface CustomTabBarIconProps {
  source: any; // Replace 'any' with the specific type if known, e.g., ImageSourcePropType
  focused: boolean;
  name: string; // Added name prop for potential future use
}

const CustomTabBarIcon: React.FC<CustomTabBarIconProps> = ({
  source,
  focused,

  name, // Added name prop for potential future use
}) => {
  // const scaleX = focused ? 1.2: 1;
  // const boxStyle = focused ? styles.activeBox : styles.inactiveBox;

  return (
    <View style={styles.iconContainer}>
      <Image
        source={source}
        style={[
          styles.icon,
          { tintColor: focused ? undefined : Colors.text[300], },
        ]}
        resizeMode="contain"
      />
      <Text
        style={{
          color: focused ? '#AEB254' : Colors.text[300],
          fontSize: 12,
          marginTop: 4,
        }}
      >
        {name}
      </Text>
    </View>
  );
};

const BottomTabScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#AEB254", // active color
        tabBarInactiveTintColor: "#999", // inactive color
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 10, // Updated active tint color
        },
        tabBarShowLabel: true,
        tabBarIcon: ({ focused, color }) => {
          let iconSource;

          if (route.name === 'Home') {
            iconSource = focused ? Images.homeC : Images.home; // Replace with your image path
          } else if (route.name === 'Category') {
            iconSource = focused ? Images.shoppingc : Images.category; // Replace with your image path
          } else if (route.name === 'Events') {
            iconSource = focused ? Images.eventC : Images.event; // Updated image path for Events
          } else if (route.name === 'Articles') {
            iconSource = focused ? Images.blogC : Images.article; // Updated image path for Articles
          } else if (route.name === 'Accounts') {
            iconSource = focused ? Images.GroupC : Images.account; // Updated image path for Accounts
          }

          return (
            <View style={{ alignItems: "center" }}>
              {/* 🔹 Top indicator line */}
              {focused && (
                <View
                  style={{
                    height: 3,
                    width: 45,
                    backgroundColor: "#AEB254",
                    borderRadius: 2,
                    bottom: -25
                  }}
                />
              )}

              <CustomTabBarIcon
                source={iconSource}
                focused={focused}
                color={color}
              //   name={route.name}
              />
            </View>

          );


        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen1}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Category"
        component={CategoryScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Events"
        component={EventScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Articles"
        component={ArticleScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabScreen;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.text[100],
    height: 90,
    // borderTopWidth: 1,
    // borderTopColor: Colors.text[100],
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 50,
    borderRadius: 10,
    // backgroundColor:'red',
    marginTop: heightPercentageToDP(4),
  },
  activeBox: {
    backgroundColor: Colors.text[600],
    borderRadius: 10,
    height: 50,
    width: 60,
    // marginTop: -5,
    // Highlight color for active tab
  },
  inactiveBox: {
    backgroundColor: '#000',
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: Colors.button[100], // Updated icon color to use button color
  },
});
