const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const workspace = path.resolve(__dirname, '../..');
const defaults = getDefaultConfig(__dirname);
module.exports = mergeConfig(defaults, {
  watchFolders: [workspace],
  resolver: {
    blockList: [defaults.resolver.blockList, /[/\\]\.local-build-tools[/\\].*/].flat(),
    nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(workspace, 'node_modules')],
    disableHierarchicalLookup: true,
    extraNodeModules: {
      react: path.dirname(require.resolve('react/package.json')),
    },
  },
});
