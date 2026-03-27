// services/baseApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../service/baseQuery';

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQuery,
  endpoints: () => ({}), // empty (we inject later)
});
