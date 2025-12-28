module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      return {
        ...webpackConfig,
        ignoreWarnings: [
          (warning) =>
            warning.message?.includes?.('Failed to parse source map') ||
            warning.message?.includes?.('ENOENT') ||
            warning.details?.includes?.('source-map-loader') ||
            /source-map-loader/.test(warning.details || ''),
        ],
      };
    },
  },
};