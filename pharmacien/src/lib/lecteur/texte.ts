/**
 * Mettre une phrase dictée en état d'être lue.
 *
 * La dictée d'iOS produit des accents inconstants, des apostrophes courbes,
 * des traits d'union là où on ne les attend pas, une virgule tous les trois
 * mots et un point final. Rien de tout ça ne porte de sens ici. On ramène donc
 * la phrase à une forme unique avant d'y chercher quoi que ce soit, et toutes
 * les règles s'écrivent ensuite sur cette forme-là.
 */

/**
 * Mots vides de la dictée. Ils ne sont pas seulement inutiles : « genre » ou
 * « là » entre une date et une heure cassent les expressions qui les
 * reconnaissent ensemble.
 */
const PARASITES = [
  'euh', 'heu', 'ben', 'bin', 'bon', 'genre', 'tse', 'tse', 'ok', 'okay',
  'donc', 'alors', 'merci', 'stp', 'svp', 'please',
  'fait que', 'faque', 's il te plait', 's il vous plait',
];

/**
 * Formules de politesse. « Peux-tu ajouter un shift jeudi ? » est une demande,
 * pas une question : on retire la politesse avant de décider laquelle des deux
 * on a devant soi.
 */
const POLITESSES = [
  'est ce que tu peux', 'est ce que tu pourrais',
  'peux tu', 'tu peux', 'pourrais tu', 'tu pourrais', 'can you',
];

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Forme normalisée : minuscules, sans accents, sans apostrophes, sans
 * ponctuation superflue.
 *
 * Le trait d'union disparaît sauf entre deux chiffres : « apres-demain » et
 * « dix-sept » doivent se lire en mots séparés, mais « 9-5 » est un intervalle
 * d'heures et « 12-10 » une date.
 */
export function normaliserPhrase(phrase: string): string {
  let t = phrase.toLowerCase();
  t = t.replace(/[’‘´`]/g, "'");
  // « là » de remplissage, retiré tant qu'il porte encore son accent : une fois
  // les accents tombés, il ne se distingue plus de l'article « la ».
  t = t.replace(/(^|[^a-zà-ÿ0-9])là(?![a-zà-ÿ])/g, '$1 ');
  t = t.replace(/(\d)\s*a\.?\s?m\.?(?![a-z])/g, '$1 am ');
  t = t.replace(/(\d)\s*p\.?\s?m\.?(?![a-z])/g, '$1 pm ');
  t = t.replace(/\ba\.?\s?m\.?\b/g, ' am ').replace(/\bp\.?\s?m\.?\b/g, ' pm ');
  t = sansAccents(t);
  t = t.replace(/'/g, ' ');
  // Le trait d'union ne survit qu'entre deux chiffres.
  t = t.replace(/(?<!\d)-|-(?!\d)/g, ' ');
  // La virgule des listes reste un jeton à part : la dictée l'écrit collée aux
  // chiffres — « le 12,13,14 » — et la liste serait illisible autrement.
  t = t.replace(/,/g, ' , ');
  // On garde les chiffres, les lettres, l'espace, et les trois séparateurs qui
  // portent du sens : la virgule des listes, le deux-points et la barre
  // oblique des dates et des heures.
  t = t.replace(/[^a-z0-9\s,:/-]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/** Retire les mots parasites et les formules de politesse. */
export function nettoyer(phrase: string): string {
  let t = ` ${phrase} `;
  for (const formule of POLITESSES) t = t.split(` ${formule} `).join(' ');
  for (const mot of PARASITES) t = t.split(` ${mot} `).join(' ');
  return t.replace(/\s+/g, ' ').trim();
}

/** Normalise puis nettoie. C'est la forme sur laquelle tout le reste travaille. */
export function preparer(phrase: string): string {
  return nettoyer(normaliserPhrase(phrase));
}

/**
 * Marqueurs de correction. La dictée enregistre les hésitations : « le 12,
 * non, le 13 ». Ce qui suit remplace ce qui précède, pour le même type de
 * valeur.
 */
const CORRECTIONS = ['non', 'en fait', 'pardon', 'je veux dire', 'plutot', 'oups'];

/**
 * Coupe la phrase au dernier marqueur de correction.
 *
 * `apres` porte ce qui remplace, `avant` ce qui est remplacé. Chaque
 * extracteur cherche d'abord dans `apres` et retombe sur `avant` quand il n'y
 * trouve rien : « au Jean Coutu, pardon, au Brunet » corrige la pharmacie et
 * laisse la date tranquille.
 *
 * Un marqueur en tête de phrase, sans rien avant lui à corriger, est ignoré.
 */
export function couperAuxCorrections(phrase: string): { avant: string; apres: string } {
  let coupe = -1;
  let longueur = 0;
  for (const marqueur of CORRECTIONS) {
    const motif = new RegExp(`(^|[\\s,])${marqueur}([\\s,]|$)`, 'g');
    let trouve: RegExpExecArray | null;
    while ((trouve = motif.exec(phrase))) {
      const position = trouve.index + trouve[1].length;
      // « non payée » n'est pas une hésitation, c'est le statut d'une pause.
      if (marqueur === 'non' && /^\s*pay/.test(phrase.slice(position + 3))) continue;
      if (position > coupe && position > 0) {
        coupe = position;
        longueur = marqueur.length;
      }
    }
  }
  if (coupe <= 0) return { avant: phrase, apres: '' };
  return {
    avant: phrase.slice(0, coupe).replace(/[\s,]+$/, ''),
    apres: phrase.slice(coupe + longueur).replace(/^[\s,]+/, ''),
  };
}
