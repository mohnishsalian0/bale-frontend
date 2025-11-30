import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Standard ESLint recommended rules for JavaScript
  js.configs.recommended,

  // Configuration for React
  {
    files: ["**/*.{js,jsx}"], // Only apply to JS and JSX files
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "react/react-in-jsx-scope": "off", // Not needed for React 17+ with new JSX transform
      "react/jsx-uses-react": "off", // Not needed for React 17+ with new JSX transform
      "react/prop-types": "off", // Not needed in TypeScript projects
    },
  },

  // Configuration for TypeScript
  {
    files: ["**/*.{ts,tsx}"], // Only apply to TS and TSX files
    plugins: {
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: true, // Explicitly declare React as a global
      },
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
        jsxRuntime: "automatic",
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs["eslint-recommended"].rules, // Disable base ESLint rules that conflict
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "react/react-in-jsx-scope": "off", // Not needed for React 17+ with new JSX transform
      "react/jsx-uses-react": "off", // Not needed for React 17+ with new JSX transform
      "react/prop-types": "off", // Not needed in TypeScript projects
      // Custom TypeScript ESLint rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      // Add any custom TypeScript rules here
    },
  },

  // Next.js specific configurations
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Add any custom Next.js rules here
    },
  },

  // Disable ESLint rules that conflict with Prettier.
  // This should always be the last configuration in the array.
  eslintConfigPrettier,

  // Ignore patterns (similar to .eslintignore)
  {
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      "dist/",
      "build/",
      "coverage/",
      "next-env.d.ts",
    ],
  },
];
