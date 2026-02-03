import React from 'react';
import { Text, StyleProp, TextStyle, TextProps } from 'react-native';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

type TransletTextProps = TextProps & {
  text: string;
  style?: StyleProp<TextStyle>;
};

export default function TransletText({ text, style, ...rest }: TransletTextProps) {
  const { translatedText } = useAutoTranslate(text);

  return (
    <Text style={style} {...rest}>
      {translatedText || text}
    </Text>
  );
}
