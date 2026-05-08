import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { UserService } from '../service/ApiService';
import { RootState } from '../redux/store';
import TransletText from '../components/TransletText';

interface TermsData {
    title: string;
    content: string;
    content_de?: string;
    conten_cz?: string;
    image: string | null;
}

const Terms: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [terms, setTerms] = useState<TermsData | null>(null);
    const { width } = useWindowDimensions();
    const navigation = useNavigation();

    const currentLanguage = useSelector(
        (state: RootState) => state.language.code,
    );

    useEffect(() => {
        fetchTerms();
    }, []);

    const fetchTerms = async () => {
        try {
            const response = await UserService.SlugAPI('terms-policy'); // ✅ uses pages/terms-policy // make sure this method exists
            if (response?.data?.success) {
                setTerms(response.data.data);
            } else {
                console.warn('API returned success=false');
            }
        } catch (error) {
            console.log('Terms & Conditions Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getContentByLanguage = (): string => {
        if (!terms) return '';
        switch (currentLanguage) {
            case 'cs':
                return terms.conten_cz || terms.content;
            case 'de':
                return terms.content_de || terms.content;
            default:
                return terms.content;
        }
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Back Button and Translated Title */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <TransletText
                    text={terms?.title || 'Terms & Conditions'}
                    style={styles.headerTitle}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <RenderHtml
                    contentWidth={width}
                    source={{ html: getContentByLanguage() }}
                    tagsStyles={tagsStyles}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const tagsStyles = {
    body: { color: '#333', fontSize: 15, lineHeight: 24 },
    p: { color: '#333', fontSize: 15, lineHeight: 24, marginBottom: 10 },
    h2: {
        color: '#000',
        fontSize: 20,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 10,
    },
    li: { color: '#333', fontSize: 15, lineHeight: 24, marginBottom: 6 },
    strong: { fontWeight: 'bold', color: '#000' },
    a: { color: '#007AFF', textDecorationLine: 'none' },
    ul: { marginBottom: 15 },
    div: { marginBottom: 10 },
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    backIcon: {
        fontSize: 28,
        color: '#000',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        flex: 1,
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

export default Terms;