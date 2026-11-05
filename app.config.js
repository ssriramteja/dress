// Lets hosts serve the app from a sub-path (e.g. GitHub Pages at /dress)
// without changing local dev, Expo Go, Replit or Netlify, which use the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
