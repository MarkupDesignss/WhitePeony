import { RootState } from '../types';

export const selectCurrency = (state: RootState) =>
    state.currency.selectedCurrency;
