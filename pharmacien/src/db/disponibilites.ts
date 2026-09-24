import { fusionner, type PlageDispo } from '../lib/disponibilites';
import { db } from './index';
import { insertion } from './sql';

/**
 * Le stockage des journées offertes. Les règles vivent dans
 * `lib/disponibilites` ; ce fichier ne fait qu'écrire et relire.
 *
 * Une écriture remplace toujours la journée entière : on recalcule les plages
 * fusionnées, on efface la date, on réécrit. C'est plus simple à tenir qu'une
 * mise à jour ligne par ligne, et une journée ne porte jamais plus de deux ou
 * trois plages.
 */

const CHAMPS = ['date', 'toute_la_journee', 'heure_debut', 'heure_fin'] as const;

export function listerDisponibilites(): PlageDispo[] {
  const lignes = db.getAllSync<{
    date: string;
    toute_la_journee: number;
    heure_debut: string;
    heure_fin: string;
  }>('SELECT date, toute_la_journee, heure_debut, heure_fin FROM disponibilites ORDER BY date, heure_debut');
  return lignes.map((l) => ({
    date: l.date,
    toute_la_journee: !!l.toute_la_journee,
    heure_debut: l.heure_debut,
    heure_fin: l.heure_fin,
  }));
}

/** Les plages déjà déclarées pour une journée. */
export function disponibilitesDuJour(date: string): PlageDispo[] {
  return listerDisponibilites().filter((p) => p.date === date);
}

/**
 * Réécrit une journée. Les plages passées sont fusionnées avec celles déjà
 * déclarées : déclarer 10 h – 14 h sur une journée qui portait déjà 8 h – 12 h
 * laisse une seule plage de 8 h à 14 h.
 */
export function declarerJournee(date: string, plages: PlageDispo[]): void {
  const retenues = fusionner([...disponibilitesDuJour(date), ...plages].filter((p) => p.date === date));
  db.runSync('DELETE FROM disponibilites WHERE date = ?', date);
  const le = new Date().toISOString();
  for (const p of retenues) {
    db.runSync(insertion('disponibilites', [...CHAMPS, 'horodatage_creation']), [
      p.date,
      p.toute_la_journee ? 1 : 0,
      p.heure_debut,
      p.heure_fin,
      le,
    ]);
  }
}

/** Retire tout ce qui était offert ce jour-là. */
export function effacerJournee(date: string): void {
  db.runSync('DELETE FROM disponibilites WHERE date = ?', date);
}

/**
 * La tape : une journée non offerte devient offerte en entier, une journée
 * offerte cesse de l'être. Une journée partiellement offerte bascule en
 * journée entière — c'est ce que la tape veut dire, et les heures restent
 * accessibles par l'appui long.
 */
export function basculerJournee(date: string, offerte: boolean): void {
  if (offerte) effacerJournee(date);
  else declarerJournee(date, [{ date, toute_la_journee: true, heure_debut: '', heure_fin: '' }]);
}
