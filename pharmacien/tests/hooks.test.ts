import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * La garde contre les hooks appelés hors d'un composant.
 *
 * Ce défaut ne se voit nulle part : il passe le typage, il passe les tests, il
 * passe le démarrage. Il casse au moment exact où l'usager touche le bouton.
 * C'est arrivé avec la dictée — un `parametres.set('date', …)` pris pour un
 * appel de traduction par une insertion automatique, et un `useTextes()` posé
 * dans une fonction ordinaire.
 *
 * Le lint attrape ça, mais un lint qu'on ne lance pas ne sert à rien : il est
 * branché sur `npm test`. Ce test-ci vérifie que la règle est bien active,
 * en lui soumettant la faute exacte.
 */

function linter(source: string): string {
  const dossier = mkdtempSync(join(tmpdir(), 'lint-'));
  const fichier = join(dossier, 'essai.tsx');
  try {
    writeFileSync(fichier, source, 'utf8');
    execFileSync(
      'npx',
      ['eslint', '--no-ignore', '--config', 'eslint.config.js', '--stdin', '--stdin-filename', 'app/essai.tsx'],
      { input: source, encoding: 'utf8', cwd: process.cwd() }
    );
    return '';
  } catch (erreur) {
    return `${(erreur as { stdout?: string }).stdout ?? ''}`;
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

describe('un hook hors d’un composant fait échouer le lint', () => {
  test('la faute exacte de la dictée est refusée', () => {
    const fautif = `
      import { useTextes } from '../src/i18n';
      function parametresDuQuart(fiche: { date: string }): string {
        const { t } = useTextes();
        return t('quart.date') + fiche.date;
      }
      export default parametresDuQuart;
    `;
    expect(linter(fautif)).toContain('rules-of-hooks');
  }, 30000);

  test('le même hook dans un composant passe', () => {
    const correct = `
      import { useTextes } from '../src/i18n';
      export default function Ecran() {
        const { t } = useTextes();
        return t('quart.date');
      }
    `;
    expect(linter(correct)).not.toContain('rules-of-hooks');
  }, 30000);

  test('le projet entier passe la règle', () => {
    // Zéro erreur. Les avertissements de dépendances manquantes sont tolérés :
    // cette règle-là se trompe parfois, et les endroits désactivés exprès
    // portent leur raison écrite à côté.
    let sortie = '';
    try {
      execFileSync('npx', ['eslint', 'app', 'src', '--format', 'json'], {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      sortie = '[]';
    } catch (erreur) {
      sortie = `${(erreur as { stdout?: string }).stdout ?? '[]'}`;
    }
    const erreurs = (JSON.parse(sortie || '[]') as { errorCount: number }[]).reduce(
      (total, f) => total + f.errorCount,
      0
    );
    expect(erreurs).toBe(0);
  }, 60000);
});
