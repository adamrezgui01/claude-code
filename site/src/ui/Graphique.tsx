import { format, parseISO } from 'date-fns';
import { frCA } from 'date-fns/locale';
import { useLayoutEffect, useRef, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';

import { GRAPHIQUE } from '../lib/dimensionsGraphique';
import {
  etiquette,
  etiquettesLisibles,
  formatDuGraphique,
  largeurEstimee,
  libellesDesMois,
  maximum,
  reperesDeLAxe,
  valeurComplete,
  valeurDe,
  type Mesure,
  type Mesureur,
  type MoisChiffre,
} from '../lib/mensuel';

/**
 * Mesure un texte dans la police où il sera dessiné. L'estimation de
 * l'application est calibrée sur SF Pro ; un navigateur a d'autres polices
 * système, plus larges parfois, et peut mesurer : il mesure. Hors navigateur
 * — dans les tests —, l'estimation reprend la main.
 */
function mesureurPour(role: 'caption1' | 'caption2', graisse: 'reguliere' | 'demi'): Mesureur {
  if (typeof document === 'undefined') return largeurEstimee;
  const contexte = document.createElement('canvas').getContext('2d');
  if (!contexte) return largeurEstimee;
  const style = getComputedStyle(document.documentElement);
  const taille = style.getPropertyValue(`--${role}`).match(/(\d+(?:\.\d+)?px)/)?.[1];
  contexte.font = `${style.getPropertyValue(`--${graisse}`).trim()} ${taille} ${style.getPropertyValue('--police').trim()}`;
  return (texte) => contexte.measureText(texte).width;
}

/** « juillet 2026 » : sous le pointeur, le mois se lit en entier. */
const moisEnEntier = (mois: string) => format(parseISO(mois), 'MMMM yyyy', { locale: frCA });

/**
 * Douze mois en barres. Un axe à trois repères — zéro, milieu, maximum — et
 * la valeur exacte sous le pointeur. Les étiquettes des barres entrent en
 * entier ou ne s'affichent pas : jamais « 10 8… ».
 *
 * Les mois que la période choisie couvre sont à l'encre du texte, les autres
 * au gris pâle. La barre survolée prend le mauve : c'est l'élément actif.
 */
export function Graphique({
  serie,
  mesure,
  enValeur,
  largeur,
}: {
  serie: MoisChiffre[];
  mesure: Mesure;
  enValeur: Set<string>;
  /** Imposée par les tests ; sinon mesurée sur la page. */
  largeur?: number;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const [mesuree, setMesuree] = useState(0);

  useLayoutEffect(() => {
    if (largeur !== undefined || !boite.current) return;
    const observateur = new ResizeObserver(([entree]) => setMesuree(entree.contentRect.width));
    observateur.observe(boite.current);
    return () => observateur.disconnect();
  }, [largeur]);

  const l = largeur ?? mesuree;
  const max = maximum(serie, mesure);
  const format = formatDuGraphique(max);
  const reperes = reperesDeLAxe(max, mesure, format);
  const donnees = serie.map((e) => ({
    ...e,
    valeur: valeurDe(e, mesure),
    etiquette: etiquette(valeurDe(e, mesure), mesure, format),
  }));
  const colonne = (l - GRAPHIQUE.axe) / serie.length;
  const [mesurerBarre] = useState(() => mesureurPour('caption2', 'demi'));
  const [mesurerMois] = useState(() => mesureurPour('caption1', 'reguliere'));
  const lisibles = etiquettesLisibles(
    colonne,
    donnees.map((d) => d.etiquette),
    mesurerBarre
  );
  // L'axe se fonde sur le mois ISO, unique ; le libellé — « juil. » ou « J » —
  // ne sert qu'au dessin. Trois « J » comme catégories se confondraient, et la
  // bulle de juillet afficherait janvier.
  const sousLesBarres = new Map(serie.map((e, i) => [e.mois, libellesDesMois(serie, colonne, mesurerMois)[i]]));

  return (
    <div className="graphique" ref={boite} data-etiquettes={lisibles ? 'visibles' : 'masquees'}>
      {l > 0 && (
        <BarChart
          width={l}
          height={GRAPHIQUE.hauteur}
          data={donnees}
          margin={{ top: GRAPHIQUE.margeHaute, right: 0, bottom: 0, left: 0 }}
          accessibilityLayer>
          <YAxis
            width={GRAPHIQUE.axe}
            domain={[0, max]}
            ticks={reperes.map((r) => r.valeur)}
            tickFormatter={(v: number) => reperes.find((r) => r.valeur === v)?.texte ?? ''}
            axisLine={false}
            tickLine={false}
          />
          <XAxis
            dataKey="mois"
            interval={0}
            tickFormatter={(mois: string) => sousLesBarres.get(mois) ?? ''}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent-pale)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const entree = payload?.[0]?.payload as (MoisChiffre & { valeur: number }) | undefined;
              if (!active || !entree) return null;
              return (
                <div className="bulle">
                  <span className="bulle-mois">{moisEnEntier(entree.mois)}</span>
                  <span className="bulle-valeur">{valeurComplete(entree.valeur, mesure)}</span>
                </div>
              );
            }}
          />
          <Bar
            dataKey="valeur"
            radius={[GRAPHIQUE.rayonBarre, GRAPHIQUE.rayonBarre, 0, 0]}
            minPointSize={GRAPHIQUE.barreMinimum}
            activeBar={{ fill: 'var(--accent)' }}
            isAnimationActive={false}>
            {donnees.map((d) => (
              <Cell key={d.mois} fill={enValeur.has(d.mois) ? 'var(--texte-principal)' : 'var(--gris-pale)'} />
            ))}
            {lisibles && <LabelList dataKey="etiquette" position="top" className="etiquette-barre" />}
          </Bar>
        </BarChart>
      )}
    </div>
  );
}
