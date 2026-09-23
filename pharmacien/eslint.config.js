const reactHooks = require('eslint-plugin-react-hooks');
const tseslint = require('typescript-eslint');

/**
 * Une seule règle, et elle est là pour une raison précise.
 *
 * Un hook appelé hors du corps d'un composant ne casse pas au typage, ne casse
 * pas aux tests, et ne casse pas au démarrage : il casse au moment exact où
 * l'usager touche le bouton, en plein milieu d'un geste. C'est arrivé avec la
 * dictée, à cause d'une insertion automatique qui avait pris `parametres.set('`
 * pour un appel de traduction.
 *
 * Le lint tourne avec les tests : une régression casse la suite.
 */
module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'scripts/**', 'verif/**'],
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // Un avertissement, pas une erreur : cette règle se trompe parfois, et
      // les endroits où on l'a désactivée exprès portent leur raison écrite.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
