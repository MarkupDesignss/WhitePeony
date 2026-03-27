// components/AppBrowser.tsx
import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    SafeAreaView,
    Platform,
    Linking,
    Alert,
} from 'react-native';
import HTML from 'react-native-render-html';
import { Image } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';

interface AppBrowserProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    content?: string;
    image?: string;
    url?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const AppBrowser: React.FC<AppBrowserProps> = ({
    visible,
    onClose,
    title = 'Information',
    content,
    image,
    url,
}) => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && url) {
            openInAppBrowser();
        }
    }, [visible, url]);

    const openInAppBrowser = async () => {
        if (!url) return;

        try {
            setLoading(true);

            if (await InAppBrowser.isAvailable()) {
                const result = await InAppBrowser.open(url, {
                    // iOS Properties
                    dismissButtonStyle: 'cancel',
                    preferredBarTintColor: '#453015',
                    preferredControlTintColor: '#DDE35A',
                    readerMode: false,
                    animated: true,
                    modalPresentationStyle: 'fullScreen',
                    modalTransitionStyle: 'coverVertical',
                    modalEnabled: true,
                    enableBarCollapsing: false,
                    // Android Properties
                    showTitle: true,
                    toolbarColor: '#453015',
                    secondaryToolbarColor: '#DDE35A',
                    navigationBarColor: '#000000',
                    navigationBarDividerColor: '#DDE35A',
                    enableUrlBarHiding: true,
                    enableDefaultShare: true,
                    forceCloseOnRedirection: false,
                    animations: {
                        startEnter: 'slide_in_right',
                        startExit: 'slide_out_left',
                        endEnter: 'slide_in_left',
                        endExit: 'slide_out_right',
                    },
                    headers: {
                        'my-custom-header': 'my-custom-header-value',
                    },
                });

                setLoading(false);

                if (result.type === 'cancel') {
                    // User cancelled the browser
                    console.log('Browser closed by user');
                }

                onClose();
            } else {
                // Fallback to Linking
                Linking.openURL(url);
                setLoading(false);
                onClose();
            }
        } catch (error) {
            setLoading(false);
            console.error('Error opening in-app browser:', error);
            Alert.alert(
                'Cannot Open Link',
                'Unable to open the link. Please check your internet connection.',
                [{ text: 'OK', onPress: onClose }]
            );
        }
    };

    const renderHTMLContent = () => {
        if (!content) return null;

        return (
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header Image */}
                {image && (
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: image }}
                            style={styles.headerImage}
                            resizeMode="cover"
                        />
                    </View>
                )}

                {/* Title */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                </View>

                {/* HTML Content */}
                <View style={styles.contentContainer}>
                    <HTML
                        source={{ html: content }}
                        contentWidth={screenWidth - 32}
                        baseStyle={styles.htmlContent}
                        tagsStyles={tagsStyles}
                    />
                </View>
            </ScrollView>
        );
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            statusBarTranslucent={false}
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {title}
                        </Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Content or Loading */}
                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#DDE35A" />
                            <Text style={styles.loadingText}>Opening browser...</Text>
                        </View>
                    ) : (
                        renderHTMLContent()
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const tagsStyles = {
    body: {
        color: '#333',
        fontSize: 16,
        lineHeight: 24,
    },
    p: {
        marginBottom: 12,
        fontSize: 15,
        lineHeight: 22,
        color: '#666',
    },
    h1: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#000',
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 14,
        color: '#000',
    },
    h3: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#000',
    },
    strong: {
        fontWeight: 'bold',
        color: '#000',
    },
    a: {
        color: '#DDE35A',
        textDecorationLine: 'underline',
    },
    ul: {
        marginBottom: 12,
        paddingLeft: 20,
    },
    ol: {
        marginBottom: 12,
        paddingLeft: 20,
    },
    li: {
        marginBottom: 6,
        fontSize: 15,
        lineHeight: 22,
        color: '#666',
    },
    img: {
        marginVertical: 16,
        borderRadius: 8,
    },
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    closeButton: {
        padding: 8,
        marginLeft: -8,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#666',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#f5f5f5',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    titleContainer: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        lineHeight: 32,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    htmlContent: {
        fontSize: 15,
        lineHeight: 22,
        color: '#666',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999',
    },
});

export default AppBrowser;