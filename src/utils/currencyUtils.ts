// src/utils/currency.ts
import { SupportedCurrency } from '../redux/slices/currencySlice';

// Currency symbols (European style: symbol after number)
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: '€',
  USD: '$',
  CZK: 'Kč',
};

// Format number to always show 2 decimal places
export const formatCurrencyNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  const absValue = Math.abs(rounded);
  const formatted = absValue.toFixed(2);
  return rounded < 0 ? `-${formatted}` : formatted;
};

// Convert price from CZK → selected currency
export const convertFromCZK = (
  priceCZK: number,
  selectedCurrency: SupportedCurrency,
  rates?: Record<string, number>,
): number => {
  if (!rates || typeof priceCZK !== 'number' || isNaN(priceCZK)) {
    return priceCZK;
  }

  if (selectedCurrency === 'CZK') {
    return priceCZK;
  }

  const czkRate = rates['CZK'];
  const targetRate = rates[selectedCurrency];

  if (!czkRate || !targetRate) {
    return priceCZK;
  }

  // Step 1: CZK → USD
  const usd = priceCZK / czkRate;

  // Step 2: USD → target
  return usd * targetRate;
};

// Format price with symbol after number
export const formatPrice = (
  price: number,
  selectedCurrency: SupportedCurrency,
): string => {
  const symbol = CURRENCY_SYMBOLS[selectedCurrency];
  const formattedNumber = formatCurrencyNumber(price);
  return `${formattedNumber} ${symbol}`;
};

// Convert + format price
export const convertAndFormatPrice = (
  priceCZK: number | string | null | undefined,
  selectedCurrency: SupportedCurrency,
  rates?: Record<string, number>,
): string => {
  if (priceCZK === null || priceCZK === undefined || priceCZK === '') {
    return `0.00 ${CURRENCY_SYMBOLS[selectedCurrency]}`;
  }

  const numericPrice =
    typeof priceCZK === 'string' ? parseFloat(priceCZK) : priceCZK;

  if (typeof numericPrice !== 'number' || isNaN(numericPrice)) {
    return `0.00 ${CURRENCY_SYMBOLS[selectedCurrency]}`;
  }

  // If CZK selected OR rates not loaded
  if (selectedCurrency === 'CZK' || !rates) {
    return formatPrice(numericPrice, 'CZK');
  }

  const convertedPrice = convertFromCZK(numericPrice, selectedCurrency, rates);

  if (isNaN(convertedPrice) || !isFinite(convertedPrice)) {
    return formatPrice(numericPrice, 'CZK');
  }

  return formatPrice(convertedPrice, selectedCurrency);
};

// Price display interface
export interface PriceDisplay {
  current: string;
  original?: string;
  hasDiscount: boolean;
}

// Get price display with discount support
export const getPriceDisplay = (
  item: any,
  selectedCurrency: SupportedCurrency,
  rates?: Record<string, number>,
): PriceDisplay => {
  if (!item) {
    return {
      current: `0.00 ${CURRENCY_SYMBOLS[selectedCurrency]}`,
      hasDiscount: false,
    };
  }

  // Prices from backend (CZK)
  const discountedPriceCZK =
    item?.variants?.[0]?.actual_price || item?.actual_price || item?.price || 0;

  const originalPriceCZK =
    item?.variants?.[0]?.price || item?.total_price || item?.price || 0;

  const currentPrice = convertAndFormatPrice(
    discountedPriceCZK || originalPriceCZK,
    selectedCurrency,
    rates,
  );

  const originalPrice = convertAndFormatPrice(
    originalPriceCZK,
    selectedCurrency,
    rates,
  );

  const hasDiscount =
    discountedPriceCZK &&
    originalPriceCZK &&
    discountedPriceCZK < originalPriceCZK;

  return {
    current: currentPrice,
    original: hasDiscount ? originalPrice : undefined,
    hasDiscount,
  };
};
