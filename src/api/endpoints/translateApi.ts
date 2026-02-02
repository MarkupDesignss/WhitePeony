import { baseApi } from '../baseApi';

const GOOGLE_TRANSLATE_KEY = 'AIzaSyAJjdCyzsgBAISHWP4n0lCfNg0ToHeDPRA';

export type LanguageCode = 'en' | 'de' | 'cs';

interface TranslateResponse {
  data: {
    translations: {
      translatedText: string;
    }[];
  };
}

export const translateApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    translateText: builder.query<
      string,
      { text: string; target: LanguageCode }
    >({
      query: ({ text, target }) => ({
        url: `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_KEY}`,
        method: 'POST',
        body: {
          q: text,
          target,
          format: 'text',
        },
      }),
      transformResponse: (response: TranslateResponse) =>
        response.data.translations[0].translatedText,
    }),
  }),
});

export const { useTranslateTextQuery } = translateApi;
