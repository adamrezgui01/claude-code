import { normaliser } from '../lib/texte';
import { db } from './index';

/**
 * Signets cliniques. Une liste de départ est semée au premier lancement, puis
 * elle appartient à l'usager : il ajoute, modifie et supprime ce qu'il veut.
 */

export type Lien = {
  id: number;
  titre: string;
  url: string;
  categorie: string;
  /** Synonymes courants, séparés par des virgules. Jamais affichés. */
  motsCles: string;
  rang: number;
};

export type EntreeLien = Omit<Lien, 'id' | 'rang'>;

/**
 * Des pages de consultation précises, pas des portails d'accueil : au comptoir,
 * la page d'accueil d'un organisme ne sert à rien. Les mots-clés portent ce à
 * quoi l'usager pense — la maladie — plutôt que le titre officiel du document.
 */
const DEPART: EntreeLien[] = [
  {
    titre: 'Cystite — infection urinaire non compliquée',
    url: 'https://www.inesss.qc.ca/publications/repertoire-des-publications/publication/traitement-pharmacologique-de-la-cystite-non-compliquee.html',
    categorie: 'Protocoles de prescription',
    motsCles: 'cystite, infection urinaire, urine, brûlement, IVU, prescrire',
  },
  {
    titre: 'Pharyngite à streptocoque du groupe A',
    url: 'https://www.inesss.qc.ca/publications/repertoire-des-publications/publication/pharyngite-amygdalite-chez-lenfant-et-ladulte.html',
    categorie: 'Protocoles de prescription',
    motsCles: 'pharyngite, amygdalite, gorge, strep, streptocoque, angine',
  },
  {
    titre: 'Conjonctivite',
    url: 'https://www.inesss.qc.ca/publications/repertoire-des-publications/publication/conjonctivite-allergique-bacterienne-ou-virale.html',
    categorie: 'Protocoles de prescription',
    motsCles: 'conjonctivite, oeil rouge, yeux, allergique, bactérienne',
  },
  {
    titre: 'Ordonnances collectives et protocoles nationaux',
    url: 'https://www.inesss.qc.ca/publications/protocoles-medicaux-nationaux-et-ordonnances-associees.html',
    categorie: 'Protocoles de prescription',
    motsCles: 'protocole national, ordonnance collective, prescrire, INESSS',
  },
  {
    titre: 'Hypertension Canada — recommandations',
    url: 'https://guidelines.hypertension.ca/',
    categorie: 'Guides de pratique',
    motsCles: 'hypertension, HTA, pression, tension artérielle, antihypertenseur',
  },
  {
    titre: 'Diabète Canada — lignes directrices',
    url: 'https://guidelines.diabetes.ca/',
    categorie: 'Guides de pratique',
    motsCles: 'diabète, glycémie, insuline, metformine, HbA1c, sucre',
  },
  {
    titre: 'Protocole d’immunisation du Québec (PIQ)',
    url: 'https://www.msss.gouv.qc.ca/professionnels/vaccination/protocole-d-immunisation-du-quebec-piq/',
    categorie: 'Vaccination',
    motsCles: 'PIQ, vaccin, immunisation, calendrier vaccinal, injection',
  },
  {
    titre: 'Base de données des produits pharmaceutiques',
    url: 'https://health-products.canada.ca/dpd-bdpp/index-fra.jsp',
    categorie: 'Références produits',
    motsCles: 'DIN, monographie, produit, Santé Canada, fabricant, ingrédient',
  },
];

const CHAMPS = ['titre', 'url', 'categorie', 'motsCles'] as const;

export function listerLiens(): Lien[] {
  return db.getAllSync<Lien>('SELECT * FROM liens ORDER BY categorie, rang, titre COLLATE NOCASE');
}

export function creerLien(entree: EntreeLien): number {
  const rang =
    (db.getFirstSync<{ n: number }>('SELECT IFNULL(MAX(rang), 0) AS n FROM liens')?.n ?? 0) + 1;
  const r = db.runSync(
    `INSERT INTO liens (${CHAMPS.join(', ')}, rang) VALUES (?, ?, ?, ?, ?)`,
    [...CHAMPS.map((c) => entree[c]), rang]
  );
  return r.lastInsertRowId;
}

export function modifierLien(id: number, entree: EntreeLien) {
  db.runSync(
    `UPDATE liens SET ${CHAMPS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...CHAMPS.map((c) => entree[c]), id]
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

/** Cherche dans le titre, la catégorie et les mots-clés cachés. */
export function filtrerLiens(liens: Lien[], recherche: string): Lien[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return liens;
  return liens.filter((l) =>
    normaliser(`${l.titre} ${l.categorie} ${l.motsCles}`).includes(terme)
  );
}

/** Regroupe pour l'affichage, en gardant l'ordre des catégories rencontrées. */
export function parCategorie(liens: Lien[]): { categorie: string; liens: Lien[] }[] {
  const groupes = new Map<string, Lien[]>();
  for (const lien of liens) {
    const cle = lien.categorie || 'Autres';
    groupes.set(cle, [...(groupes.get(cle) ?? []), lien]);
  }
  return [...groupes.entries()].map(([categorie, liste]) => ({ categorie, liens: liste }));
}
