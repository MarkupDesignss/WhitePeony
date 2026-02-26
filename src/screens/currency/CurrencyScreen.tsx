import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import {
  setCurrency,
  SupportedCurrency,
} from '../../redux/slices/currencySlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';

const currencies: { code: SupportedCurrency; label: string; symbol: string }[] =
  [
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'EUR', label: 'Euro', symbol: '€' },
    { code: 'CZK', label: 'Czech Koruna', symbol: 'Kč' },
  ];

const CurrencyScreen = () => {
  const dispatch = useAppDispatch();
  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );

  const renderItem = ({ item }: { item: (typeof currencies)[0] }) => {
    const isSelected = item.code === selectedCurrency;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => dispatch(setCurrency(item.code))}
      >
        <View style={styles.row}>
          <Text
            style={[styles.currencySymbol, isSelected && styles.selectedText]}
          >
            {item.symbol}
          </Text>
          <View style={styles.textContainer}>
            <Text
              style={[styles.currencyCode, isSelected && styles.selectedText]}
            >
              {item.code}
            </Text>
            <Text style={styles.currencyLabel}>{item.label}</Text>
          </View>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TransletText text="Select Your Currency" style={styles.title} />
      <TransletText
        text="Prices in the app will be displayed in your selected currency"
        style={styles.subtitle}
      />
      <FlatList
        data={currencies}
        keyExtractor={item => item.code}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 20 }}
      />
    </SafeAreaView>
  );
};

export default CurrencyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: '#4caf50',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    marginRight: 16,
    color: '#333',
  },
  textContainer: {
    flexDirection: 'column',
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  currencyLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedText: {
    color: '#fff',
  },
  checkmark: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
});
