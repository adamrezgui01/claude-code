import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { listerPharmacies } from '../../src/db/pharmacies';
import { definirReglage, delaisSecondaires, obtenirReglages } from '../../src/db/profil';
import {
  deplacerQuart,
  enregistrerRappels,
  listerQuarts,
  obtenirQuart,
  quartVerrouille,
  rappelsDuQuart,
} from '../../src/db/quarts';
import type { Pharmacie, QuartDetaille } from '../../src/db/types';
import { fenetreHeures, pixelsParHeure } from '../../src/lib/agenda';
import { etatQuart, heuresAvant, urgenceQuart } from '../../src/lib/echeance';
import {
  ajouterJours,
  ajouterMois,
  aujourdhui,
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
import {
  BandeauAide,
  Bouton,
  Carte,
  Doux,
  FicheAide,
  Fondu,
  Onglets,
  Vide,
} from '../../src/ui/composants';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { Pageur } from '../../src/ui/Pageur';
import { couleurs, espace, police, useAccent } from '../../src/ui/theme';
import { VueCarte, type PointCarte } from '../../src/ui/VueCarte';
import { VueColonnes } from '../../src/ui/VueColonnes';

type Vue = 'agenda' | 'liste' | 'carte';
type Affichage = 'jour' | 'semaine' | 'mois';
type Sens = 'aVenir' | 'anterieurs';

/** Nombre d'ouvertures accompagnées du bandeau d'aide, avant qu'il ne se taise. */
const OUVERTURES_AIDEES = 3;

const TEXTE_AIDE =
  'Maintenez un bloc pour le déplacer, plus longtemps pour le dupliquer. Balayez la grille pour changer de période.';

export default function Horaire() {
  const router = useRouter();
  const navigation = useNavigation();
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
  const [sens, setSens] = useState<Sens>('aVenir');
  const [mois, setMois] = useState(() => debutMois(aujourdhui()));
  const [jour, setJour] = useState(() => aujourdhui());
  const [historiqueMois, setHistoriqueMois] = useState(1);
  const [rappelFactures, setRappelFactures] = useState(false);
  /** Une duplication en cours prend le doigt : rien d'autre ne doit bouger. */
  const [duplication, setDuplication] = useState(false);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [bandeauAide, setBandeauAide] = useState(false);
  /** Repère de temps, repris à chaque venue sur l'écran. */
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setQuarts(listerQuarts());
      setPharmacies(listerPharmacies());
      setMaintenant(Date.now());
      const reglages = obtenirReglages();
      setRappelFactures(doitRappelerFactures(reglages));
      // Le bandeau accompagne les trois premières ouvertures, puis ne revient
      // plus : le débutant est guidé, l'habitué ne voit plus rien.
      const vues = reglages.aide_horaire_vues;
      setBandeauAide(vues < OUVERTURES_AIDEES);
      if (vues < OUVERTURES_AIDEES) definirReglage('aide_horaire_vues', vues + 1);
    }, [])
  );

  /**
   * Deux icônes dans l'en-tête, et pas une de plus : l'aide, qu'on lit une
   * fois, et le partage des disponibilités, qu'on utilise chaque fois qu'un
   * propriétaire demande « t'es libre quand ? ».
   */
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.enTete}>
          <Pressable
            onPress={() => router.push('/disponibilites')}
            hitSlop={12}
            style={styles.icone}>
            <Ionicons name="share-outline" size={22} color={accent} />
          </Pressable>
          <Pressable onPress={() => setAideOuverte(true)} hitSlop={12} style={styles.icone}>
            <Ionicons name="help-circle-outline" size={24} color={accent} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, accent, router]);

  const chevauchements = useMemo(() => detecterChevauchements(quarts), [quarts]);

  /**
   * Quarts effectués et facturés. Ils sont gris dans la grille, immuables dans
   * leur fiche, et sourds au glisser-déposer.
   */
  const verrouilles = useMemo(
    () => new Set(quarts.filter(quartVerrouille).map((q) => q.id)),
    [quarts]
  );

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

  /**
   * Un quart bascule dans « Antérieurs » quand il est fini, pas quand sa date
   * est passée. À 18 h, un quart du jour même terminé à 17 h est derrière soi.
   *
   * Le repère de temps est repris à chaque venue sur l'écran : assez frais
   * pour ne pas laisser un quart « en cours » une heure de trop, assez stable
   * pour ne pas tout recalculer à chaque rendu.
   */
  const { enCours, aVenir, anterieurs } = useMemo(() => {
    const enCours: QuartDetaille[] = [];
    const aVenir: QuartDetaille[] = [];
    const anterieurs: QuartDetaille[] = [];
    for (const q of quarts) {
      const etat = etatQuart(q, maintenant);
      if (etat === 'enCours') enCours.push(q);
      else if (etat === 'anterieur') anterieurs.push(q);
      else if (!q.annule) aVenir.push(q);
    }
    // Du plus récent au plus ancien : on cherche ce qu'on vient de faire.
    anterieurs.sort((a, b) =>
      a.date === b.date ? b.heure_debut.localeCompare(a.heure_debut) : b.date.localeCompare(a.date)
    );
    return { enCours, aVenir, anterieurs };
  }, [quarts, maintenant]);

  const enCoursIds = useMemo(() => new Set(enCours.map((q) => q.id)), [enCours]);

  /** Quarts à venir d'abord, puis les pharmacies déjà fréquentées en vert. */
  const points = useMemo<PointCarte[]>(() => {
    const instant = Date.now();
    const resultat: PointCarte[] = [];
    const placees = new Set<number>();

    for (const q of quarts) {
      if (q.annule) continue;
      if (q.pharmacie_latitude === null || q.pharmacie_longitude === null) continue;
      const restantes = heuresAvant(q, instant);
      if (restantes < 0) continue;
      const urgence = urgenceQuart(restantes);
      resultat.push({
        cle: `quart-${q.id}`,
        latitude: q.pharmacie_latitude,
        longitude: q.pharmacie_longitude,
        couleur: couleurs[urgence],
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

  const pas = affichage === 'jour' ? 1 : 7;
  const joursDe = (depart: string) =>
    affichage === 'jour' ? [depart] : semaineDe(depart);

  /**
   * Fenêtre d'heures calculée sur les trois pages du balayage à la fois. Sans
   * ça, l'axe des heures sauterait d'une page à l'autre pendant le glissement,
   * et deux semaines voisines ne se compareraient plus.
   */
  const { plage, pxParMinute } = useMemo(() => {
    const jours = [-pas, 0, pas].flatMap((decalage) => joursDe(ajouterJours(jour, decalage)));
    const visibles = jours.flatMap((j) => parJour.get(j) ?? []);
    const fenetre = fenetreHeures(visibles);
    return { plage: fenetre, pxParMinute: pixelsParHeure(fenetre, hauteurAgenda) / 60 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jour, pas, parJour, hauteurAgenda, affichage]);

  const semaine = semaineDe(jour);

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

          {bandeauAide && <BandeauAide texte={TEXTE_AIDE} />}

          {affichage === 'mois' ? (
            <Calendrier
              mois={mois}
              quartsParJour={parJour}
              chevauchements={chevauchements}
              verrouilles={verrouilles}
              jourSelectionne={jour}
              onSelectionner={choisirJour}
              onChangerMois={(delta) => setMois(ajouterMois(mois, delta))}
            />
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
              <Pageur
                cle={jour}
                bloque={duplication}
                onPrecedent={() => setJour(ajouterJours(jour, -pas))}
                onSuivant={() => setJour(ajouterJours(jour, pas))}
                rendre={(decalage) => (
                  <VueColonnes
                    jours={joursDe(ajouterJours(jour, decalage * pas))}
                    quartsParJour={parJour}
                    plage={plage}
                    pxParMinute={pxParMinute}
                    verrouilles={verrouilles}
                    onOuvrir={ouvrirQuart}
                    onDeplacer={deplacer}
                    onDupliquer={dupliquer}
                    onArmer={setDuplication}
                  />
                )}
              />

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
                        verrouille={verrouilles.has(q.id)}
                        enCours={enCoursIds.has(q.id)}
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
          {/*
            Deux onglets, pas deux sections empilées : empilés, les quarts
            passés s'accumuleraient sous les prochains et finiraient par les
            noyer. Le quart en cours n'a pas d'onglet à lui — il serait vide la
            quasi-totalité du temps — il s'épingle en haut de « À venir ».
          */}
          <Onglets
            options={[
              { valeur: 'aVenir' as const, texte: 'À venir' },
              { valeur: 'anterieurs' as const, texte: 'Antérieurs' },
            ]}
            valeur={sens}
            onChange={setSens}
          />

          {sens === 'aVenir' ? (
            <>
              {enCours.map((q) => (
                <LigneQuart
                  key={q.id}
                  quart={q}
                  enCours
                  afficherDate
                  verrouille={verrouilles.has(q.id)}
                  onPress={() => ouvrirQuart(q.id)}
                  onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
                />
              ))}
              {aVenir.length === 0 && enCours.length === 0 ? (
                <Vide texte="Aucun quart à venir." />
              ) : (
                aVenir.map((q) => (
                  <LigneQuart
                    key={q.id}
                    quart={q}
                    afficherDate
                    enConflit={chevauchements.has(q.id)}
                    verrouille={verrouilles.has(q.id)}
                    onPress={() => ouvrirQuart(q.id)}
                    onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
                  />
                ))
              )}
            </>
          ) : anterieurs.length === 0 ? (
            <Vide texte="Aucun quart antérieur." />
          ) : (
            anterieurs.map((q) => (
              <LigneQuart
                key={q.id}
                quart={q}
                afficherDate
                enConflit={chevauchements.has(q.id)}
                verrouille={verrouilles.has(q.id)}
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

      <FicheAide ouvert={aideOuverte} titre="Les gestes de l’agenda" onFermer={() => setAideOuverte(false)}>
        <Doux>
          Balayez la grille vers la gauche ou la droite pour changer de jour, de semaine ou de mois.
        </Doux>
        <Doux>
          Maintenez un bloc de quart, puis glissez-le pour le déplacer : il se cale à l’heure
          pleine ou à la demi-heure la plus proche.
        </Doux>
        <Doux>
          Maintenez-le plus longtemps, sans bouger le doigt : une vibration confirme le
          basculement, et le glissement dépose alors une copie au lieu de déplacer le quart.
        </Doux>
        <Doux>
          Un quart gris a été effectué et facturé : il se consulte, mais ne bouge plus. Supprimez
          sa facture pour le rouvrir.
        </Doux>
      </FicheAide>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    // Même raison qu'ailleurs : le bouton d'ajout ne doit pas finir sous la
    // barre d'onglets.
    paddingBottom: espace.xxl * 3,
  },
  enTete: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icone: {
    paddingHorizontal: espace.s,
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
