import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { compterFacturesEnAttente, listerFactures } from '../../src/db/factures';
import { noterIncomprise } from '../../src/db/lecteur';
import { listerPharmacies } from '../../src/db/pharmacies';
import { listerDocuments } from '../../src/db/profil';
import { definirReglage, delaisSecondaires, obtenirReglages } from '../../src/db/profil';
import {
  deplacerQuart,
  enregistrerRappels,
  listerQuarts,
  obtenirQuart,
  rappelsDuQuart,
} from '../../src/db/quarts';
import type { Pharmacie, QuartDetaille } from '../../src/db/types';
import { fenetreHeures, pixelsParHeure } from '../../src/lib/agenda';
import { bandeEcartee, type ComptesAttente, type GenreAttente } from '../../src/lib/attente';
import { heuresAvant, urgenceQuart } from '../../src/lib/echeance';
import { parJour as grouperParJour, quartsVisibles, repartir } from '../../src/lib/horaire';
import { etatsDesQuarts } from '../../src/lib/facturation';
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
import type { ContexteLecteur, Fiche, FicheDispo } from '../../src/lib/lecteur';
import { declarerJournee, effacerJournee } from '../../src/db/disponibilites';
import { Calendrier } from '../../src/ui/Calendrier';
import { parametresDuQuart } from '../../src/lib/dictee';
import { Dictee } from '../../src/ui/Dictee';
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
import { BandeAttente } from '../../src/ui/BandeAttente';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { Pageur } from '../../src/ui/Pageur';
import { accentPale, couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';
import { VueCarte, type PointCarte } from '../../src/ui/VueCarte';
import { VueColonnes } from '../../src/ui/VueColonnes';
import { useTextes } from '../../src/i18n';

type Vue = 'agenda' | 'liste' | 'carte';
type Affichage = 'jour' | 'semaine' | 'mois';
type Sens = 'aVenir' | 'anterieurs';

/** Nombre d'ouvertures accompagnées du bandeau d'aide, avant qu'il ne se taise. */
const OUVERTURES_AIDEES = 3;

/**
 * Combien de jours en arrière la bande d'attente cherche des heures à
 * confirmer. Au-delà, un quart de mars n'attend plus rien de personne, et le
 * compte deviendrait un reproche permanent.
 */
const FENETRE_HEURES_JOURS = 14;

export default function Horaire() {
  const { t } = useTextes();
  const router = useRouter();
  const navigation = useNavigation();
  const accent = useAccent();
  // Ce qui reste à l'agenda une fois l'en-tête, la barre d'onglets et le bouton
  // d'ajout déduits : la vue s'y ajuste plutôt que d'imposer un défilement.
  const { height } = useWindowDimensions();
  const hauteurAgenda = Math.max(280, height - 400);
  const [quarts, setQuarts] = useState<QuartDetaille[]>([]);
  const [dictee, setDictee] = useState(false);
  /** Les bornes de la journée, pour ce que « jeudi soir » veut dire. */
  const [bornes, setBornes] = useState({ debut: '08:00', fin: '21:00' });
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
  /**
   * Les numéros des factures encaissées. Le paiement vit sur la facture, pas
   * sur le quart : c'est elle qu'on marque payée, et elle en porte plusieurs.
   */
  const [numerosPayes, setNumerosPayes] = useState<Set<string>>(new Set());
  /** Ce qui traîne, et le jour où l'usager l'a écarté d'un balayage. */
  const [attente, setAttente] = useState<ComptesAttente>({
    heures: 0,
    aFacturer: 0,
    factures: 0,
    documents: 0,
  });
  const [attenteEcartee, setAttenteEcartee] = useState('');

  useFocusEffect(
    useCallback(() => {
      setQuarts(listerQuarts());
      setPharmacies(listerPharmacies());
      setNumerosPayes(
        new Set(
          listerFactures()
            .filter((f) => f.statut_paiement === 'payee')
            .map((f) => f.numero)
        )
      );
      setMaintenant(Date.now());
      const reglages = obtenirReglages();
      setAttenteEcartee(reglages.attente_ecartee_le);
      setRappelFactures(doitRappelerFactures(reglages));
      setBornes({ debut: reglages.dispo_debut, fin: reglages.dispo_fin });
      // Le bandeau accompagne les trois premières ouvertures, puis ne revient
      // plus : le débutant est guidé, l'habitué ne voit plus rien.
      const vues = reglages.aide_horaire_vues;
      setBandeauAide(vues < OUVERTURES_AIDEES);
      if (vues < OUVERTURES_AIDEES) definirReglage('aide_horaire_vues', vues + 1);
    }, [])
  );

  /**
   * Deux commandes dans l'en-tête, et pas une de plus : l'aide, qu'on lit une
   * fois, et « Mes dispos », qu'on ouvre chaque fois qu'un propriétaire
   * demande « t'es libre quand ? ».
   *
   * « Mes dispos » porte son nom. En icône seule — un carré avec une flèche —
   * elle est restée là des mois sans que personne ne la touche : rien ne
   * laissait deviner ce qu'elle faisait.
   */
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.enTete}>
          <Pressable
            onPress={() => router.push('/disponibilites')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('disponibilites.titre')}
            style={styles.dispos}>
            <Ionicons name="calendar-clear-outline" size={18} color={accent} />
            <Text style={[styles.disposTexte, { color: accent }]}>{t('disponibilites.titre')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setAideOuverte(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('horaire.aideTitre')}
            style={styles.icone}>
            <Ionicons name="help-circle-outline" size={24} color={accent} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, accent, router, t]);

  /**
   * Une disponibilité dictée s'écrit ici, puis l'écran des dispos s'ouvre :
   * l'usager voit tout de suite ce qui a été porté au calendrier.
   */
  function ecrireDispo(fiche: FicheDispo) {
    for (const declaration of fiche.declarations) {
      for (const date of declaration.dates) {
        if (fiche.retirer) {
          effacerJournee(date);
          continue;
        }
        declarerJournee(date, [
          {
            date,
            toute_la_journee: declaration.touteLaJournee,
            heure_debut: declaration.heureDebut ?? '',
            heure_fin: declaration.heureFin ?? '',
          },
        ]);
      }
    }
    router.push('/disponibilites');
  }

  /**
   * Ce que l'horaire montre : tout, sauf les quarts annulés. Le filtre est
   * posé une fois, ici, et les trois vues partent de là — un filtre écrit vue
   * par vue s'oublie à la quatrième.
   */
  const visibles = useMemo(() => quartsVisibles(quarts), [quarts]);

  const chevauchements = useMemo(() => detecterChevauchements(visibles), [visibles]);

  /**
   * Où en est chaque quart, calculé une fois pour les trois vues.
   *
   * Quatre états : à venir, fait mais pas facturé, facturé, payé. Le gris ne
   * dit qu'une chose — la facture est partie chez le client — et ce sont les
   * pastilles qui séparent ce qu'il reste à faire de ce qui est réglé.
   */
  const etats = useMemo(
    () => etatsDesQuarts(visibles, maintenant, numerosPayes),
    [visibles, maintenant, numerosPayes]
  );

  const parJour = useMemo(() => grouperParJour(visibles), [visibles]);

  /**
   * Les comptes de la bande d'attente. Ils se relisent à chaque venue sur
   * l'écran, en même temps que le reste : une facture payée entre-temps ne doit
   * pas rester affichée comme impayée.
   */
  useEffect(() => {
    const ceJour = aujourdhui();
    const limite = ajouterJours(ceJour, -FENETRE_HEURES_JOURS);
    setAttente({
      // Finis récemment, pas encore facturés, et dont personne n'a touché aux
      // heures. C'est la fenêtre où une correction change encore un montant.
      heures: visibles.filter(
        (q) =>
          etats.get(q.id) === 'aFacturer' &&
          q.date >= limite &&
          !q.heure_debut_reelle &&
          !q.heure_fin_reelle
      ).length,
      aFacturer: visibles.filter((q) => etats.get(q.id) === 'aFacturer').length,
      factures: compterFacturesEnAttente(),
      documents: listerDocuments().filter(
        (d) => ajouterJours(d.date_expiration, -d.jours_avant_rappel) <= ceJour
      ).length,
    });
  }, [visibles, etats]);

  function ecarterAttente() {
    const ceJour = aujourdhui();
    definirReglage('attente_ecartee_le', ceJour);
    setAttenteEcartee(ceJour);
  }

  /** Toucher une ligne mène là où le travail se fait. */
  function ouvrirAttente(genre: GenreAttente) {
    if (genre === 'factures') router.push('/factures');
    else if (genre === 'documents') router.push('/profil');
    else {
      // Les heures et la facturation se règlent dans « Antérieurs ».
      setVue('liste');
      setSens('anterieurs');
    }
  }

  const quartsDuJour = parJour.get(jour) ?? [];

  /**
   * Un quart bascule dans « Antérieurs » quand il est fini, pas quand sa date
   * est passée. À 18 h, un quart du jour même terminé à 17 h est derrière soi.
   *
   * Le repère de temps est repris à chaque venue sur l'écran : assez frais
   * pour ne pas laisser un quart « en cours » une heure de trop, assez stable
   * pour ne pas tout recalculer à chaque rendu.
   */
  const { enCours, aVenir, anterieurs } = useMemo(
    () => repartir(visibles, maintenant),
    [visibles, maintenant]
  );

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
        detail: t('horaire.detailCarte', {
          date: formatDateLongue(q.date),
          debut: q.heure_debut,
          fin: q.heure_fin,
        }),
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
        detail: t('carte.dejaTravailleIci'),
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

  /**
   * Ce que le lecteur de commandes a le droit de savoir : le répertoire, et
   * les quarts déjà entrés — de quoi reconnaître une pharmacie et reprendre
   * les heures habituelles. Rien d'autre ne sort d'ici.
   */
  const contexteLecteur: ContexteLecteur = useMemo(
    () => ({
      aujourdhui: aujourdhui(),
      // Le répertoire ne sépare pas la bannière du nom : « Familiprix
      // Gatineau » est un seul champ. Le lecteur y cherche donc les deux.
      pharmacies: pharmacies.map((p) => ({
        id: p.id,
        nom: p.nom,
        banniere: null,
        ville: p.ville,
        rue: p.rue,
        surnom: p.surnom,
      })),
      quarts: quarts.map((q) => ({
        id: q.id,
        pharmacieId: q.pharmacie_id,
        date: q.date,
        heureDebut: q.heure_debut,
        heureFin: q.heure_fin,
        facture: !!q.numero_facture,
        annule: !!q.annule,
      })),
      // Ce que « jeudi matin » et « jeudi soir » veulent dire.
      bornes,
    }),
    [bornes, pharmacies, quarts]
  );

  return (
    <ScrollView contentContainerStyle={styles.contenu} scrollEnabled={!duplication}>
      {rappelFactures && (
        <Fondu>
          <Carte style={styles.bandeau}>
            <View style={styles.enteteBandeau}>
              <Ionicons name="cash-outline" size={18} color={couleurs.doux} />
              <Text style={styles.titreBandeau}>{t('horaire.rappelFacturesTitre')}</Text>
            </View>
            <Doux>{t('horaire.rappelFacturesDetail')}</Doux>
            <View style={styles.actionsBandeau}>
              <Pressable
                onPress={() => {
                  rappelFacturesTraite();
                  setRappelFactures(false);
                  router.push('/factures');
                }}
                hitSlop={8}>
                <Text style={[styles.lienBandeau, { color: accent }]}>{t('horaire.rappelFacturesVoir')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  reporterRappelFactures();
                  setRappelFactures(false);
                }}
                hitSlop={8}>
                <Text style={styles.lienBandeauDoux}>{t('horaire.rappelFacturesPlusTard')}</Text>
              </Pressable>
            </View>
          </Carte>
        </Fondu>
      )}

      {/* Ce qui traîne, une fois, en haut de l'horaire. Nulle part ailleurs :
          répétée sur quatre onglets, la bande devient du décor. */}
      {!bandeEcartee(attenteEcartee, aujourdhui()) && (
        <BandeAttente comptes={attente} onEcarter={ecarterAttente} onOuvrir={ouvrirAttente} />
      )}

      {/* Une seule apparence pour la même fonction, et le sous-choix n'apparaît
          que là où il a un sens : en agenda. */}
      <Onglets
        options={[
          {
            valeur: 'agenda' as const,
            texte: t('horaire.vueAgenda'),
            icone: 'calendar-outline' as const,
          },
          { valeur: 'liste' as const, texte: t('horaire.vueListe'), icone: 'list-outline' as const },
          { valeur: 'carte' as const, texte: t('horaire.vueCarte'), icone: 'map-outline' as const },
        ]}
        valeur={vue}
        onChange={setVue}
      />

      {vue === 'agenda' && (
        <Fondu>
          <Onglets
            libelle={t('horaire.affichage')}
            options={[
              { valeur: 'jour' as const, texte: t('horaire.jour'), icone: 'today-outline' as const },
              {
                valeur: 'semaine' as const,
                texte: t('horaire.semaine'),
                icone: 'calendar-number-outline' as const,
              },
              { valeur: 'mois' as const, texte: t('horaire.mois'), icone: 'grid-outline' as const },
            ]}
            valeur={affichage}
            onChange={setAffichage}
          />

          {bandeauAide && <BandeauAide texte={t('horaire.bandeauAide')} />}

          {affichage === 'mois' ? (
            <Calendrier
              mois={mois}
              quartsParJour={parJour}
              chevauchements={chevauchements}
              etats={etats}
              jourSelectionne={jour}
              onSelectionner={choisirJour}
              onChangerMois={(delta) => setMois(ajouterMois(mois, delta))}
            />
          ) : (
            <>
              <View style={styles.navigation}>
                <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('commun.periodePrecedente')}
        onPress={() => setJour(ajouterJours(jour, -pas))}
        hitSlop={10}>
                  <Ionicons name="chevron-back" size={22} color={accent} />
                </Pressable>
                <Text style={styles.periode}>
                  {affichage === 'jour'
                    ? formatDateLongue(jour)
                    : `${formatJourCourt(semaine[0])} – ${formatJourCourt(semaine[6])}`}
                </Text>
                <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('commun.periodeSuivante')}
        onPress={() => setJour(ajouterJours(jour, pas))}
        hitSlop={10}>
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
                    etats={etats}
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
                    <Vide texte={t('horaire.aucunQuartCeJour')} />
                  ) : (
                    quartsDuJour.map((q) => (
                      <LigneQuart
                        key={q.id}
                        quart={q}
                        enConflit={chevauchements.has(q.id)}
                        etat={etats.get(q.id)}
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

          <View style={styles.ligneAjout}>
            <View style={styles.ajoutPrincipal}>
              <Bouton
                titre={t('horaire.ajouterQuart')}
                icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
                onPress={() => router.push(`/quart/nouveau?date=${jour}`)}
              />
            </View>
            <BoutonMicro onPress={() => setDictee(true)} />
          </View>
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
              {
                valeur: 'aVenir' as const,
                texte: t('horaire.aVenir'),
                icone: 'arrow-forward-outline' as const,
              },
              {
                valeur: 'anterieurs' as const,
                texte: t('horaire.anterieurs'),
                icone: 'arrow-back-outline' as const,
              },
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
                  etat={etats.get(q.id)}
                  onPress={() => ouvrirQuart(q.id)}
                  onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
                />
              ))}
              {aVenir.length === 0 && enCours.length === 0 ? (
                <Vide texte={t('horaire.aucunQuartAVenir')} />
              ) : (
                aVenir.map((q) => (
                  <LigneQuart
                    key={q.id}
                    quart={q}
                    afficherDate
                    enConflit={chevauchements.has(q.id)}
                    etat={etats.get(q.id)}
                    onPress={() => ouvrirQuart(q.id)}
                    onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
                  />
                ))
              )}
            </>
          ) : anterieurs.length === 0 ? (
            <Vide texte={t('horaire.aucunQuartAnterieur')} />
          ) : (
            anterieurs.map((q) => (
              <LigneQuart
                key={q.id}
                quart={q}
                afficherDate
                enConflit={chevauchements.has(q.id)}
                etat={etats.get(q.id)}
                onPress={() => ouvrirQuart(q.id)}
                onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
              />
            ))
          )}

          <View style={styles.ligneAjout}>
            <View style={styles.ajoutPrincipal}>
              <Bouton
                titre={t('horaire.ajouterQuart')}
                icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
                onPress={() => router.push('/quart/nouveau')}
              />
            </View>
            <BoutonMicro onPress={() => setDictee(true)} />
          </View>
        </Fondu>
      )}

      {vue === 'carte' && (
        <Fondu>
          {points.length === 0 ? (
            <Vide texte={t('horaire.aucunePharmacieLocalisee')} />
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
          <View style={styles.ligneAjout}>
            <View style={styles.ajoutPrincipal}>
              <Bouton
                titre={t('horaire.ajouterQuart')}
                icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
                onPress={() => router.push(`/quart/nouveau?date=${jour}`)}
              />
            </View>
            <BoutonMicro onPress={() => setDictee(true)} />
          </View>
        </Fondu>
      )}

      <Dictee
        ouvert={dictee}
        contexte={contexteLecteur}
        onFermer={() => setDictee(false)}
        onQuart={(fiche) => router.push(`/quart/nouveau?${parametresDuQuart(fiche)}`)}
        onDispo={ecrireDispo}
        onAnnulation={(fiche) =>
          router.push(
            `/quart/annuler?ids=${fiche.candidats.map((q) => q.id).join(',')}` +
              (fiche.date ? `&date=${fiche.date}` : '')
          )
        }
        onPharmacie={(recherche) =>
          router.push(`/pharmacie/nouvelle?recherche=${encodeURIComponent(recherche)}`)
        }
        onIncomprise={noterIncomprise}
      />

      <FicheAide ouvert={aideOuverte} titre={t('horaire.aideTitre')} onFermer={() => setAideOuverte(false)}>
        <Doux>{t('horaire.aideBalayage')}</Doux>
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

/**
 * Le micro, carré, à côté du bouton d'ajout. Il n'écoute rien lui-même : il
 * ouvre un champ de texte, et c'est le micro du clavier qui écrit dedans.
 */
function BoutonMicro({ onPress }: { onPress: () => void }) {
  const { t } = useTextes();
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={t('dictee.titre')}
      style={({ pressed }) => [
        styles.micro,
        { borderColor: accent },
        pressed && { backgroundColor: accentPale(accent) },
      ]}>
      <Ionicons name="mic-outline" size={22} color={accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** Icône et mot ensemble ; la cible reste à 44 points de haut. */
  dispos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.xs,
    minHeight: 44,
    paddingHorizontal: espace.xs,
  },
  disposTexte: {
    fontSize: 15,
    fontFamily: police.demi,
  },
  ligneAjout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: espace.m,
  },
  ajoutPrincipal: { flex: 1 },
  micro: {
    width: 52,
    borderWidth: 1.5,
    borderRadius: rayon,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
