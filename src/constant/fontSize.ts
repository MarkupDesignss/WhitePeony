import { StyleSheet } from 'react-native';
import Fonts from './fonts';
import Colors from './colors';

const Typography = StyleSheet.create({
  pageTitleHeading: {
    fontFamily: Fonts.Ubuntu_Medium,
    fontSize: 18,
  },
  bodyText: {
    fontFamily: Fonts.Ubuntu_Regular,
    fontSize: 14,
  },
  extraSmallText: {
    fontFamily: Fonts.Ubuntu_Light,
    fontSize: 14,
  },
  tittleHeading: {
    fontFamily: Fonts.Ubuntu_Regular,
    fontSize: 14,
  },
  buttonText: {
    fontFamily: Fonts.Ubuntu_Regular,
    fontSize: 16,
  },
  InputbodyText: {
    fontFamily: Fonts.Ubuntu_Regular,
    fontSize: 14
  },
  LinkText: {
    fontFamily: Fonts.Ubuntu_Bold,
    fontSize: 14
  },
  BottomText: {
    fontFamily: Fonts.Ubuntu_Regular,
    fontSize: 15,
  }
});

export default Typography;
