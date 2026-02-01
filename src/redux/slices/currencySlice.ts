import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SupportedCurrency = 'EUR' | 'USD' | 'CZK';

interface CurrencyState {
    selectedCurrency: SupportedCurrency;
}

const initialState: CurrencyState = {
    selectedCurrency: 'EUR', // because API price comes in EUR
};

const currencySlice = createSlice({
    name: 'currency',
    initialState,
    reducers: {
        setCurrency: (state, action: PayloadAction<SupportedCurrency>) => {
            state.selectedCurrency = action.payload;
        },
    },
});

export const { setCurrency } = currencySlice.actions;
export default currencySlice.reducer;
