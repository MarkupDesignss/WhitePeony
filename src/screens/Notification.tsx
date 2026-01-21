import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { UserService } from '../service/ApiService';
import { CommonLoader } from '../components/CommonLoader/commonLoader';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { Colors } from '../constant';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const notificationsData = [
    {
        id: '1',
        title: 'Blue Matcha – Butterfly Pea Flower',
        description:
            'Immerse yourself in the exquisite taste of Butterfly Pea Powder Matcha.',
        time: '1 day ago',
        read: false,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png',
    },
    {
        id: '2',
        title: "Time's running out!",
        description: '15% off ends in a few hours. Use code WHITESALE Now!',
        time: '1 day ago',
        read: false,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png',
    },
    {
        id: '3',
        title: 'Ready for daily orders!',
        description:
            'Immerse yourself in the exquisite taste of Butterfly Pea Powder Matcha.',
        time: '1 day ago',
        read: false,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png',
    },
    {
        id: '4',
        title: 'Ready for daily orders!',
        description:
            'Immerse yourself in the exquisite taste of Butterfly Pea Powder Matcha.',
        time: '2 days ago',
        read: true,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png',
    },
    {
        id: '5',
        title: "Time's running out!",
        description: '15% off ends in a few hours. Use code WHITESALE Now!',
        time: '4 days ago',
        read: true,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png',
    },
];

const tabs = [
    { key: 'today', label: 'Today (4)' },
    { key: 'week', label: 'This Week' },
    { key: 'earlier', label: 'Earlier' },
];

const NotificationScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('today');
    const { showLoader, hideLoader } = CommonLoader();

    // Filter notifications based on activeTab
    let filteredNotifications = [];
    switch (activeTab) {
        case 'today':
            filteredNotifications = notificationsData.filter(n =>
                ['1', '2', '3'].includes(n.id),
            );
            break;
        case 'week':
            filteredNotifications = notificationsData.filter(n =>
                ['4'].includes(n.id),
            );
            break;
        case 'earlier':
            filteredNotifications = notificationsData.filter(n =>
                ['5'].includes(n.id),
            );
            break;
        default:
            filteredNotifications = notificationsData;
    }

   const renderTab = tab => {
    const isActive = activeTab === tab.key;
    return (
        <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
            style={[
                styles.tabButtonContainer,
                isActive ? styles.activeTabContainer : styles.inactiveTabContainer,
            ]}
        >
            {isActive ? (
                <View style={styles.activeTabContent}>
                    <LinearGradient
                        colors={[Colors.button[100], Colors.button[100]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.activeTabGradient}
                    >
                        <Text style={[styles.tabLabel, styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </LinearGradient>
                    <View style={styles.activeTabUnderline} />
                </View>
            ) : (
                <View style={[styles.tabContent, styles.inactiveTabContent]}>
                    <Text style={[styles.tabLabel, styles.tabLabelInactive]}>
                        {tab.label}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};
    const renderNotification = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationCard, item.read ? styles.readCard : {}]}
            onPress={() => NotoficationRead(item.id)}
            activeOpacity={0.8}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Image
                    source={require('../assets/Png/headerLogo.png')}
                    style={{ width: 100, height: 12 }}
                />
                <View style={styles.notificationRight}>
                    <Text style={styles.notificationTime}>{item.time}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                </View>
            </View>

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 10,
                    alignItems: 'center',
                }}
            >
                <Image source={{ uri: item.image }} style={styles.notificationImage} />
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationDesc}>{item.description}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    useEffect(() => {
        NotoficationList();
    }, []);

    const NotoficationList = async () => {
        try {
            showLoader();
            const res = await UserService.notifications();
            hideLoader();
            if (res?.status === HttpStatusCode.Ok && res?.data) {
                const { message, data } = res.data;
                console.log('NotoficationList data:', res.data);
                Toast.show({ type: 'success', text1: message });
            } else {
                Toast.show({
                    type: 'error',
                    text1: res?.data?.message || 'Something went wrong!',
                });
            }
        } catch (err: any) {
            hideLoader();
            console.log('Error in DeleteAcc:', JSON.stringify(err));
            Toast.show({
                type: 'error',
                text1:
                    err?.response?.data?.message ||
                    'Something went wrong! Please try again.',
            });
        }
    };

    const NotoficationRead = async (id: any) => {
        try {
            showLoader();
            const res = await UserService.notificationsreadID(id);
            hideLoader();
            if (res?.status === HttpStatusCode.Ok && res?.data) {
                const { message, data } = res.data;
                console.log('NotoficationRead data:', res.data);
                Toast.show({ type: 'success', text1: message });
            } else {
                Toast.show({
                    type: 'error',
                    text1: res?.data?.message || 'Something went wrong!',
                });
            }
        } catch (err: any) {
            hideLoader();
            console.log('Error in NotoficationRead:', JSON.stringify(err));
            Toast.show({
                type: 'error',
                text1:
                    err?.response?.data?.message ||
                    'Something went wrong! Please try again.',
            });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Image
                            source={require('../assets/Png/back.png')}
                            style={{ width: 20, height: 20 }}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notification</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Tabs - Fixed container with proper spacing */}
                <View style={styles.tabsContainer}>
                    {tabs.map((tab, index) => (
                        <React.Fragment key={tab.key}>
                            {renderTab(tab)}
                            {index < tabs.length - 1 && <View style={styles.tabSeparator} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* List */}
                <FlatList
                    data={filteredNotifications}
                    keyExtractor={item => item.id}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 20,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    backButton: {
        width: 24,
        height: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111',
    },
    // Fixed tabs container
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F1F1',
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 4,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tabButtonContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        marginHorizontal: 2,
    },
    activeTabContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    inactiveTabContainer: {
        paddingHorizontal: 8,
    },
    activeTabContent: {
      flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    inactiveTabContent: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        // paddingVertical: 8,
        // paddingHorizontal: 16,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    tabLabelActive: {
        color: '#000',
    },
    tabLabelInactive: {
        color: '#888',
    },
    activeTabUnderline: {
        height: 3,
        width: 30,
        borderRadius: 2,
        backgroundColor: Colors.button[100],
        marginTop: 4,
        alignSelf: 'center',
    },
    tabSeparator: {
        width: 1,
        height: 24,
        backgroundColor: '#E0E0E0',
    },
    notificationCard: {
        backgroundColor: '#fff',
        padding: 14,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
        marginHorizontal: 20,
    },
    readCard: {
        opacity: 0.6,
    },
    notificationImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
        marginRight: 12,
        resizeMode: 'cover',
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontWeight: '700',
        color: '#111',
        fontSize: 14,
        marginBottom: 4,
    },
    notificationDesc: {
        fontWeight: '400',
        fontSize: 12,
        color: '#555',
    },
    notificationRight: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexDirection: 'row',
    },
    notificationTime: {
        fontSize: 11,
        color: '#999',
        marginRight: 8,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#BECC8D',
    },
    listContainer: {
        paddingBottom: 100,
    },
});

export default NotificationScreen;