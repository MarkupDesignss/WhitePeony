// src/utils/currency.ts
import { SupportedCurrency } from '../redux/slices/currencySlice';

// Currency symbols (after price for European style)
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
    EUR: '€',
    USD: '$',
    CZK: 'Kč'
};

// ✅ FIXED: Show 2 decimal places, not rounded
export const formatCurrencyNumber = (value: number): string => {
    // Round to 2 decimal places for accuracy
    const rounded = Math.round(value * 100) / 100;

    // Handle negative values properly
    const absValue = Math.abs(rounded);

    // Show 2 decimal places always
    const formatted = absValue.toFixed(2);

    // Add negative sign back if needed
    return rounded < 0 ? `-${formatted}` : formatted;
};

// ✅ FIXED: Remove rounding here - keep precise
export const convertFromEUR = (
    priceEUR: number,
    selectedCurrency: SupportedCurrency,
    rates?: Record<string, number>
): number => {
    // Return original if no rates or invalid price
    if (!rates || typeof priceEUR !== 'number' || isNaN(priceEUR)) return priceEUR;

    // If EUR selected, return original
    if (selectedCurrency === 'EUR') return priceEUR;

    // Get required rates
    const eurRate = rates['EUR']; // EUR value in USD
    const targetRate = rates[selectedCurrency]; // Target currency value in USD

    // Both rates must exist
    if (!eurRate || !targetRate) return priceEUR;

    // Convert: (Price in EUR) / (EUR rate) * (Target rate)
    // ✅ NO ROUNDING HERE - keep precise
    return (priceEUR / eurRate) * targetRate;
};

// Format price with symbol AFTER the number (European style)
export const formatPrice = (
    price: number,
    selectedCurrency: SupportedCurrency
): string => {
    const symbol = CURRENCY_SYMBOLS[selectedCurrency];
    const formattedNumber = formatCurrencyNumber(price);
    return `${formattedNumber} ${symbol}`;
};

// Main function - convert EUR price to selected currency and format
export const convertAndFormatPrice = (
    priceEUR: number | string | null | undefined,
    selectedCurrency: SupportedCurrency,
    rates?: Record<string, number>
): string => {
    // Handle invalid values
    if (priceEUR === null || priceEUR === undefined || priceEUR === '') {
        return '0.00 ' + CURRENCY_SYMBOLS[selectedCurrency];
    }

    // Convert to number
    const numericPrice = typeof priceEUR === 'string'
        ? parseFloat(priceEUR)
        : priceEUR;

    if (isNaN(numericPrice) || typeof numericPrice !== 'number') {
        return '0.00 ' + CURRENCY_SYMBOLS[selectedCurrency];
    }

    // If EUR selected, format with symbol
    if (selectedCurrency === 'EUR' || !rates) {
        const symbol = CURRENCY_SYMBOLS['EUR'];
        const formattedNumber = formatCurrencyNumber(numericPrice);
        return `${formattedNumber} ${symbol}`;
    }

    // Convert currency (no rounding in convertFromEUR now)
    const convertedPrice = convertFromEUR(numericPrice, selectedCurrency, rates);

    // Handle conversion errors
    if (isNaN(convertedPrice) || !isFinite(convertedPrice)) {
        const symbol = CURRENCY_SYMBOLS[selectedCurrency];
        const formattedNumber = formatCurrencyNumber(numericPrice);
        return `${formattedNumber} ${symbol}`;
    }

    // Format with symbol after number
    return formatPrice(convertedPrice, selectedCurrency);
};

// For displaying discounted prices
export interface PriceDisplay {
    current: string;
    original?: string;
    hasDiscount: boolean;
}

export const getPriceDisplay = (
    item: any,
    selectedCurrency: SupportedCurrency,
    rates?: Record<string, number>
): PriceDisplay => {
    if (!item) return {
        current: '0.00 ' + CURRENCY_SYMBOLS[selectedCurrency],
        hasDiscount: false
    };

    // Get prices in EUR
    const discountedPriceEUR = item?.variants?.[0]?.actual_price ||
        item?.actual_price ||
        item?.price;

    const originalPriceEUR = item?.variants?.[0]?.price ||
        item?.total_price ||
        item?.price;

    // Convert both
    const currentPrice = convertAndFormatPrice(
        discountedPriceEUR || originalPriceEUR,
        selectedCurrency,
        rates
    );

    const originalPrice = convertAndFormatPrice(originalPriceEUR, selectedCurrency, rates);

    const hasDiscount = discountedPriceEUR &&
        originalPriceEUR &&
        discountedPriceEUR < originalPriceEUR;

    return {
        current: currentPrice,
        original: hasDiscount ? originalPrice : undefined,
        hasDiscount
    };
};