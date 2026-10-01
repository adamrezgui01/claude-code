import { StyleSheet } from 'react-native';

/**
 * Ce qu'un écran monté montre, compté.
 *
 * Le V2.6 est soustractif, et « l'écran a l'air plus léger » ne se vérifie
 * pas. Ici, on monte l'écran, on marche dans ce que React Native va dessiner,
 * et on compte par sorte : les textes, les icônes, les champs, les
 * interrupteurs — et tout ce qui trace une limite : les bordures, les ombres,
 * les fonds qui diffèrent de ce qu'il y a dessous, les filets.
 *
 * Ce n'est pas la mise en page : Jest ne calcule aucune position. C'est la
 * liste de ce qui a de l'encre.
 */

export type Noeud = {
  type: string;
  props: Record<string, unknown>;
  children: (Noeud | string)[] | null;
};

export type Inventaire = {
  textes: number;
  icones: number;
  champs: number;
  interrupteurs: number;
  bordures: number;
  ombres: number;
  fonds: number;
  filets: number;
  total: number;
};

type Style = Record<string, unknown>;

export function aplatir(noeud: Noeud): Style {
  return (StyleSheet.flatten(noeud.props.style as never) ?? {}) as Style;
}

const TRANSPARENT = new Set(['transparent', 'rgba(0,0,0,0)', '#0000', '#00000000']);

function couleurVisible(c: unknown): c is string {
  return typeof c === 'string' && !TRANSPARENT.has(c.replace(/\s/g, '').toLowerCase());
}

export function estIcone(noeud: Noeud): boolean {
  return noeud.type === 'Text' && aplatir(noeud).fontFamily === 'ionicons';
}

function aDuTexte(noeud: Noeud): boolean {
  return (noeud.children ?? []).some((c) => typeof c === 'string' && c.trim() !== '');
}

export function aUneBordure(style: Style): boolean {
  return ['borderWidth', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth'].some(
    (p) => typeof style[p] === 'number' && (style[p] as number) > 0
  );
}

export function aUneOmbre(style: Style): boolean {
  return (
    (typeof style.shadowOpacity === 'number' && style.shadowOpacity > 0) ||
    (typeof style.elevation === 'number' && style.elevation > 0)
  );
}

/** Un fond étroit — un point ou deux dans un sens — est un trait, pas une boîte. */
function estUnFilet(style: Style): boolean {
  const mince = (v: unknown) => typeof v === 'number' && v > 0 && v <= 2;
  return mince(style.height) || mince(style.width);
}

/**
 * Marche dans l'arbre en portant le fond de ce qu'il y a dessous. On ne
 * descend pas dans la barre au-dessus du clavier : elle n'existe à l'écran
 * que quand le clavier est ouvert.
 */
export function marcher(
  racine: Noeud | Noeud[] | null,
  visite: (noeud: Noeud, fondDessous: string, parents: Noeud[]) => void,
  fondEcran: string
) {
  const aller = (n: Noeud | string, fond: string, parents: Noeud[]) => {
    if (typeof n === 'string') return;
    if (n.type === 'RCTInputAccessoryView') return;
    visite(n, fond, parents);
    const style = aplatir(n);
    const fondIci = couleurVisible(style.backgroundColor) ? style.backgroundColor : fond;
    for (const enfant of n.children ?? []) aller(enfant, fondIci, [...parents, n]);
  };
  for (const n of Array.isArray(racine) ? racine : racine ? [racine] : []) aller(n, fondEcran, []);
}

export function inventaire(racine: Noeud | Noeud[] | null, fondEcran: string): Inventaire {
  const compte: Inventaire = {
    textes: 0,
    icones: 0,
    champs: 0,
    interrupteurs: 0,
    bordures: 0,
    ombres: 0,
    fonds: 0,
    filets: 0,
    total: 0,
  };
  marcher(
    racine,
    (n, fondDessous) => {
      const style = aplatir(n);
      if (estIcone(n)) compte.icones++;
      else if (n.type === 'Text' && aDuTexte(n)) compte.textes++;
      if (n.type === 'TextInput') compte.champs++;
      if (n.type === 'RCTSwitch') compte.interrupteurs++;
      if (aUneBordure(style) && couleurVisible(style.borderColor ?? '#000')) compte.bordures++;
      if (aUneOmbre(style)) compte.ombres++;
      const fond = style.backgroundColor;
      if (couleurVisible(fond) && fond.toLowerCase() !== fondDessous.toLowerCase()) {
        if (estUnFilet(style)) compte.filets++;
        else compte.fonds++;
      }
    },
    fondEcran
  );
  compte.total =
    compte.textes +
    compte.icones +
    compte.champs +
    compte.interrupteurs +
    compte.bordures +
    compte.ombres +
    compte.fonds +
    compte.filets;
  return compte;
}

// ===========================================================================
// Les règles du V2.6, lues sur l'arbre monté
// ===========================================================================

/** Un élément qu'on touche : Pressable et Touchable posent `onClick` sur leur vue. */
export function estInteractif(n: Noeud): boolean {
  return typeof n.props.onClick === 'function' && n.props.accessible !== false;
}

function marge(hitSlop: unknown, cote: 'top' | 'bottom' | 'left' | 'right'): number {
  if (typeof hitSlop === 'number') return hitSlop;
  if (hitSlop && typeof hitSlop === 'object') {
    const v = (hitSlop as Record<string, unknown>)[cote];
    return typeof v === 'number' ? v : 0;
  }
  return 0;
}

function mesure(style: Style, ...props: string[]): number | null {
  const valeurs = props.map((p) => style[p]).filter((v): v is number => typeof v === 'number');
  return valeurs.length ? Math.max(...valeurs) : null;
}

/** Ce qu'un nœud dit de lui, pour qu'un échec se lise : son texte, ou son étiquette. */
export function decrire(n: Noeud): string {
  const textes: string[] = [];
  const lire = (x: Noeud | string) => {
    if (typeof x === 'string') textes.push(x);
    else (x.children ?? []).forEach(lire);
  };
  lire(n);
  const etiquette = n.props.accessibilityLabel;
  return (typeof etiquette === 'string' ? etiquette : textes.join(' ').trim()).slice(0, 50) || n.type;
}

/**
 * Toute cible fait au moins 44 points dans les deux sens, marge de toucher
 * comprise. Jest ne calcule aucune mise en page : la cible doit donc le
 * **déclarer**, par `minHeight` et `minWidth`. C'est voulu — une cible qui
 * n'atteint 44 points que par le hasard de son contenu les perd le jour où le
 * texte raccourcit.
 */
export function ciblesTropPetites(racine: Noeud | Noeud[] | null, cible: number): string[] {
  const petites: string[] = [];
  marcher(
    racine,
    (n) => {
      // Un champ de saisie est une cible comme une autre : on le touche pour
      // écrire.
      if (!estInteractif(n) && n.type !== 'TextInput') return;
      const style = aplatir(n);
      const hs = n.props.hitSlop;
      const h = mesure(style, 'height', 'minHeight');
      const l = mesure(style, 'width', 'minWidth');
      const haut = h === null ? null : h + marge(hs, 'top') + marge(hs, 'bottom');
      const large = l === null ? null : l + marge(hs, 'left') + marge(hs, 'right');
      if (haut === null || haut < cible || large === null || large < cible) {
        petites.push(`${decrire(n)} (${haut ?? '?'} × ${large ?? '?'})`);
      }
    },
    '#FFFFFF'
  );
  return petites;
}

/**
 * Une bordure autour d'un élément dont le fond diffère déjà de ce qu'il y a
 * dessous : elle double une limite que le fond trace déjà.
 */
export function borduresEnDouble(racine: Noeud | Noeud[] | null, fondEcran: string): string[] {
  const doubles: string[] = [];
  marcher(
    racine,
    (n, fondDessous) => {
      const style = aplatir(n);
      if (!aUneBordure(style)) return;
      const bord = style.borderColor;
      const fond = style.backgroundColor;
      if (!couleurVisible(bord ?? '#000') || !couleurVisible(fond)) return;
      // Un contour de la couleur du fond ne se voit pas : il ne double rien.
      if (typeof bord === 'string' && bord.toLowerCase() === fond.toLowerCase()) return;
      if (fond.toLowerCase() !== fondDessous.toLowerCase()) doubles.push(decrire(n));
    },
    fondEcran
  );
  return doubles;
}

/**
 * Le mauve ne marque que l'élément actif et l'action principale.
 *
 * Est actif ce qui le dit à VoiceOver : `selected` ou `checked`, un
 * interrupteur allumé. Est l'action principale ce qui porte le repère
 * `action-principale` — un seul par écran. Tout autre élément teinté de
 * l'accent, ou d'une de ses variantes pâles, est une faute.
 */
export function mauveHorsRole(racine: Noeud | Noeud[] | null, accent: string): string[] {
  const fautes: string[] = [];
  const mauve = (c: unknown) => typeof c === 'string' && c.toLowerCase().startsWith(accent.toLowerCase());
  marcher(
    racine,
    (n, _fond, parents) => {
      const style = aplatir(n);
      const teintes = [
        style.color,
        style.backgroundColor,
        aUneBordure(style) ? style.borderColor : undefined,
        style.tintColor,
      ];
      if (n.type === 'RCTSwitch' && n.props.value !== true) teintes.push(undefined);
      else if (n.type === 'RCTSwitch') teintes.push(n.props.onTintColor);
      if (!teintes.some(mauve)) return;
      const porteurs = [...parents, n];
      const permis = porteurs.some((p) => {
        const etat = p.props.accessibilityState as Record<string, unknown> | undefined;
        return (
          etat?.selected === true ||
          etat?.checked === true ||
          p.props.testID === 'action-principale' ||
          // L'échantillon d'une légende reproduit l'élément actif pour dire ce
          // que veut sa couleur : il en porte le mauve à ce titre.
          p.props.testID === 'echantillon-actif' ||
          // Un quart à venir est mauve translucide dans l'Horaire (V2.5.4 C) :
          // son bloc de la semaine, son point du mois.
          p.props.testID === 'quart-a-venir' ||
          (typeof p.props.testID === 'string' && /^bloc-\d+$/.test(p.props.testID)) ||
          (p.type === 'RCTSwitch' && p.props.value === true)
        );
      });
      if (!permis) fautes.push(decrire(n));
    },
    '#FFFFFF'
  );
  return fautes;
}

export function actionsPrincipales(racine: Noeud | Noeud[] | null): number {
  let n = 0;
  marcher(racine, (x) => void (x.props.testID === 'action-principale' && n++), '#FFFFFF');
  return n;
}

function contientEnTete(n: Noeud | string): boolean {
  if (typeof n === 'string') return false;
  return n.props.accessibilityRole === 'header' || (n.children ?? []).some(contientEnTete);
}

/**
 * Ce qu'un en-tête peut chapeauter, compté comme le prompt le compte.
 *
 * Un champ, c'est une question posée à l'usager : un champ de saisie avec ce
 * qui le règle, un interrupteur, une case, une ligne qu'on touche.
 *
 * - La rangée de capsules qui suit un champ de saisie **en fait partie** :
 *   « Poids » et sa bascule kg/lb sont un seul champ. C'est ce qui fait dire
 *   au prompt que « Patient chapeaute un seul champ ».
 * - Une rangée de capsules sans champ de saisie devant elle est un champ à
 *   elle seule — kg ou lb, jamais deux.
 * - Deux champs de saisie posés sur la même ligne sont les deux moitiés d'un
 *   seul : « 250 mg / 5 mL » est une concentration.
 */
function champs(noeuds: (Noeud | string)[]): Set<unknown> {
  const vus = new Set<unknown>();
  let courant: { cle: unknown; saisie: boolean; ligne: Noeud | null } | null = null;
  // La rangée la plus extérieure : la boîte d'un champ avec unité est
  // elle-même une rangée, et deux moitiés ne partagent que celle du dehors.
  const ligneDe = (ancetres: Noeud[]) => ancetres.find((a) => aplatir(a).flexDirection === 'row') ?? null;
  const aller = (x: Noeud | string, ancetres: Noeud[]) => {
    if (typeof x === 'string' || x.type === 'RCTInputAccessoryView') return;
    const parent = ancetres[ancetres.length - 1] ?? null;
    const etat = x.props.accessibilityState as Record<string, unknown> | undefined;
    // React Native pose `selected: undefined` sur chaque Pressable : c'est la
    // valeur qui dit qu'on se choisit, pas la présence de la clé.
    const selection = typeof etat?.selected === 'boolean';
    if (x.type === 'TextInput') {
      const ligne = ligneDe(ancetres);
      if (!(courant?.saisie && ligne && courant.ligne === ligne)) {
        courant = { cle: x, saisie: true, ligne };
        vus.add(x);
      }
    } else if (x.type === 'RCTSwitch') {
      courant = { cle: x, saisie: false, ligne: null };
      vus.add(x);
    } else if (x.props.accessible === true && !estInteractif(x) && x.props.accessibilityLabel) {
      // Une ligne qu'on lit sans la toucher — « Date · 12 mars » : sur une
      // fiche en lecture seule, c'est un champ comme un autre.
      courant = { cle: x, saisie: false, ligne: null };
      vus.add(x);
      return;
    } else if (estInteractif(x)) {
      if (selection && courant?.saisie) {
        // La bascule d'un champ : elle lui appartient.
      } else if (selection && parent && courant?.cle === parent) {
        // Une autre capsule de la même rangée.
      } else {
        const cle = selection && parent ? parent : x;
        courant = { cle, saisie: false, ligne: null };
        vus.add(cle);
      }
    }
    (x.children ?? []).forEach((c) => aller(c, [...ancetres, x]));
  };
  noeuds.forEach((x) => aller(x, []));
  return vus;
}

/**
 * Un en-tête de section ne survit que s'il couvre au moins deux champs et
 * qu'un autre groupe existe à côté du sien. Sinon il ne sépare rien, et
 * l'espace blanc fait le travail.
 */
export function enTetesInutiles(racine: Noeud | Noeud[] | null): string[] {
  const inutiles: string[] = [];
  const tous = champs(Array.isArray(racine) ? racine : racine ? [racine] : []);
  marcher(
    racine,
    (n, _fond, parents) => {
      if (n.props.accessibilityRole !== 'header') return;
      // Un en-tête posé avec son icône dans une même rangée : c'est la rangée
      // qui chapeaute ce qui la suit. On remonte tant que les voisins ne sont
      // que des icônes.
      let unite: Noeud = n;
      let rang = parents.length - 1;
      while (
        rang > 0 &&
        (parents[rang].children ?? []).every(
          (f) => f === unite || (typeof f !== 'string' && estIcone(f))
        )
      ) {
        unite = parents[rang];
        rang -= 1;
      }
      const parent = parents[rang];
      if (!parent) return;
      const freres = parent.children ?? [];
      // Un titre posé entre deux commandes — le mois entre ses flèches — est
      // une barre de titre, pas un en-tête de section : il ne chapeaute rien,
      // il nomme ce qu'on regarde.
      // Seuls ses voisins immédiats comptent : un bouton plus bas dans le même
      // écran n'en fait pas une barre de titre.
      const place = freres.indexOf(unite);
      const voisins = [freres[place - 1], freres[place + 1]];
      if (voisins.some((f) => f && typeof f !== 'string' && estInteractif(f))) return;
      const suite: (Noeud | string)[] = [];
      for (const f of freres.slice(freres.indexOf(unite) + 1)) {
        if (contientEnTete(f)) break;
        suite.push(f);
      }
      const groupe = champs(suite);
      const ailleurs = [...tous].filter((c) => !groupe.has(c)).length;
      if (groupe.size < 2 || ailleurs === 0) {
        inutiles.push(`${decrire(n)} (${groupe.size} sous lui, ${ailleurs} ailleurs)`);
      }
    },
    '#FFFFFF'
  );
  return inutiles;
}

/** Les champs encadrés d'une ligne : leur hauteur et leur rayon. */
export function formesDesChamps(racine: Noeud | Noeud[] | null, fondEcran: string): string[] {
  const formes: string[] = [];
  marcher(
    racine,
    (n, fondDessous, parents) => {
      if (n.type !== 'TextInput' || n.props.multiline) return;
      // Le champ porte son fond lui-même, ou sa boîte le porte pour lui (le
      // champ avec son unité à droite).
      const porteurs = [n, parents[parents.length - 1]].filter(Boolean) as Noeud[];
      for (const p of porteurs) {
        const style = aplatir(p);
        const fond = style.backgroundColor;
        if (couleurVisible(fond) && typeof style.minHeight === 'number') {
          formes.push(`${style.minHeight} / ${style.borderRadius ?? 0}`);
          return;
        }
      }
      void fondDessous;
    },
    fondEcran
  );
  return formes;
}
