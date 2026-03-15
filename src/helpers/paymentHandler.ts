import { StripeService } from '../service/stripeService'
import { UserService } from '../service/ApiService'

export const processStripePayment = async (
    clientSecret: string,
    orderPayload: any
) => {

    try {

        // STEP 1 initialise stripe
        await StripeService.initialisePayment(clientSecret);

        // STEP 2 open stripe sheet
        await StripeService.openPaymentSheet();

        // STEP 3 success → place order
        const payload = {
            ...orderPayload,
            payment_status: 'success',
            payment_method: 'stripe',
        };

        const res = await UserService.Placeorder(payload);

        return {
            status: 'success',
            data: res.data,
        };

    } catch (error: any) {

        // Payment cancelled
        if (error?.code === 'Canceled') {

            const payload = {
                ...orderPayload,
                payment_status: 'pending',
                payment_method: 'stripe',
            };

            await UserService.Placeorder(payload);

            return { status: 'pending' };
        }

        // Payment failed
        const payload = {
            ...orderPayload,
            payment_status: 'failed',
            payment_method: 'stripe',
        };

        await UserService.Placeorder(payload);

        return { status: 'failed' };
    }
};