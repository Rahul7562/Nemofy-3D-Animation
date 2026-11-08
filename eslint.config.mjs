import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "server.ts",
      "vite.config.ts",
      "src/**/*.test.ts",
    ],
  },
  {
    files: ["src/components/**/*.tsx", "src/timeline/**/*.tsx"],
    rules: {
      "@remotion/warn-native-media-tag": "off",
      "@remotion/non-pure-animation": "off",
    },
  },
];
