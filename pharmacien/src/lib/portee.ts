/**
 * Jusqu'où cherche-t-on une adresse ?
 *
 * Deux portées, et la différence n'est pas un détail. Une pharmacie est
 * forcément au Québec : un remplaçant inscrit à l'Ordre des pharmaciens du
 * Québec y exerce, et un résultat ontarien dans cette liste-là est toujours du
 * bruit. Son domicile, lui, peut être n'importe où au Canada — on peut très
 * bien habiter Ottawa et remplacer en Outaouais. Restreindre cette
 * recherche-là empêcherait d'entrer son adresse, et le kilométrage ne se
 * calculerait plus du tout.
 */

export type Portee = 'pharmacie' | 'domicile';

/**
 * Rectangle qui enferme le Québec, du lac Champlain au cap Wolstenholme et de
 * l'Abitibi à Blanc-Sablon. Il déborde forcément sur les provinces voisines :
 * c'est un filtre grossier, qui sert à orienter le service. Le tri fin se fait
 * ensuite sur le code de province, dans l'application.
 */
export const RECT_QUEBEC = {
  min_lat: 44.9,
  max_lat: 62.7,
  min_lon: -79.9,
  max_lon: -56.9,
};

/** Point de repère quand l'usager n'a pas encore d'adresse : Montréal. */
export const FOYER_DEFAUT = { lat: 45.5019, lon: -73.5674 };

export type Point = { lat: number; lon: number };

/**
 * Ce qu'on envoie au service, selon la portée.
 *
 * Le point de focus n'est pas qu'un confort : Pelias répond nettement plus
 * vite quand il sait autour de quoi chercher, et les pharmacies proches
 * remontent d'elles-mêmes en tête.
 */
export function parametresDePortee(portee: Portee, foyer: Point): Record<string, string> {
  const base: Record<string, string> = {
    'boundary.country': 'CA',
    'focus.point.lat': `${foyer.lat}`,
    'focus.point.lon': `${foyer.lon}`,
  };
  if (portee === 'domicile') return base;
  return {
    ...base,
    'boundary.rect.min_lat': `${RECT_QUEBEC.min_lat}`,
    'boundary.rect.max_lat': `${RECT_QUEBEC.max_lat}`,
    'boundary.rect.min_lon': `${RECT_QUEBEC.min_lon}`,
    'boundary.rect.max_lon': `${RECT_QUEBEC.max_lon}`,
  };
}

/** Codes et noms qui désignent le Québec dans une réponse de géocodage. */
const QUEBEC = new Set(['qc', 'quebec', 'québec']);

function normaliser(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim().toLowerCase() : '';
}

/**
 * Le rectangle déborde sur l'Ontario et le Nouveau-Brunswick. On tranche donc
 * sur le code de province, `region_a`, en retombant sur le nom quand le code
 * manque.
 */
export function estAuQuebec(proprietes: { region_a?: unknown; region?: unknown }): boolean {
  const code = normaliser(proprietes.region_a);
  if (code) return QUEBEC.has(code);
  return QUEBEC.has(normaliser(proprietes.region));
}

/**
 * Applique la portée à une liste de résultats. Pour une pharmacie, tout ce qui
 * n'est pas au Québec disparaît ; pour un domicile, rien n'est écarté.
 */
export function filtrerParPortee<T extends { region_a?: unknown; region?: unknown }>(
  resultats: T[],
  portee: Portee
): T[] {
  return portee === 'domicile' ? resultats : resultats.filter(estAuQuebec);
}
