import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerPharmacies } from '../../src/db/pharmacies';
import { obtenirReglages } from '../../src/db/profil';
import { listerQuarts, statutQuart } from '../../src/db/quarts';
import type { Pharmacie, QuartDetaille } from '../../src/db/types';
import { ajouterMois, aujourdhui, combiner, debutMois, formatDateLongue } from '../../src/lib/dates';
import {
  doitRappelerFactures,
  rappelFacturesTraite,
  reporterRappelFactures,
} from '../../src/lib/rappelFactures';
import { detecterChevauchements } from '../../src/lib/stats';
import { Calendrier } from '../../src/ui/Calendrier';
import { Bouton, Carte, Doux, Fondu, Puce, Vide } from '../../src/ui/composants';
import { useCompteurs } from '../../src/ui/compteurs';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';
import { VueCarte, type PointCarte } from '../../src/ui/VueCarte';

type Vue = 'calendrier' | 'liste' | 'carte';

export default function Horaire() {
  const router = useRouter();
  const accent = useAccent();
  const { aValider, rafraichir } = useCompteurs();
  const [quarts, setQuarts] = useState<QuartDetaille[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [vue, setVue] = useState<Vue>('calendrier');
  const [mois, setMois] = useState(() => debutMois(aujourdhui()));
  const [jour, setJour] = useState(() => aujourdhui());
  const [historiqueMois, setHistoriqueMois] = useState(1);
  const [rappelFactures, setRappelFactures] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setQuarts(listerQuarts());
      setPharmacies(listerPharmacies());
      setRappelFactures(doitRappelerFactures(obtenirReglages()));
      rafraichir();
    }, [rafraichir])
  );

  const chevauchements = useMemo(() => detecterChevauchements(quarts), [quarts]);

  const parJour = useMemo(() => {
    const carte = new Map<string, QuartDetaille[]>();
    for (const q of quarts) {
      const liste = carte.get(q.date) ?? [];
      liste.push(q);
      carte.set(q.date, liste);
    }
    return carte;
  }, [quarts]);

  const enAttente = useMemo(
    () => quarts.filter((q) => statutQuart(q) === 'a_valider'),
    [quarts]
  );

  const quartsDuJour = parJour.get(jour) ?? [];
  const aVenir = useMemo(
    () => quarts.filter((q) => q.date >= aujourdhui() && statutQuart(q) !== 'non_effectue'),
    [quarts]
  );

  /** Quarts à venir d'abord, puis les pharmacies déjà fréquentées en vert. */
  const points = useMemo<PointCarte[]>(() => {
    const maintenant = Date.now();
    const resultat: PointCarte[] = [];
    const placees = new Set<number>();

    for (const q of quarts) {
      if (statutQuart(q) !== 'a_venir') continue;
      if (q.pharmacie_latitude === null || q.pharmacie_longitude === null) continue;
      const debut = combiner(q.date, q.heure_debut).getTime();
      if (debut < maintenant) continue;
      const heures = (debut - maintenant) / 3600000;
      resultat.push({
        cle: `quart-${q.id}`,
        latitude: q.pharmacie_latitude,
        longitude: q.pharmacie_longitude,
        couleur:
          heures <= 48 ? couleurs.urgent : heures <= 14 * 24 ? couleurs.proche : couleurs.lointain,
        titre: q.pharmacie_nom,
        detail: `${formatDateLongue(q.date)} · ${q.heure_debut} à ${q.heure_fin}`,
        pharmacieId: q.pharmacie_id,
        quartId: q.id,
      });
      placees.add(q.pharmacie_id);
    }

    const limite = ajouterMois(aujourdhui(), -historiqueMois);
    const travaillees = new Set(
      quarts.filter((q) => q.date >= limite && q.date <= aujourdhui()).map((q) => q.pharmacie_id)
    );
    for (const p of pharmacies) {
      if (placees.has(p.id) || !travaillees.has(p.id)) continue;
      if (p.latitude === null || p.longitude === null) continue;
      resultat.push({
        cle: `pharmacie-${p.id}`,
        latitude: p.latitude,
        longitude: p.longitude,
        couleur: couleurs.historique,
        titre: p.nom,
        detail: 'Déjà travaillé ici',
        pharmacieId: p.id,
      });
    }
    return resultat;
  }, [quarts, pharmacies, historiqueMois]);

  const ouvrirQuart = (id: number) => router.push(`/quart/${id}`);
  const ouvrirPharmacie = (id: number) => router.push(`/pharmacie/${id}`);

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      {rappelFactures && (
        <Fondu>
          <Carte style={styles.bandeau}>
            <View style={styles.enteteBandeau}>
              <Ionicons name="cash-outline" size={18} color={couleurs.doux} />
              <Text style={styles.titreBandeau}>Vos factures ont-elles été payées ?</Text>
            </View>
            <Doux>Un coup d’œil par mois suffit à ne rien laisser traîner.</Doux>
            <View style={styles.actionsBandeau}>
              <Pressable
                onPress={() => {
                  rappelFacturesTraite();
                  setRappelFactures(false);
                  router.push('/factures');
                }}
                hitSlop={8}>
                <Text style={[styles.lienBandeau, { color: accent }]}>Voir les factures</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  reporterRappelFactures();
                  setRappelFactures(false);
                }}
                hitSlop={8}>
                <Text style={styles.lienBandeauDoux}>Revenir à ça plus tard</Text>
              </Pressable>
            </View>
          </Carte>
        </Fondu>
      )}

      {aValider > 0 && (
        <Fondu>
          <Carte style={styles.aValider}>
            <View style={styles.enteteValidation}>
              <Ionicons name="time-outline" size={18} color={couleurs.alerte} />
              <Text style={styles.titreValidation}>
                {aValider} quart{aValider > 1 ? 's' : ''} à valider
              </Text>
            </View>
            <Doux>Confirmez les heures pendant qu’elles sont fraîches.</Doux>
            <View style={styles.listeValidation}>
              {enAttente.slice(0, 3).map((q) => (
                <Pressable
                  key={q.id}
                  onPress={() => router.push(`/validation/${q.id}`)}
                  style={({ pressed }) => [styles.ligneValidation, pressed && { opacity: 0.6 }]}>
                  <View style={styles.texteValidation}>
                    <Text style={styles.nomValidation}>{q.pharmacie_nom}</Text>
                    <Doux>
                      {formatDateLongue(q.date)} · {q.heure_debut} à {q.heure_fin}
                    </Doux>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
                </Pressable>
              ))}
            </View>
          </Carte>
        </Fondu>
      )}

      <View style={styles.bascule}>
        <Puce texte="Calendrier" actif={vue === 'calendrier'} onPress={() => setVue('calendrier')} />
        <Puce texte="Liste" actif={vue === 'liste'} onPress={() => setVue('liste')} />
        <Puce texte="Carte" actif={vue === 'carte'} onPress={() => setVue('carte')} />
      </View>

      {vue === 'calendrier' && (
        <Fondu>
          <Calendrier
            mois={mois}
            quartsParJour={parJour}
            chevauchements={chevauchements}
            jourSelectionne={jour}
            onSelectionner={setJour}
            onChangerMois={(delta) => setMois(ajouterMois(mois, delta))}
          />
          <Text style={styles.jour}>{formatDateLongue(jour)}</Text>
          {quartsDuJour.length === 0 ? (
            <Vide texte="Aucun quart ce jour-là." />
          ) : (
            quartsDuJour.map((q) => (
              <LigneQuart
                key={q.id}
                quart={q}
                enConflit={chevauchements.has(q.id)}
                onPress={() => ouvrirQuart(q.id)}
                onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
              />
            ))
          )}
          <Bouton
            titre="Ajouter un quart"
            icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
            onPress={() => router.push(`/quart/nouveau?date=${jour}`)}
          />
        </Fondu>
      )}

      {vue === 'liste' && (
        <Fondu>
          <Text style={styles.jour}>À venir</Text>
          {aVenir.length === 0 ? (
            <Vide texte="Aucun quart à venir." />
          ) : (
            aVenir.map((q) => (
              <LigneQuart
                key={q.id}
                quart={q}
                afficherDate
                enConflit={chevauchements.has(q.id)}
                onPress={() => ouvrirQuart(q.id)}
                onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
              />
            ))
          )}
          <Bouton
            titre="Ajouter un quart"
            icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
            onPress={() => router.push('/quart/nouveau')}
          />
        </Fondu>
      )}

      {vue === 'carte' && (
        <Fondu>
          {points.length === 0 ? (
            <Vide texte="Aucune pharmacie localisée. Ajoutez une adresse dans une fiche de pharmacie." />
          ) : (
            <VueCarte
              points={points}
              historiqueMois={historiqueMois}
              onChangerHistorique={setHistoriqueMois}
              onChoisir={(point) =>
                point.quartId ? ouvrirQuart(point.quartId) : ouvrirPharmacie(point.pharmacieId)
              }
            />
          )}
        </Fondu>
      )}

      <View style={styles.acces}>
        <LienAcces
          icone="stats-chart-outline"
          titre="Statistiques"
          sousTitre="Heures, déplacement, revenu"
          couleur={accent}
          onPress={() => router.push('/statistiques')}
        />
        <LienAcces
          icone="business-outline"
          titre="Pharmacies"
          sousTitre="Coordonnées, conditions, codes"
          couleur={accent}
          onPress={() => router.push('/pharmacies')}
        />
      </View>
    </ScrollView>
  );
}

function LienAcces({
  icone,
  titre,
  sousTitre,
  couleur,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  sousTitre: string;
  couleur: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icone} size={20} color={couleur} />
      <View style={styles.lienTexte}>
        <Text style={styles.lienTitre}>{titre}</Text>
        <Text style={styles.lienSousTitre}>{sousTitre}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  bandeau: {
    backgroundColor: couleurs.carte,
  },
  enteteBandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    marginBottom: espace.xs,
  },
  titreBandeau: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  actionsBandeau: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espace.m,
  },
  lienBandeau: {
    fontSize: 14,
    fontFamily: police.demi,
  },
  lienBandeauDoux: {
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  aValider: {
    borderColor: couleurs.alerte,
    backgroundColor: couleurs.alertePale,
  },
  enteteValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    marginBottom: espace.xs,
  },
  titreValidation: {
    fontSize: 16,
    fontFamily: police.gras,
    color: couleurs.alerte,
  },
  listeValidation: {
    marginTop: espace.m,
    gap: espace.s,
  },
  ligneValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.carte,
    borderRadius: rayon,
    padding: espace.m,
    gap: espace.m,
  },
  texteValidation: {
    flex: 1,
  },
  nomValidation: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  bascule: {
    flexDirection: 'row',
    marginBottom: espace.m,
  },
  jour: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginBottom: espace.s,
    marginTop: espace.s,
    textTransform: 'capitalize',
  },
  acces: {
    marginTop: espace.xl,
    gap: espace.s,
  },
  lien: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
  },
  lienTexte: {
    flex: 1,
  },
  lienTitre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  lienSousTitre: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
