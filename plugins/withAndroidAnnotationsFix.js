const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidAnnotationsFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('com.intellij:annotations')) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /android\s*\{/,
      `android {
    configurations.all {
        exclude group: 'com.intellij', module: 'annotations'
    }`,
    );
    return config;
  });
};
