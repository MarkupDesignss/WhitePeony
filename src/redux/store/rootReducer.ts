import { combineReducers } from '@reduxjs/toolkit';
import currencyReducer from '../slices/currencySlice';
import { baseApi } from '../../api/baseApi';

const rootReducer = combineReducers({
    currency: currencyReducer,
    [baseApi.reducerPath]: baseApi.reducer,
});

export default rootReducer;
