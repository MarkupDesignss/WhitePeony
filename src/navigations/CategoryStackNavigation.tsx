import React, { FC, useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CategoryDetailsList from '../screens/CategoryTab/CategoryDetailsList';
import CategoryScreen from '../screens/CategoryTab/CategoryScreen';
const CategoryStackNavigator: FC = () => {
    const Stack = createNativeStackNavigator();

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen  name="Category" component={CategoryScreen} />
            <Stack.Screen
                name="CategoryDetailsList"
                component={CategoryDetailsList}
            />
        </Stack.Navigator>
    );
};

export default CategoryStackNavigator;
