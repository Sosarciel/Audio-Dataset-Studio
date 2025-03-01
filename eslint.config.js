const {parser:tsparser,plugin:tsplugin} = require('typescript-eslint');
const globals = require("globals");

module.exports = [
    {
        ignores: ["webpack.*",".webpack/**","*.js", "dist/**", "backup/**", "scripts/**"],
        plugins: {
            "@typescript-eslint": tsplugin
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser:tsparser,
            parserOptions: {
                project: "tsconfig.json",
                tsconfigRootDir: __dirname
            },
            globals: {
                ...globals.node,
                ...globals.browser
            },
        },
    },
    {
        files: ['src/**/*.ts','src/**/*.tsx'],
        ignores: ['src/test/**'],
        rules: {
            semi: ['error', 'always'],
            '@typescript-eslint/promise-function-async': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
        },
    }
];
