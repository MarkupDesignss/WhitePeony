import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    margin: 0,
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  loaderView: {
    width: '15%',
    height: '8%',
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // optional blur effect
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%'
  },
  lottie: {
    width: 120,
    height: 120,
  },
});

export default styles;
