import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface CurrencyResponse {
    data: {
        [key: string]: { code: string; value: number };
    };
    meta: { last_updated_at: string };
}

// Only include EUR, USD, CZK
const allowedCurrencies = ['EUR', 'USD', 'CZK'];

export const currencyApi = createApi({
    reducerPath: 'currencyApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://api.currencyapi.com/v3/',
    }),
    endpoints: (builder) => ({
        getRates: builder.query<{ [key: string]: number }, void>({
            query: () => `latest?apikey=cur_live_CPIorlc0TVwjhAEzqPEiSA2wh86miRJFw4jNnfOC`,
            transformResponse: (response: CurrencyResponse) => {
                // Only return allowed currencies
                const filtered: { [key: string]: number } = {};
                allowedCurrencies.forEach((key) => {
                    if (response.data[key]) {
                        filtered[key] = response.data[key].value;
                    }
                });
                return filtered;
            },
        }),
    }),
});

export const { useGetRatesQuery } = currencyApi;
