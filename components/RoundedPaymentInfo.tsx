import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { convertAndFormatPrice } from '../src/utils/currencyUtils'
import { SupportedCurrency } from '../src/redux/slices/currencySlice'

interface RoundedPaymentInfoProps {
    amountEUR: number;
    selectedCurrency: SupportedCurrency;
    rates?: Record<string, number>;
    subtotalAmount?: number;
    totalSavings?: number;
    discountAmount?: number;
    deliveryCharges?: number;
    showDetailedBreakdown?: boolean;
}

const RoundedPaymentInfo: React.FC<RoundedPaymentInfoProps> = ({
    amountEUR,
    selectedCurrency,
    rates,
    subtotalAmount = 0,
    totalSavings = 0,
    discountAmount = 0,
    deliveryCharges = 0,
    showDetailedBreakdown = true,
}) => {
    // Calculate payment details
    const calculatePayment = () => {
        if (selectedCurrency === 'EUR' || !rates) {
            const rounded = Math.round(amountEUR);
            return {
                actual: amountEUR,
                rounded: rounded,
                difference: rounded - amountEUR,
                displayActual: convertAndFormatPrice(amountEUR, selectedCurrency, rates),
                displayRounded: convertAndFormatPrice(rounded, selectedCurrency, rates),
            };
        }

        const eurRate = rates['EUR'];
        const targetRate = rates[selectedCurrency];

        if (!eurRate || !targetRate) {
            const rounded = Math.round(amountEUR);
            return {
                actual: amountEUR,
                rounded: rounded,
                difference: rounded - amountEUR,
                displayActual: convertAndFormatPrice(amountEUR, selectedCurrency, rates),
                displayRounded: convertAndFormatPrice(rounded, selectedCurrency, rates),
            };
        }

        const converted = (amountEUR / eurRate) * targetRate;
        const rounded = Math.round(converted);

        return {
            actual: converted,
            rounded: rounded,
            difference: rounded - converted,
            displayActual: convertAndFormatPrice(converted, selectedCurrency, rates),
            displayRounded: convertAndFormatPrice(rounded, selectedCurrency, rates),
        };
    };

    const payment = calculatePayment();
    const showRoundOff = Math.abs(payment.difference) >= 0.01;

    // Format individual amounts
    const formatAmount = (amount: number) =>
        convertAndFormatPrice(amount, selectedCurrency, rates);

    return (
        <View style={styles.container}>
            <Text style={styles.billTitle}>Bill details</Text>

            {/* Detailed breakdown */}
            {showDetailedBreakdown && (
                <>
                    {/* Subtotal */}
                    {subtotalAmount > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.detailLabel}>Subtotal</Text>
                            <Text style={styles.detailValue}>
                                {formatAmount(subtotalAmount)}
                            </Text>
                        </View>
                    )}

                    {/* Total Savings */}
                    {totalSavings > 0 && (
                        <View style={styles.row}>
                            <Text style={[styles.detailLabel, styles.savingsLabel]}>
                                Total Savings
                            </Text>
                            <Text style={[styles.detailValue, styles.savingsValue]}>
                                -{formatAmount(totalSavings)}
                            </Text>
                        </View>
                    )}

                    {/* Coupon Discount */}
                    {discountAmount > 0 && (
                        <View style={styles.row}>
                            <Text style={[styles.detailLabel, styles.couponLabel]}>
                                Coupon Discount
                            </Text>
                            <Text style={[styles.detailValue, styles.couponValue]}>
                                -{formatAmount(discountAmount)}
                            </Text>
                        </View>
                    )}

                    {/* Delivery Charges */}
                    <View style={styles.row}>
                        <Text style={styles.detailLabel}>Delivery Charges</Text>
                        <Text style={[styles.detailValue, styles.deliveryValue]}>
                            {deliveryCharges > 0 ? formatAmount(deliveryCharges) : 'Free'}
                        </Text>
                    </View>

                    <View style={styles.separator} />
                </>
            )}

            {/* Actual Grand Total */}
            <View style={styles.row}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                    {payment.displayActual}
                </Text>
            </View>

            {/* Round Off Amount */}
            {showRoundOff && (
                <View style={styles.row}>
                    <Text style={styles.roundOffLabel}>
                        {payment.difference > 0 ? 'Round Up' : 'Round Down'}
                    </Text>
                    <Text style={styles.roundOffValue}>
                        {payment.difference > 0 ? '+' : ''}
                        {convertAndFormatPrice(Math.abs(payment.difference), selectedCurrency, rates)}
                    </Text>
                </View>
            )}

            {/* Final Separator */}
            <View style={styles.finalSeparator} />

            {/* Amount to Pay (Rounded) - MOST IMPORTANT */}
            <View style={styles.finalRow}>
                <Text style={styles.amountToPayLabel}>Amount to Pay</Text>
                <View style={styles.amountToPayContainer}>
                    <Text style={styles.amountToPayValue}>
                        {payment.displayRounded}
                    </Text>
                </View>
            </View>

            {/* Note */}
            {showRoundOff && (
                <Text style={styles.note}>
                    Amount rounded to nearest whole {selectedCurrency} for payment convenience
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginHorizontal: 10,
        marginVertical: 12,
    },
    billTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#878B2F',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#444',
    },
    detailValue: {
        fontSize: 14,
        color: '#444',
        fontWeight: '500',
    },
    savingsLabel: {
        color: '#5DA53B',
    },
    savingsValue: {
        color: '#5DA53B',
        fontWeight: '600',
    },
    couponLabel: {
        color: '#AEB254',
    },
    couponValue: {
        color: '#AEB254',
        fontWeight: '700',
    },
    deliveryValue: {
        color: '#878B2F',
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
    },
    grandTotalLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    grandTotalValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    roundOffLabel: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
    },
    roundOffValue: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
    },
    finalSeparator: {
        height: 1,
        backgroundColor: '#000',
        marginVertical: 12,
        opacity: 0.2,
    },
    finalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amountToPayLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: '#000',
    },
    amountToPayContainer: {
        backgroundColor: '#F7F9E5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#AEB254',
    },
    amountToPayValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000',
    },
    note: {
        fontSize: 11,
        color: '#666',
        marginTop: 12,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

export default RoundedPaymentInfo;