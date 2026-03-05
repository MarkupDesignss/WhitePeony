import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Add 'hi' for Hindi language code
export type LanguageCode = 'en' | 'de' | 'cs' | 'hi';

interface LanguageState {
  code: LanguageCode;
}

// Czech as default
const initialState: LanguageState = {
  code: 'cs',
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<LanguageCode>) {
      state.code = action.payload;
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
