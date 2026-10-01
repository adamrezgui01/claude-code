import { Children, type ReactNode } from 'react';
import { Link } from 'wouter';

import { Icone, type NomIcone } from './Icone';

/**
 * Les pièces que les écrans assemblent. Aucune commande n'est du texte seul :
 * un bouton porte toujours une icône, et son mot quand l'icône seule serait
 * ambiguë.
 */

export function Bouton({
  icone,
  titre,
  onClick,
  variante = 'secondaire',
  type = 'button',
  desactive,
}: {
  icone: NomIcone;
  titre: string;
  onClick?: () => void;
  /** Le principal porte le mauve : une action principale par écran. */
  variante?: 'principal' | 'secondaire' | 'danger';
  type?: 'button' | 'submit';
  desactive?: boolean;
}) {
  return (
    <button
      type={type}
      className={`bouton bouton-${variante}`}
      onClick={onClick}
      disabled={desactive}
      data-action-principale={variante === 'principal' ? '' : undefined}>
      <Icone nom={icone} />
      <span>{titre}</span>
    </button>
  );
}

/** Une icône seule, quand le sens est évident. Elle porte son étiquette. */
export function BoutonIcone({
  icone,
  etiquette,
  onClick,
}: {
  icone: NomIcone;
  etiquette: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="bouton-icone" onClick={onClick} aria-label={etiquette} title={etiquette}>
      <Icone nom={icone} taille="grande" />
    </button>
  );
}

/** Le retour vers l'écran d'où l'on vient : une flèche, sans mot. */
export function Retour({ vers }: { vers: string }) {
  return (
    <Link href={vers} className="bouton-icone retour" aria-label="Retour" title="Retour">
      <Icone nom="precedent" taille="grande" />
    </Link>
  );
}

/**
 * Des capsules qui se choisissent l'une l'autre : jour, semaine, mois ; kg ou
 * lb. La capsule choisie est l'élément actif, et porte le mauve.
 *
 * Ce sont des boutons radio : on y choisit une valeur, on n'y déclenche rien.
 * L'icône y est donc permise sans être exigée — les périodes des statistiques
 * s'écrivent en mots, comme dans l'application —, et là où le prompt la
 * demande (la vue de l'horaire, les mesures), le test de l'écran la vérifie.
 */
export function Choix<V extends string>({
  options,
  valeur,
  onChange,
  etiquette,
}: {
  options: { valeur: V; texte: string; icone?: NomIcone }[];
  valeur: V;
  onChange: (v: V) => void;
  etiquette: string;
}) {
  return (
    <div className="choix" role="radiogroup" aria-label={etiquette}>
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          className="capsule"
          aria-checked={o.valeur === valeur}
          onClick={() => onChange(o.valeur)}>
          {o.icone && <Icone nom={o.icone} />}
          <span>{o.texte}</span>
        </button>
      ))}
    </div>
  );
}

/** Une étiquette en Subhead gris, huit pixels au-dessus de son champ. */
export function Champ({ etiquette, aide, children }: { etiquette: string; aide?: string; children: ReactNode }) {
  return (
    <label className="champ">
      <span className="etiquette">{etiquette}</span>
      {children}
      {aide && <span className="aide">{aide}</span>}
    </label>
  );
}

/**
 * Des lignes sur un même fond blanc, séparées par un filet d'un pixel posé
 * par la section, qui sait quelle ligne est la dernière. Le titre ne paraît
 * que s'il couvre au moins deux lignes.
 */
export function Section({ titre, children }: { titre?: string; children: ReactNode }) {
  const lignes = Children.toArray(children).filter(Boolean);
  return (
    <section className="section">
      {titre && lignes.length >= 2 && <h2 className="en-tete">{titre}</h2>}
      <div className="section-corps">
        {lignes.map((ligne, i) => (
          <div key={i} className="section-ligne">
            {ligne}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Une étiquette et sa valeur sur une ligne. Une valeur qu'on vient chercher passe en gras. */
export function Rangee({ etiquette, valeur, fort }: { etiquette: string; valeur: string; fort?: boolean }) {
  return (
    <div className="rangee">
      <span>{etiquette}</span>
      <span className={fort ? 'rangee-valeur forte' : 'rangee-valeur'}>{valeur}</span>
    </div>
  );
}

/** Une section facultative : repliée au départ, derrière une ligne à chevron. */
export function Replie({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <details className="replie">
      <summary>
        <Icone nom="bas" />
        <span>{titre}</span>
      </summary>
      <div className="replie-corps">{children}</div>
    </details>
  );
}

/**
 * Le repère d'un état : creux, il reste un geste ; plein, il n'en reste
 * aucun. Il accompagne toujours un mot, pour qui ne distingue pas les formes.
 */
export function Repere({ forme }: { forme: 'creux' | 'plein' }) {
  return <span className={`repere repere-${forme}`} aria-hidden="true" />;
}
