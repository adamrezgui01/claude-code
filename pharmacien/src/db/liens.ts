import { filtrerLiens, parCategorie, titreDuLien, type EntreeLien, type Lien } from '../lib/liens';
import { SOURCES_DEPART } from '../lib/veille/depart';
import { db } from './index';
import { insertion } from './sql';

// Les règles vivent dans `lib/liens` ; ce fichier ne fait que le stockage.
export { filtrerLiens, parCategorie, titreDuLien };
export type { EntreeLien, Lien };

/**
 * Signets cliniques. Une liste de départ est semée au premier lancement, puis
 * elle appartient à l'usager : il ajoute, modifie et supprime ce qu'il veut.
 */




/**
 * Des pages de consultation précises, pas des portails d'accueil : au comptoir,
 * la page d'accueil d'un organisme ne sert à rien. Les mots-clés portent ce à
 * quoi l'usager pense — la maladie — plutôt que le titre officiel du document.
 */
const DEPART: EntreeLien[] = SOURCES_DEPART.map((source) => ({
  cle: source.cle,
  titre: source.titre,
  url_document: source.url_document,
  url_reference: source.url_reference,
  categorie: '',
  motsCles: source.motsCles,
  sous_section: source.sousSection,
}));

const CHAMPS = [
  'cle',
  'titre',
  'url_document',
  'url_reference',
  'categorie',
  'motsCles',
  'sous_section',
] as const;

/**
 * `url` est l'ancien nom de `url_document`.
 *
 * La colonne existe encore dans toutes les bases déjà installées, en NOT NULL
 * et sans valeur par défaut — et on ne réécrit pas la table d'un usager pour
 * si peu. On l'écrit donc avec la même valeur que `url_document`, et plus rien
 * ne la lit. C'est le prix de ne jamais toucher aux données de quelqu'un.
 */
function avecAncienneColonne(entree: EntreeLien): string[] {
  return [...CHAMPS.map((c) => entree[c]), entree.url_document];
}

export function listerLiens(): Lien[] {
  return db.getAllSync<Lien>('SELECT * FROM liens ORDER BY categorie, rang, titre COLLATE NOCASE');
}

export function creerLien(entree: EntreeLien): number {
  const rang =
    (db.getFirstSync<{ n: number }>('SELECT IFNULL(MAX(rang), 0) AS n FROM liens')?.n ?? 0) + 1;
  const r = db.runSync(insertion('liens', [...CHAMPS, 'url', 'rang']), [
    ...avecAncienneColonne(entree),
    rang,
  ]);
  return r.lastInsertRowId;
}

export function modifierLien(id: number, entree: EntreeLien) {
  const colonnes = [...CHAMPS, 'url'];
  db.runSync(
    `UPDATE liens SET ${colonnes.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...avecAncienneColonne(entree), id]
  );
}

export function supprimerLien(id: number) {
  db.runSync('DELETE FROM liens WHERE id = ?', id);
}

export function obtenirLien(id: number): Lien | null {
  return db.getFirstSync<Lien>('SELECT * FROM liens WHERE id = ?', id);
}


export function categories(): string[] {
  return db
    .getAllSync<{ categorie: string }>(
      'SELECT DISTINCT categorie FROM liens WHERE categorie <> "" ORDER BY categorie'
    )
    .map((c) => c.categorie);
}

/**
 * Sème la liste de départ une seule fois. Le repère vit dans les réglages :
 * sans lui, un usager qui supprime tout verrait la liste revenir au prochain
 * lancement.
 */
export function amorcerLiens() {
  const deja = db.getFirstSync<{ liens_amorces: number }>(
    'SELECT liens_amorces FROM reglages WHERE id = 1'
  );
  if (deja?.liens_amorces) return;
  DEPART.forEach(creerLien);
  db.runSync('UPDATE reglages SET liens_amorces = 1 WHERE id = 1');
}


