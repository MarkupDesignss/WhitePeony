import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { UserService } from '../service/ApiService';
import { CommonLoader } from '../components/CommonLoader/commonLoader';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { Colors } from '../constant';

const notificationsData = [
    {
        id: '1',
        title: 'Blue Matcha – Butterfly Pea Flower',
        description: 'Immerse yourself in the exquisite taste of Butterfly Pea Powder Matcha.',
        time: '1 day ago',
        read: false,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png', // example image, replace with actual URL
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
        description: 'Immerse yourself in the exquisite taste of Butterfly Pea Powder Matcha.',
        time: '1 day ago',
        read: false,
        image: 'https://cdn-icons-png.flaticon.com/512/135/135620.png',
    },
    {
        id: '4',
        title: 'Ready for daily orders!',
        description: 'Immerse yourself in the exquisite taste of Butterfly Pea Powder Matcha.',
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
    // For demo, we'll just display all items for "today" tab, adjust as needed
    let filteredNotifications = [];
    switch (activeTab) {
        case 'today':
            filteredNotifications = notificationsData.filter(n => ['1', '2', '3'].includes(n.id));
            break;
        case 'week':
            filteredNotifications = notificationsData.filter(n => ['4'].includes(n.id));
            break;
        case 'earlier':
            filteredNotifications = notificationsData.filter(n => ['5'].includes(n.id));
            break;
        default:
            filteredNotifications = notificationsData;
    }

    const renderTab = (tab) => {
        const isActive = activeTab === tab.key;
        return (
            <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={styles.tabButtonContainer}
            >
                {isActive ? (
                    <LinearGradient
                        colors={[Colors.button[100], Colors.button[100]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.activeTabGradient}
                    >
                        <Text style={[styles.tabLabel, styles.tabLabelActive]}>{tab.label}</Text>
                    </LinearGradient>
                ) : (
                    <Text style={[styles.tabLabel]}>{tab.label}</Text>
                )}
                {isActive && <View style={styles.activeTabUnderline} />}
            </TouchableOpacity>
        );
    };

    const renderNotification = ({ item }) => (
        <>
            <View style={[styles.notificationCard, item.read ? styles.readCard : {}]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Image source={require('../assets/Png/headerLogo.png')} style={{ width: 100, height: 12 }} />
                    <View style={styles.notificationRight}>
                        <Text style={styles.notificationTime}>{item.time}</Text>
                        {!item.read && <View style={styles.unreadDot} />}

                    </View>

                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                    <Image
                        source={{ uri: item.image }}
                        style={styles.notificationImage}
                    />
                    <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{item.title}</Text>
                        <Text style={styles.notificationDesc}>{item.description}</Text>
                    </View>
                </View>
            </View>
        </>
    );

    useEffect(() => {
        NotoficationList();
    }, [])

    const NotoficationList = async () => {
        try {
            showLoader();
            const res = await UserService.notifications();
            hideLoader();
            if (res?.status === HttpStatusCode.Ok && res?.data) {
                const { message, data } = res.data;
                console.log("NotoficationList data:", res.data);
                Toast.show({ type: "success", text1: message });

            } else {
                Toast.show({
                    type: "error",
                    text1: res?.data?.message || "Something went wrong!",
                });
            }
        } catch (err: any) {
            hideLoader();
            console.log("Error in DeleteAcc:", JSON.stringify(err));
            Toast.show({
                type: "error",
                text1: err?.response?.data?.message || "Something went wrong! Please try again.",
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
                console.log("NotoficationRead data:", res.data);
                Toast.show({ type: "success", text1: message });

            } else {
                Toast.show({
                    type: "error",
                    text1: res?.data?.message || "Something went wrong!",
                });
            }
        } catch (err: any) {
            hideLoader();
            console.log("Error in NotoficationRead:", JSON.stringify(err));
            Toast.show({
                type: "error",
                text1: err?.response?.data?.message || "Something went wrong! Please try again.",
            });
        }
    };

    return (
        <View style={styles.safeArea}>
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    {/* Back Arrow */}
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Image source={require('../assets/Png/back.png')} style={{ width: 20, height: 20 }} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notification</Text>
                    <View style={{ width: 24 }} />{/* placeholder for spacing */}
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {tabs.map(renderTab)}
                </View>

                {/* List */}
                <FlatList
                    data={filteredNotifications}
                    keyExtractor={item => item.id}
                    renderItem={renderNotification}
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
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
        marginTop: 30,
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
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: '#F1F1F1', borderRadius: 20, marginHorizontal: 12
    },
    tabButtonContainer: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center'
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        paddingVertical: 2,
        textAlign: 'center',
    },
    tabLabelActive: {
        color: '#000', // greenish color
    },
    activeTabGradient: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'center',
        width: 100,

    },
    activeTabUnderline: {
        height: 3,
        width: 40,
        borderRadius: 2,
        backgroundColor: Colors.button[100],
    },
    notificationCard: {
        backgroundColor: '#fff',
        padding: 14,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
    },
    readCard: {
        opacity: 0.6
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
        flexDirection: 'row'
    },
    notificationTime: {
        fontSize: 11,
        color: '#999',
        right: 10,
    },
    unreadDot: {
        marginTop: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#BECC8D', // light green dot
    },
});

export default NotificationScreen;