import {
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';

export const StripeService = {
  initialisePayment: async (clientSecret: string) => {
    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'White Peony',
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  openPaymentSheet: async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      throw error;
    }

    return true;
  },
};
