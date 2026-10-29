import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'src/lib/api/schema.d.ts', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {
      // Un número dentro de `${}` siempre se imprime bien
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.astro'],
    // astro-eslint-parser aún no soporta projectService: los .astro usan el tsconfig directamente
    languageOptions: { parserOptions: { projectService: false, project: true } },
    // El parser no logra tipar el JSX del template y lo reporta como `error`
    rules: { '@typescript-eslint/no-unsafe-return': 'off' },
  },
  // Los .js/.mjs no tienen tipos que revisar
  { files: ['**/*.{js,mjs}'], extends: [tseslint.configs.disableTypeChecked] },
  // El formato lo decide Prettier: apaga toda regla de ESLint que choque con él
  prettier,
)
