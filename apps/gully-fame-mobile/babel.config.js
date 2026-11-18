module.exports = function (api) {
  api.cache(true);
  return {
    // Resolve the preset that ships with this app's Expo (57). A bare "babel-preset-expo"
    // picks up the hoisted Expo 54 copy from apps/videoeditor, which breaks RN 0.86 codegen.
    presets: [
      require.resolve("babel-preset-expo", {
        paths: [require.resolve("expo/package.json")],
      }),
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
            "@api": "./src/api",
            "@assets": "./src/assets",
            "@components": "./src/components",
            "@contexts": "./src/contexts",
            "@features": "./src/features",
            "@hooks": "./src/hooks",
            "@navigation": "./src/navigation",
            "@screens": "./src/screens",
            "@store": "./src/store",
            "@styles": "./src/styles",
            "@types": "./src/types",
            "@utils": "./src/utils",
            "@constants": "./constants",
            "@modules": "./src/modules",
          },
        },
      ],
      // Strip console.log/info/debug from production bundles. Errors and warnings stay
      // so crash diagnostics still work.
      ...(process.env.NODE_ENV === "production"
        ? [["transform-remove-console", { exclude: ["error", "warn"] }]]
        : []),
      'react-native-reanimated/plugin',
    ],
  };
};