import { baseApi } from './baseApi';
import { PagesResponse, Page } from '../types/pageTypes';
import { VersionResponse } from '../types/versionTypes';
/* ================= API ================= */

export const api = baseApi.injectEndpoints({
  endpoints: builder => ({
    /* ----------- VERSION ----------- */

    getAppVersion: builder.query<VersionResponse, void>({
      query: () => ({
        url: 'getVersion',
        method: 'GET',
      }),
    }),
    /* ----------- PAGES ----------- */

    getPages: builder.query<Page[], void>({
      query: () => ({
        url: 'static-pages',
        method: 'GET',
      }),
      transformResponse: (response: PagesResponse) => response.data,
    }),

    getPageBySlug: builder.query<Page, string>({
      query: slug => `static-pages/${slug}`,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetPagesQuery,
  useGetPageBySlugQuery,
  useGetAppVersionQuery,
} = api;
