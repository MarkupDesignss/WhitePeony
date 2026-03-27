// services/baseQuery.ts
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseQuery = fetchBaseQuery({
  baseUrl: 'https://www.markupdesigns.net/whitepeony/api/',

  prepareHeaders: headers => {
   
    headers.set('Accept', 'application/json');

    // Example: token
    // const token = 'your_token_here';
    // if (token) {
    //   headers.set('Authorization', `Bearer ${token}`);
    // }

    return headers;
  },
});
