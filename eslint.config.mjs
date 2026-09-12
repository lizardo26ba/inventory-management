import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'prisma/migrations/**'],
  },

  ...compat.extends('next/core-web-vitals'),
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // El tipo any apaga el comprobador justo donde más falta hace.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Un catch vacío convierte un fallo en un misterio.
      'no-empty': ['error', { allowEmptyCatch: false }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Regla central de la política de secretos. Cualquier archivo de la
    // aplicación que lea el entorno directamente, o que escriba una URL o una
    // credencial a mano, falla aquí y no en revisión.
    // Ver docs/standards/configuration-and-secrets.md
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/config/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Lee la configuración desde src/lib/config, nunca process.env directamente.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/^(https?:\\/\\/(?!localhost)|postgres(ql)?:\\/\\/|redis:\\/\\/|sk-|AKIA|ghp_)/]',
          message: 'URL externa o credencial escrita en el código. Muévela a la configuración.',
        },
      ],
    },
  },

  {
    // El prototipo es un boceto y vive aparte. No importa nada de la aplicación
    // real: tiene sus propias copias en src/app/prototype/ui. Así se puede
    // rediseñar una pantalla sin tocar lo que ya está en uso.
    // Ver docs/standards/prototype-and-components.md
    files: ['src/app/prototype/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/*', '@/modules/*'],
              message:
                'El prototipo no usa los componentes reales. Copia la pieza en src/app/prototype/ui y trabájala ahí.',
            },
          ],
        },
      ],
    },
  },

  {
    // Lo contrario también: nada de la aplicación real puede depender del
    // prototipo, que se borra cuando deja de hacer falta.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/prototype/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/prototype/*', '**/prototype/*'],
              message:
                'El prototipo es un boceto desechable. Lleva la pieza a src/components/ui y úsala desde ahí.',
            },
          ],
        },
      ],
    },
  },

  {
    // La semilla y los guiones corren fuera de la aplicación: necesitan leer el
    // entorno y escribir en la consola.
    files: ['prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Debe ir al final: apaga las reglas de estilo que Prettier ya resuelve.
  prettier,
);
