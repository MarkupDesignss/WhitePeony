import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Linking,
    Platform,
    BackHandler,
    StatusBar,
    Dimensions,
} from 'react-native';
import { VersionInfo } from './VersionCheckService';

const { width } = Dimensions.get('window');

interface ForceUpdateScreenProps {
    versionInfo: VersionInfo;
}

const ForceUpdateScreen: React.FC<ForceUpdateScreenProps> = ({ versionInfo }) => {
    useEffect(() => {
        // Disable back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            return true; // Prevent back navigation
        });

        return () => backHandler.remove();
    }, []);

    const handleUpdate = () => {
        const updateUrl = Platform.OS === 'ios' ? versionInfo.iosUrl : versionInfo.androidUrl;
        Linking.openURL(updateUrl).catch(err => {
            console.error('Failed to open store:', err);
        });
    };

    return (
        <View style={styles.overlay}>
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />

            <View style={styles.card}>
                {/* 1. Header Section with Matte Olive Background */}
                <View style={styles.headerSection}>
                    {/* Inner Faux Gradient Shadow */}
                    <View style={styles.innerShadow} />

                    <View style={styles.iconCircle}>
                        <Image
                            source={require('../assets/reload.png')}
                            style={styles.icon}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* 2. Content Section */}
                <View style={styles.body}>
                    <Text style={styles.title}>Update Required</Text>

                    <View style={styles.versionContainer}>
                        <Text style={styles.subtitle}>Version</Text>
                        <Text style={styles.versionTag}>{versionInfo.latestVersion}</Text>
                    </View>

                    <Text style={styles.message}>
                        To ensure optimal performance, enhanced security, and the latest features, please update the app now.
                    </Text>

                    {/* 3. Primary Button */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleUpdate}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.buttonText}>UPDATE NOW</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>Mandatory Update</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)', // Transparent dark background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: width * 0.88, // 88% of screen width
        backgroundColor: '#fff',
        borderRadius: 30, // Extra rounded for a soft feel
        overflow: 'hidden',
        // Standard high elevation shadow
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    headerSection: {
        height: 160,
        backgroundColor: '#AEB254', // Matte Olive Green
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    innerShadow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        opacity: 0.1, // Subtlest faux-gradient darkening at the bottom
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassmorphism-style circle
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    icon: {
        width: 50,
        height: 50,
        tintColor: '#fff', // Pure white icon for contrast
    },
    body: {
        paddingVertical: 30,
        paddingHorizontal: 25,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800', // Very bold
        color: '#1A1A1A',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    versionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 14,
        color: '#777',
        marginRight: 6,
    },
    versionTag: {
        fontSize: 13,
        fontWeight: '700',
        color: '#AEB254',
        backgroundColor: '#F5F5ED', // Subtlest beige tint
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    message: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 35,
        lineHeight: 22, // Increases readability
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#AEB254',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        // Button Shadow
        shadowColor: '#AEB254',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    footerNote: {
        marginTop: 18,
        fontSize: 11,
        color: '#BBB',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

export default ForceUpdateScreen;