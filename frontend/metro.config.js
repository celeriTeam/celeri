const { getDefaultConfig } = require('@expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts = [
    ...defaultConfig.resolver.sourceExts,
    'cjs',
  ];
resolverMainFields: ['react-native', 'browser', 'main']
module.exports = defaultConfig;