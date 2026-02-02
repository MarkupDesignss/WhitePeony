import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/useAppSelector';
import { setCurrency, SupportedCurrency } from '../redux/slices/currencySlice';
import { Colors } from '../constant';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const scaleFont = (size: number) => {
  const scale = Math.min(width / 375, 1.2); // Base on iPhone 375 width
  return Math.round(size * scale);
};

// Currency data
const currencyData = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'CZK', label: 'Czech Koruna', symbol: 'Kč' },
];

interface CurrencySelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const selectedCurrency = useAppSelector(state => state.currency.selectedCurrency);
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  const contentHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleSelectCurrency = (currency: SupportedCurrency) => {
    dispatch(setCurrency(currency));
    onClose();
  };

  const renderCurrencyItem = ({ item }: { item: typeof currencyData[0] }) => {
    const isSelected = item.code === selectedCurrency;

    return (
      <TouchableOpacity
        style={[
          styles.currencyItem,
          isSelected && styles.selectedCurrencyItem,
        ]}
        onPress={() => handleSelectCurrency(item.code as SupportedCurrency)}
        activeOpacity={0.7}
      >
        <View style={styles.currencyContent}>
          <View style={styles.currencyLeft}>
            <View style={[
              styles.currencySymbolContainer,
              isSelected && styles.selectedSymbolContainer
            ]}>
              <Text style={[
                styles.currencySymbol,
                isSelected && styles.selectedSymbol
              ]}>
                {item.symbol}
              </Text>
            </View>
            <View style={styles.currencyTextContainer}>
              <Text style={[
                styles.currencyCode,
                isSelected && styles.selectedText
              ]}>
                {item.code}
              </Text>
              <Text style={[
                styles.currencyLabel,
                isSelected && styles.selectedSubText
              ]}>
                {item.label}
              </Text>
            </View>
          </View>

          {isSelected && (
            <View style={styles.selectedIndicator}>
              <View style={styles.checkmarkCircle}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Find the currently selected currency details
  const currentCurrency = currencyData.find(c => c.code === selectedCurrency) || currencyData[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
              maxHeight: height * 0.9,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Scrollable content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Select Currency</Text>
              <Text style={styles.subtitle}>
                All prices will be displayed in your selected currency
              </Text>
            </View>

            {/* Current Selection */}
            <View style={styles.currentSelection}>
              <View style={styles.currentLabelContainer}>
                <Text style={styles.currentLabel}>CURRENTLY SELECTED</Text>
              </View>
              <View style={styles.currentCurrency}>
                <View style={styles.currentCurrencyContent}>
                  <View style={styles.currentSymbolContainer}>
                    <Text style={styles.currentSymbol}>
                      {currentCurrency.symbol}
                    </Text>
                  </View>
                  <View style={styles.currentCurrencyText}>
                    <Text style={styles.currentCode}>{currentCurrency.code}</Text>
                    <Text style={styles.currentLabelText}>
                      {currentCurrency.label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Currency List */}
            <View style={styles.listContainer}>
              <View style={styles.listTitleContainer}>
                <Text style={styles.listTitle}>AVAILABLE CURRENCIES</Text>
              </View>
              <View style={styles.currencyList}>
                {currencyData.map((item) => {
                  const isSelected = item.code === selectedCurrency;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.currencyItem,
                        isSelected && styles.selectedCurrencyItem,
                      ]}
                      onPress={() => handleSelectCurrency(item.code as SupportedCurrency)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.currencyContent}>
                        <View style={styles.currencyLeft}>
                          <View style={[
                            styles.currencySymbolContainer,
                            isSelected && styles.selectedSymbolContainer
                          ]}>
                            <Text style={[
                              styles.currencySymbol,
                              isSelected && styles.selectedSymbol
                            ]}>
                              {item.symbol}
                            </Text>
                          </View>
                          <View style={styles.currencyTextContainer}>
                            <Text style={[
                              styles.currencyCode,
                              isSelected && styles.selectedText
                            ]}>
                              {item.code}
                            </Text>
                            <Text style={[
                              styles.currencyLabel,
                              isSelected && styles.selectedSubText
                            ]}>
                              {item.label}
                            </Text>
                          </View>
                        </View>

                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <View style={styles.checkmarkCircle}>
                              <Text style={styles.checkmark}>✓</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer - Fixed at bottom */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>DONE</Text>
            </TouchableOpacity>
          </View>

          {/* Safe area for notch devices */}
          {Platform.OS === 'ios' && <View style={styles.safeAreaBottom} />}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: width * 0.05,
    paddingBottom: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: scaleFont(14),
    color: '#666',
    lineHeight: 20,
  },
  currentSelection: {
    paddingHorizontal: width * 0.05,
    marginBottom: 20,
  },
  currentLabelContainer: {
    marginBottom: 8,
  },
  currentLabel: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  currentCurrency: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentCurrencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentSymbolContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.button[100] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  currentSymbol: {
    fontSize: scaleFont(22),
    fontWeight: '700',
    color: Colors.button[100],
  },
  currentCurrencyText: {
    flex: 1,
  },
  currentCode: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  currentLabelText: {
    fontSize: scaleFont(14),
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: width * 0.05,
  },
  listTitleContainer: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  currencyList: {
    marginBottom: 20,
  },
  currencyItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#f1f3f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCurrencyItem: {
    backgroundColor: Colors.button[100],
    borderColor: Colors.button[100],
    shadowColor: Colors.button[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  currencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbolContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedSymbolContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  currencySymbol: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#495057',
  },
  selectedSymbol: {
    color: '#fff',
    fontWeight: '700',
  },
  currencyTextContainer: {
    flex: 1,
  },
  currencyCode: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: scaleFont(14),
    color: '#6c757d',
  },
  selectedText: {
    color: '#fff',
  },
  selectedSubText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkmark: {
    color: Colors.button[100],
    fontSize: scaleFont(16),
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: width * 0.05,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    backgroundColor: '#fff',
  },
  closeButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  safeAreaBottom: {
    height: Platform.OS === 'ios' ? 34 : 0,
  },
});

export default CurrencySelectorModal;