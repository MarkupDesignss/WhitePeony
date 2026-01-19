import React from 'react';
import { Text as RNText, TextProps, StyleProp, TextStyle } from 'react-native';
import Fonts from '../constant/fonts';

const flattenStyle = (style: StyleProp<TextStyle> | undefined): TextStyle => {
  if (!style) return {} as TextStyle;
  if (Array.isArray(style)) return Object.assign({}, ...style.filter(Boolean) as any);
  if (typeof style === 'object') return style as TextStyle;
  return {} as TextStyle;
};

const pickFontFamily = (style?: StyleProp<TextStyle>) => {
  const s = flattenStyle(style);
  if (s.fontFamily) return undefined; // respect explicit fontFamily

  const weight = (s.fontWeight || '').toString().toLowerCase();
  const fontStyle = (s.fontStyle || '').toString().toLowerCase();
  const size = typeof s.fontSize === 'number' ? s.fontSize : Number(s.fontSize) || 0;

  const isItalic = fontStyle === 'italic';
  const isBold = ['700', '800', '900', 'bold', 'semibold', '600', '500'].includes(weight);
  const isLight = ['100', '200', '300', 'light'].includes(weight);

  if (isBold && isItalic) return Fonts.Redhat_Bold_Italic || Fonts.Redhat_Bold || Fonts.redhat_Regular;
  if (isBold) return Fonts.Redhat_Bold || Fonts.redhat_Regular;
  if (isLight && isItalic) return Fonts.Redhat_Light_Italic || Fonts.redhat_Regular;
  if (isLight) return Fonts.Redhat_Light || Fonts.redhat_Regular;
  if (isItalic) return Fonts.Redhat_Italic || Fonts.redhat_Regular;

  // heuristic by size: larger headings -> medium, small -> regular
  if (size >= 20) return Fonts.Redhat_Medium || Fonts.redhat_Regular;
  if (size >= 16) return Fonts.Redhat_Medium || Fonts.redhat_Regular;
  if (size <= 12) return Fonts.redhat_Regular;

  return Fonts.redhat_Regular;
};

// Patch RN Text render to inject fontFamily when not provided
try {
  // @ts-ignore
  const orig = (RNText as any).render;
  if (orig && typeof orig === 'function') {
    // @ts-ignore
    (RNText as any).render = function (...args: any[]) {
      const origin = orig.apply(this, args);
      try {
        const props: TextProps = origin?.props || {};
        const family = pickFontFamily(props.style);
        if (!family) return origin;
        const newStyle = [{ fontFamily: family }, props.style];
        // @ts-ignore
        return React.cloneElement(origin, { style: newStyle });
      } catch (e) {
        return origin;
      }
    };
  }
} catch (e) {
  // fail silently
}

export default {};
