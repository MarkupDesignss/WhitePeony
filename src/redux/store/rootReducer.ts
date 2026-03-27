// store/rootReducer.ts

import { combineReducers } from '@reduxjs/toolkit';
import currencyReducer from '../slices/currencySlice';
import languageReducer from '../slices/languageSlice';
import { baseApi } from '../../api/baseApi';

const rootReducer = combineReducers({
  currency: currencyReducer,
  language: languageReducer,

  // ✅ RTK Query reducer
  [baseApi.reducerPath]: baseApi.reducer,
});

export default rootReducer;
