module.exports = {
  presets: [
    'module:@react-native/babel-preset', // or 'module:metro-react-native-babel-preset'
  ],
  plugins: [
    // other plugins you may need here, e.g., 'react-native-gesture-handler'
    'react-native-reanimated/plugin', // ✅ must be LAST
  ],
};
