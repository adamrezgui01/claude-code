import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import Supercluster from 'supercluster';

import { couleurs, espace, police, rayon } from './theme';
import { useTextes } from '../i18n';

export type PointCarte = {
  cle: string;
  latitude: number;
  longitude: number;
  couleur: string;
  titre: string;
  detail: string;
  pharmacieId: number;
  quartId?: number;
};

/** Montréal : point de départ quand aucune pharmacie n'est localisée. */
const REGION_DEFAUT: Region = {
  latitude: 45.5019,
  longitude: -73.5674,
  latitudeDelta: 0.6,
  longitudeDelta: 0.6,
};

export const HISTORIQUES = [
  { mois: 1, cle: 'unMois' },
  { mois: 3, cle: 'troisMois' },
  { mois: 6, cle: 'sixMois' },
  { mois: 12, cle: 'douzeMois' },
] as const;

type Grappe = {
  cle: string;
  latitude: number;
  longitude: number;
  nombre: number;
  point?: PointCarte;
};

function regionInitiale(points: PointCarte[]): Region {
  if (points.length === 0) return REGION_DEFAUT;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const latitude = (Math.min(...lats) + Math.max(...lats)) / 2;
  const longitude = (Math.min(...lons) + Math.max(...lons)) / 2;
  return {
    latitude,
    longitude,
    latitudeDelta: Math.max(0.08, (Math.max(...lats) - Math.min(...lats)) * 1.6),
    longitudeDelta: Math.max(0.08, (Math.max(...lons) - Math.min(...lons)) * 1.6),
  };
}

export function VueCarte({
  points,
  historiqueMois,
  onChangerHistorique,
  onChoisir,
}: {
  points: PointCarte[];
  historiqueMois: number;
  onChangerHistorique: (mois: number) => void;
  onChoisir: (point: PointCarte) => void;
}) {
  const { t } = useTextes();
  const depart = useRef(regionInitiale(points)).current;
  const [region, setRegion] = useState<Region>(depart);

  const index = useMemo(() => {
    const grappeur = new Supercluster<{ point: PointCarte }>({ radius: 60, maxZoom: 16 });
    grappeur.load(
      points.map((point) => ({
        type: 'Feature' as const,
        properties: { point },
        geometry: { type: 'Point' as const, coordinates: [point.longitude, point.latitude] },
      }))
    );
    return grappeur;
  }, [points]);

  const grappes: Grappe[] = useMemo(() => {
    const zoom = Math.round(Math.log2(360 / Math.max(region.longitudeDelta, 0.0001)));
    const cadre: [number, number, number, number] = [
      region.longitude - region.longitudeDelta,
      region.latitude - region.latitudeDelta,
      region.longitude + region.longitudeDelta,
      region.latitude + region.latitudeDelta,
    ];
    return index.getClusters(cadre, Math.min(Math.max(zoom, 1), 20)).map((entree, i) => {
      const [longitude, latitude] = entree.geometry.coordinates;
      const proprietes = entree.properties as { cluster?: boolean; point_count?: number; point?: PointCarte };
      return {
        cle: proprietes.point?.cle ?? `grappe-${i}`,
        latitude,
        longitude,
        nombre: proprietes.cluster ? (proprietes.point_count ?? 0) : 1,
        point: proprietes.point,
      };
    });
  }, [index, region]);

  return (
    <View style={styles.cadre}>
      <MapView
        style={styles.carte}
        initialRegion={depart}
        onRegionChangeComplete={setRegion}
        showsPointsOfInterests={false}>
        {grappes.map((grappe) =>
          grappe.point ? (
            <Marker
              key={grappe.cle}
              coordinate={{ latitude: grappe.latitude, longitude: grappe.longitude }}
              onPress={() => onChoisir(grappe.point as PointCarte)}>
              <View style={[styles.point, { backgroundColor: grappe.point.couleur }]} />
            </Marker>
          ) : (
            <Marker
              key={grappe.cle}
              coordinate={{ latitude: grappe.latitude, longitude: grappe.longitude }}>
              <View style={styles.grappe}>
                <Text style={styles.grappeTexte}>{grappe.nombre}</Text>
              </View>
            </Marker>
          )
        )}
      </MapView>

      <View style={styles.historique}>
        {HISTORIQUES.map((h) => (
          <Pressable
            key={h.mois}
            onPress={() => onChangerHistorique(h.mois)}
            style={[styles.choixHistorique, historiqueMois === h.mois && styles.choixActif]}>
            <Text
              style={[
                styles.choixTexte,
                historiqueMois === h.mois && { fontFamily: police.demi, color: couleurs.texte },
              ]}>
              {t(`carte.${h.cle}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.legende}>
        {[
          { couleur: couleurs.urgent, texte: t('carte.apres48h') },
          { couleur: couleurs.proche, texte: t('carte.apres14j') },
          { couleur: couleurs.lointain, texte: t('carte.plusTard') },
          { couleur: couleurs.historique, texte: t('carte.legendeDejaTravaille') },
        ].map((entree) => (
          <View key={entree.texte} style={styles.entreeLegende}>
            <View style={[styles.pastille, { backgroundColor: entree.couleur }]} />
            <Text style={styles.legendeTexte}>{entree.texte}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    height: 440,
    borderRadius: rayon,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: couleurs.bordure,
    marginBottom: espace.m,
  },
  carte: {
    ...StyleSheet.absoluteFill,
  },
  point: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  grappe: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: couleurs.texte,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  grappeTexte: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: police.gras,
  },
  historique: {
    position: 'absolute',
    top: espace.s,
    right: espace.s,
    flexDirection: 'row',
    backgroundColor: '#FFFFFFEE',
    borderRadius: 999,
    padding: 2,
  },
  choixHistorique: {
    paddingHorizontal: espace.m,
    paddingVertical: espace.xs,
    borderRadius: 999,
  },
  choixActif: {
    backgroundColor: couleurs.fond,
  },
  choixTexte: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  legende: {
    position: 'absolute',
    left: espace.s,
    right: espace.s,
    bottom: espace.s,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espace.m,
    backgroundColor: '#FFFFFFEE',
    borderRadius: rayon,
    paddingVertical: espace.s,
    paddingHorizontal: espace.m,
  },
  entreeLegende: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.xs,
  },
  pastille: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendeTexte: {
    fontSize: 11,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
