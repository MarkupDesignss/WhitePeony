import { SupportedCurrency } from '../redux/slices/currencySlice';
import { convertFromEUR } from './currencyUtils';

export interface CheckoutBreakdown {
    // In EUR (from database)
    subtotalEUR: number;
    totalSavingsEUR: number;
    couponDiscountEUR: number;
    deliveryChargesEUR: number;
    grandTotalEUR: number;

    // Converted to selected currency
    subtotalConverted: number;
    totalSavingsConverted: number;
    couponDiscountConverted: number;
    deliveryChargesConverted: number;
    grandTotalConverted: number;

    // Rounded for payment
    grandTotalRounded: number;
    roundOffAmount: number;
    amountToPay: number;

    // Display strings
    displaySubtotal: string;
    displaySavings: string;
    displayCoupon: string;
    displayDelivery: string;
    displayGrandTotal: string;
    displayRoundOff: string;
    displayAmountToPay: string;
}

export const calculateCheckout = (
    // All input amounts are in EUR (from your database)
    subtotalEUR: number,
    totalSavingsEUR: number,
    couponDiscountEUR: number,
    deliveryChargesEUR: number,
    selectedCurrency: SupportedCurrency,
    rates?: Record<string, number>
): CheckoutBreakdown => {
    // 1. Ensure all inputs are valid numbers
    const safeSubtotalEUR = Number(subtotalEUR) || 0;
    const safeTotalSavingsEUR = Number(totalSavingsEUR) || 0;
    const safeCouponDiscountEUR = Number(couponDiscountEUR) || 0;
    const safeDeliveryChargesEUR = Number(deliveryChargesEUR) || 0;

    // 2. Calculate final amount in EUR
    const grandTotalEUR = safeSubtotalEUR - safeTotalSavingsEUR - safeCouponDiscountEUR + safeDeliveryChargesEUR;

    // 3. Convert all amounts to selected currency
    const convert = (amountEUR: number): number => {
        if (selectedCurrency === 'EUR' || !rates) return amountEUR;
        return convertFromEUR(amountEUR, selectedCurrency, rates);
    };

    const subtotalConverted = convert(safeSubtotalEUR);
    const totalSavingsConverted = convert(safeTotalSavingsEUR);
    const couponDiscountConverted = convert(safeCouponDiscountEUR);
    const deliveryChargesConverted = convert(safeDeliveryChargesEUR);
    const grandTotalConverted = convert(grandTotalEUR);

    // 4. Calculate rounded payment (what customer actually pays)
    const grandTotalRounded = Math.round(grandTotalConverted);
    const roundOffAmount = grandTotalRounded - grandTotalConverted;
    const amountToPay = grandTotalRounded;

    // 5. Format for display (with 2 decimals)
    const format = (amount: number, currency: SupportedCurrency): string => {
        // Ensure amount is a valid number
        const safeAmount = Number(amount) || 0;

        const symbol = currency === 'EUR' ? '€' :
            currency === 'USD' ? '$' : 'Kč';

        // Format with 2 decimal places
        const formatted = Math.abs(safeAmount).toFixed(2);

        // Remove .00 if whole number
        if (formatted.endsWith('.00')) {
            return `${formatted.slice(0, -3)} ${symbol}`;
        }
        return `${formatted} ${symbol}`;
    };

    const formatRounded = (amount: number, currency: SupportedCurrency): string => {
        // Ensure amount is a valid number
        const safeAmount = Number(amount) || 0;

        const symbol = currency === 'EUR' ? '€' :
            currency === 'USD' ? '$' : 'Kč';

        return `${Math.round(safeAmount)} ${symbol}`;
    };

    // 6. Generate display strings
    const displaySubtotal = format(subtotalConverted, selectedCurrency);
    const displaySavings = safeTotalSavingsEUR > 0 ? `-${format(totalSavingsConverted, selectedCurrency)}` : '0';
    const displayCoupon = safeCouponDiscountEUR > 0 ? `-${format(couponDiscountConverted, selectedCurrency)}` : '0';
    const displayDelivery = safeDeliveryChargesEUR > 0 ?
        format(deliveryChargesConverted, selectedCurrency) : 'Free';
    const displayGrandTotal = format(grandTotalConverted, selectedCurrency);
    const displayRoundOff = Math.abs(roundOffAmount) > 0.01 ?
        (roundOffAmount >= 0 ?
            `+${format(Math.abs(roundOffAmount), selectedCurrency)}` :
            `-${format(Math.abs(roundOffAmount), selectedCurrency)}`) : '0';
    const displayAmountToPay = formatRounded(amountToPay, selectedCurrency);

    return {
        // EUR amounts
        subtotalEUR: safeSubtotalEUR,
        totalSavingsEUR: safeTotalSavingsEUR,
        couponDiscountEUR: safeCouponDiscountEUR,
        deliveryChargesEUR: safeDeliveryChargesEUR,
        grandTotalEUR,

        // Converted amounts
        subtotalConverted,
        totalSavingsConverted,
        couponDiscountConverted,
        deliveryChargesConverted,
        grandTotalConverted,

        // Rounded amounts
        grandTotalRounded,
        roundOffAmount,
        amountToPay,

        // Display strings
        displaySubtotal,
        displaySavings,
        displayCoupon,
        displayDelivery,
        displayGrandTotal,
        displayRoundOff,
        displayAmountToPay,
    };
};