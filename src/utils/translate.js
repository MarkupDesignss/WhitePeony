// src/utils/translate.js
const cache = new Map();

const buildCacheKey = (text, lang) => `${lang}:${text}`;

export const translateText = async (text, targetLang = "es") => {
  if (!text || typeof text !== "string") {
    return text;
  }

  const cacheKey = buildCacheKey(text, targetLang);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translate API failed with ${response.status}`);
    }

    const data = await response.json();
    const translated = data?.[0]?.[0]?.[0] ?? text;
    cache.set(cacheKey, translated);
    return translated; // translated text
  } catch (error) {
    console.log("Translation error:", error);
    return text; // fallback original text
  }
};
