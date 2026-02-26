import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SupportedCurrency = 'EUR' | 'USD' | 'CZK';

interface CurrencyState {
  selectedCurrency: SupportedCurrency;
}

// Set CZK as default currency
const initialState: CurrencyState = {
  selectedCurrency: 'CZK', // Changed from 'EUR' to 'CZK'
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
