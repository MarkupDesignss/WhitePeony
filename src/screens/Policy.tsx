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
import TransletText from '../components/TransletText'; // adjust path as needed

interface PolicyData {
  title: string;
  content: string;
  content_de?: string;
  conten_cz?: string; 
  image: string | null;
}

const Policy: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const currentLanguage = useSelector(
    (state: RootState) => state.language.code,
  );

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await UserService.privacyPolicy();
      if (response?.data?.success) {
        setPolicy(response.data.data);
      } else {
        console.warn('API returned success=false');
      }
    } catch (error) {
      console.log('Privacy Policy Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentByLanguage = (): string => {
    if (!policy) return '';
    switch (currentLanguage) {
      case 'cs':
        return policy.conten_cz || policy.content;
      case 'de':
        return policy.content_de || policy.content;
      default:
        return policy.content;
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
          text={policy?.title || 'Privacy Policy'}
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

export default Policy;