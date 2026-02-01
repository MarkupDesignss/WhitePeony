import { baseApi } from '../baseApi';
import { CurrencyResponse } from '../types';

const allowedCurrencies = ['EUR', 'USD', 'CZK'] as const;

export const currencyApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getRates: builder.query<Record<string, number>, void>({
            query: () =>
                'https://api.currencyapi.com/v3/latest?apikey=cur_live_CPIorlc0TVwjhAEzqPEiSA2wh86miRJFw4jNnfOC',

            transformResponse: (response: CurrencyResponse) => {
                const filtered: Record<string, number> = {};

                allowedCurrencies.forEach((currency) => {
                    if (response?.data?.[currency]) {
                        filtered[currency] = response.data[currency].value;
                    }
                });

                return filtered;
            },

            // optional but recommended
            keepUnusedDataFor: 3600, // cache for 1 hour
        }),
    }),
    overrideExisting: false,
});

export const { useGetRatesQuery } = currencyApi;
