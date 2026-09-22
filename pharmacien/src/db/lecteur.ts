import { db } from './index';

/**
 * Le journal des phrases incomprises.
 *
 * Le lecteur de commandes ne devine pas : ce qu'il ne reconnaît pas, il le
 * garde ici. La liste n'est pas une statistique, c'est un aveu utile — elle
 * dit dans quels mots l'application est sourde, et l'usager peut la copier
 * telle quelle pour demander qu'on les ajoute.
 *
 * Rien ne sort du téléphone tout seul. Cette table se lit, se copie à la main,
 * et s'efface d'un bouton.
 */

export type Dictee = { id: number; phrase: string; raison: string; le: string };

export function noterIncomprise(phrase: string, raison: string) {
  const propre = phrase.trim();
  if (!propre) return;
  db.runSync(
    'INSERT INTO dictees (phrase, raison, le) VALUES (?, ?, ?)',
    propre,
    raison,
    new Date().toISOString()
  );
}

export function listerIncomprises(): Dictee[] {
  return db.getAllSync<Dictee>('SELECT * FROM dictees ORDER BY id DESC');
}

export function compterIncomprises(): number {
  return db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM dictees')?.n ?? 0;
}

export function effacerIncomprises() {
  db.execSync('DELETE FROM dictees');
}
