// src/components/T.js
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { useTranslate } from "../hooks/useTranslate";

const T = ({ children, style, numberOfLines }) => {
  const { t, lang } = useTranslate();
  const [translated, setTranslated] = useState(children);

  useEffect(() => {
    let isMounted = true;
    const shouldTranslate = typeof children === "string" && children.trim().length > 0;

    const run = async () => {
      if (!shouldTranslate) {
        setTranslated(children);
        return;
      }

      try {
        const result = await t(children);
        if (isMounted) {
          setTranslated(result);
        }
      } catch (error) {
        if (isMounted) {
          setTranslated(children);
        }
      }
    };
    run();

    return () => {
      isMounted = false;
    };
  }, [children, lang, t]);

  return <Text  numberOfLines={numberOfLines} style={style}>{translated}</Text>;
};

export default T;
