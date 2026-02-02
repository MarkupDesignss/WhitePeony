// hooks/useAutoTranslate.ts
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useTranslateTextQuery } from '../api/endpoints/translateApi'

export const useAutoTranslate = (text: string) => {
    const targetLanguage = useSelector((state: RootState) => state.language.code);
    const previousLanguage = useRef(targetLanguage);
    const previousText = useRef(text);

    const {
        data: translatedText,
        isLoading,
        isError,
        error,
        refetch,
    } = useTranslateTextQuery(
        { text, target: targetLanguage },
        {
            skip: !text || text.trim() === '',
        }
    );

    // Auto-translate when language changes
    useEffect(() => {
        if (text && text.trim() !== '' && targetLanguage !== previousLanguage.current) {
            refetch();
            previousLanguage.current = targetLanguage;
        }
    }, [targetLanguage, text, refetch]);

    // Auto-translate when text changes
    useEffect(() => {
        if (text && text.trim() !== '' && text !== previousText.current) {
            refetch();
            previousText.current = text;
        }
    }, [text, refetch]);

    return {
        translatedText,
        isLoading,
        isError,
        error,
        targetLanguage,
    };
};