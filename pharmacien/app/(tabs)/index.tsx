import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { listerPharmacies } from '../../src/db/pharmacies';
import { delaisSecondaires, obtenirReglages } from '../../src/db/profil';
import {
  deplacerQuart,
  enregistrerRappels,
  listerQuarts,
  obtenirQuart,
  rappelsDuQuart,
} from '../../src/db/quarts';
import type { Pharmacie, QuartDetaille } from '../../src/db/types';
import {
  ajouterJours,
  ajouterMois,
  aujourdhui,
  combiner,
  debutMois,
  formatDateLongue,
  formatJourCourt,
  semaineDe,
} from '../../src/lib/dates';
import {
  doitRappelerFactures,
  rappelFacturesTraite,
  reporterRappelFactures,
} from '../../src/lib/rappelFactures';
import { annulerRappels, planifierRappelsQuart } from '../../src/lib/notifications';
import { detecterChevauchements } from '../../src/lib/stats';
import { Calendrier } from '../../src/ui/Calendrier';
import { Bouton, Carte, Doux, Fondu, Onglets, Vide } from '../../src/ui/composants';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';
import { VueCarte, type PointCarte } from '../../src/ui/VueCarte';
import { Ruban } from '../../src/ui/Ruban';
import { VueColonnes } from '../../src/ui/VueColonnes';

type Vue = 'agenda' | 'liste' | 'carte';
type Affichage = 'jour' | 'semaine' | 'mois';

export default function Horaire() {
  const router = useRouter();
  const accent = useAccent();
  // Ce qui reste à l'agenda une fois l'en-tête, la barre d'onglets et le bouton
  // d'ajout déduits : la vue s'y ajuste plutôt que d'imposer un défilement.
  const { height } = useWindowDimensions();
  const hauteurAgenda = Math.max(280, height - 400);
  const [quarts, setQuarts] = useState<QuartDetaille[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [vue, setVue] = useState<Vue>('agenda');
  // Le mois s'ouvre en premier : c'est lui qui donne la vue d'ensemble.
  const [affichage, setAffichage] = useState<Affichage>('mois');
  const [mois, setMois] = useState(() => debutMois(aujourdhui()));
  const [jour, setJour] = useState(() => aujourdhui());
  const [historiqueMois, setHistoriqueMois] = useState(1);
  const [rappelFactures, setRappelFactures] = useState(false);
  /** Une duplication en cours prend le doigt : la page ne doit pas défiler. */
  const [duplication, setDuplication] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setQuarts(listerQuarts());
      setPharmacies(listerPharmacies());
      setRappelFactures(doitRappelerFactures(obtenirReglages()));
    }, [])
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

  const quartsDuJour = parJour.get(jour) ?? [];
  const aVenir = useMemo(
    () => quarts.filter((q) => q.date >= aujourdhui() && !q.annule),
    [quarts]
  );

  /** Quarts à venir d'abord, puis les pharmacies déjà fréquentées en vert. */
  const points = useMemo<PointCarte[]>(() => {
    const maintenant = Date.now();
    const resultat: PointCarte[] = [];
    const placees = new Set<number>();

    for (const q of quarts) {
      if (q.annule) continue;
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

  const dupliquer = (id: number, date: string, heure: string) =>
    router.push(`/quart/nouveau?duplique=${id}&date=${date}&heure=${heure}`);

  /** Un déplacement se fait en silence : le dépôt dit déjà le jour et l'heure. */
  const deplacer = (id: number, date: string, heure: string) => {
    deplacerQuart(id, date, heure);
    const quart = obtenirQuart(id);
    if (quart) {
      void (async () => {
        await annulerRappels(rappelsDuQuart(quart));
        const rappels = await planifierRappelsQuart(quart, delaisSecondaires(obtenirReglages()));
        enregistrerRappels(id, rappels.principal, rappels.secondaires, rappels.memo);
      })();
    }
    setQuarts(listerQuarts());
  };

  /** Toucher un jour du mois ouvre sa journée : survol, puis détail, en un geste. */
  const choisirJour = (date: string) => {
    setJour(date);
    setAffichage('jour');
  };

  const semaine = semaineDe(jour);
  const pas = affichage === 'jour' ? 1 : 7;

  return (
    <ScrollView contentContainerStyle={styles.contenu} scrollEnabled={!duplication}>
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

      {/* Une seule apparence pour la même fonction, et le sous-choix n'apparaît
          que là où il a un sens : en agenda. */}
      <Onglets
        options={[
          { valeur: 'agenda' as const, texte: 'Agenda' },
          { valeur: 'liste' as const, texte: 'Liste' },
          { valeur: 'carte' as const, texte: 'Carte' },
        ]}
        valeur={vue}
        onChange={setVue}
      />

      {vue === 'agenda' && (
        <Fondu>
          <Onglets
            libelle="Affichage"
            options={[
              { valeur: 'jour' as const, texte: 'Jour' },
              { valeur: 'semaine' as const, texte: 'Semaine' },
              { valeur: 'mois' as const, texte: 'Mois' },
            ]}
            valeur={affichage}
            onChange={setAffichage}
          />

          {affichage === 'mois' ? (
            <>
              <Calendrier
                mois={mois}
                quartsParJour={parJour}
                chevauchements={chevauchements}
                jourSelectionne={jour}
                onSelectionner={choisirJour}
                onChangerMois={(delta) => setMois(ajouterMois(mois, delta))}
              />
              <Doux>Touchez un jour pour ouvrir sa journée.</Doux>
            </>
          ) : (
            <>
              <View style={styles.navigation}>
                <Pressable onPress={() => setJour(ajouterJours(jour, -pas))} hitSlop={10}>
                  <Ionicons name="chevron-back" size={22} color={accent} />
                </Pressable>
                <Text style={styles.periode}>
                  {affichage === 'jour'
                    ? formatDateLongue(jour)
                    : `${formatJourCourt(semaine[0])} – ${formatJourCourt(semaine[6])}`}
                </Text>
                <Pressable onPress={() => setJour(ajouterJours(jour, pas))} hitSlop={10}>
                  <Ionicons name="chevron-forward" size={22} color={accent} />
                </Pressable>
              </View>
              <Ruban
                bloque={duplication}
                onPrecedent={() => setJour(ajouterJours(jour, -pas))}
                onSuivant={() => setJour(ajouterJours(jour, pas))}>
                <VueColonnes
                  jours={affichage === 'jour' ? [jour] : semaine}
                  quartsParJour={parJour}
                  hauteurDisponible={hauteurAgenda}
                  onOuvrir={ouvrirQuart}
                  onDeplacer={deplacer}
                  onDupliquer={dupliquer}
                  onArmer={setDuplication}
                />
              </Ruban>
              <Doux>
                Balayez pour changer de {affichage === 'jour' ? 'jour' : 'semaine'}. Maintenez un
                bloc pour le déplacer, plus longtemps pour en dupliquer une copie.
              </Doux>

              {/* La journée garde ses cartes sous la timeline : elles portent le
                  taux, les frais et les notes, que les blocs ne montrent pas. */}
              {affichage === 'jour' && (
                <>
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
                </>
              )}
            </>
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
          <Bouton
            titre="Ajouter un quart"
            icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
            onPress={() => router.push(`/quart/nouveau?date=${jour}`)}
          />
        </Fondu>
      )}

    </ScrollView>
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
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace.s,
  },
  periode: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
    textTransform: 'capitalize',
  },
  jour: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginBottom: espace.s,
    marginTop: espace.s,
    textTransform: 'capitalize',
  },
});
