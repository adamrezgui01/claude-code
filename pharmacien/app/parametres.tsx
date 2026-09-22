import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLocales } from 'expo-localization';

import * as Clipboard from 'expo-clipboard';

import { facturesEnAttente } from '../src/db/factures';
import { compterIncomprises, effacerIncomprises, listerIncomprises } from '../src/db/lecteur';
import { definirReglageVeille, reglagesVeille } from '../src/db/veille';
import { replanifierVeille } from '../src/lib/veille/planifier';
import {
  definirReglage,
  delaisSecondaires,
  enregistrerReglages,
  obtenirReglages,
} from '../src/db/profil';
import type { Reglages } from '../src/db/types';
import { analyserNombre } from '../src/lib/format';
import { appliquerLangue, useTextes } from '../src/i18n';
import { LANGUES, type ChoixLangue } from '../src/lib/langue';
import { programmerRelance } from '../src/lib/relanceFactures';
import { reprogrammerRappels } from '../src/lib/reprogrammer';
import {
  Bouton,
  Champ,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Puce,
  Section,
  SousTitre,
} from '../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../src/ui/theme';
import { SelecteurHeure } from '../src/ui/Selecteurs';

/** Délais proposés pour le rappel secondaire, en minutes. */
const DELAIS = [30, 60, 120, 180];

/**
 * Les réglages globaux, et rien d'autre. Un réglage qui ne touche qu'un écran
 * reste sur cet écran : le tri du répertoire est en haut du répertoire, le
 * sélecteur d'historique est sur la carte.
 */
export default function Parametres() {
  const router = useRouter();
  const accent = useAccent();
  const { t } = useTextes();
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [incomprises, setIncomprises] = useState(0);
  const [veille, setVeille] = useState({
    rappel: true,
    heure: '20:00',
    plafond: 10,
    bandeau: true,
    navigateur: false,
  });
  const [copiee, setCopiee] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setReglages(obtenirReglages());
      setIncomprises(compterIncomprises());
      const v = reglagesVeille();
      setVeille({
        rappel: !!v.veille_rappel_actif,
        heure: v.veille_heure || '20:00',
        plafond: v.veille_plafond,
        bandeau: !!v.veille_bandeau,
        navigateur: !!v.veille_navigateur,
      });
    }, [])
  );

  /** Un réglage de veille prend effet tout de suite : la file est reprogrammée. */
  function changerVeille(
    champ: Parameters<typeof definirReglageVeille>[0],
    valeur: string | number,
    local: Partial<typeof veille>
  ) {
    definirReglageVeille(champ, valeur);
    setVeille((actuel) => ({ ...actuel, ...local }));
    void replanifierVeille();
  }

  /**
   * La liste part dans le presse-papiers, et nulle part ailleurs. C'est
   * l'usager qui décide de la coller quelque part, ou pas.
   */
  async function copierJournal() {
    const liste = listerIncomprises()
      .map((d) => `${d.le.slice(0, 10)}  ${d.phrase}`)
      .join('\n');
    await Clipboard.setStringAsync(liste);
    setCopiee(true);
  }

  function modifier<C extends keyof Reglages>(champ: C, valeur: Reglages[C]) {
    setReglages((actuels) => (actuels ? { ...actuels, [champ]: valeur } : actuels));
    setEnregistre(false);
  }

  function basculerDelai(minutes: number) {
    if (!reglages) return;
    const actuels = delaisSecondaires({ ...reglages, rappel_secondaire_actif: 1 });
    const suivants = actuels.includes(minutes)
      ? actuels.filter((d) => d !== minutes)
      : [...actuels, minutes].sort((a, b) => a - b);
    modifier('rappel_delais', JSON.stringify(suivants));
  }

  async function sauvegarder() {
    if (!reglages) return;
    const delai = Math.max(0, Math.round(reglages.delai_relance_factures));
    enregistrerReglages({
      ...reglages,
      cle_itineraire: reglages.cle_itineraire.trim(),
      delai_relance_factures: delai,
    });
    // Le délai a pu changer : les factures encore en attente reprogramment
    // leur relance, sinon un ancien rappel partirait à l'ancienne date.
    for (const facture of facturesEnAttente()) await programmerRelance(facture, delai);
    setEnregistre(true);
  }

  /**
   * Le changement prend effet aussitôt, sans redémarrer. Les rappels déjà en
   * file gardent la phrase qu'on leur a donnée : il faut les reprogrammer,
   * sans quoi l'usager recevrait pendant des semaines des notifications dans
   * la langue qu'il vient de quitter.
   */
  async function choisirLangue(choix: ChoixLangue) {
    modifier('langue', choix);
    definirReglage('langue', choix);
    await appliquerLangue(choix, getLocales().map((l) => l.languageTag));
    await reprogrammerRappels();
  }

  if (!reglages) return null;

  const delais = delaisSecondaires({ ...reglages, rappel_secondaire_actif: 1 });

  return (
    <Ecran>
      <SousTitre>{t('parametres.rappelsQuart')}</SousTitre>
      <Doux>
        Un rappel part toujours 48 h avant un quart, et un mémo 2 h après sa fin — celui-là ne
        demande rien, il rappelle seulement de corriger vos heures si elles ont changé.
      </Doux>
      <View style={styles.espacement} />

      {/* Le sous-texte d'un réglage partage la marge de son libellé : c'est
          l'encadré qui donne cette marge aux deux à la fois. */}
      <Section>
        <View style={styles.bloc}>
          <Interrupteur
            label={t('parametres.rappelSupplementaire')}
            detail={t('parametres.rappelSupplementaireDetail')}
            valeur={!!reglages.rappel_secondaire_actif}
            onChange={(v) => modifier('rappel_secondaire_actif', v ? 1 : 0)}
          />
          {!!reglages.rappel_secondaire_actif && (
            <Fondu>
              <Text style={styles.label}>{t('parametres.combienAvant')}</Text>
              <View style={styles.puces}>
                {DELAIS.map((minutes) => (
                  <Puce
                    key={minutes}
                    texte={minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}
                    actif={delais.includes(minutes)}
                    onPress={() => basculerDelai(minutes)}
                  />
                ))}
              </View>
              <Doux>{t('parametres.plusieursDelais')}</Doux>
            </Fondu>
          )}
        </View>
      </Section>

      {/*
        Une facture oubliée, c'est de l'argent réel : un propriétaire laisse
        passer, et le trou se découvre des mois plus tard. Un seul réglage,
        global — un délai par pharmacie ne se remplit intelligemment qu'après
        des mois d'usage, quand on sait laquelle paie lentement.
      */}
      <SousTitre>{t('parametres.relanceFactures')}</SousTitre>
      <Doux>
        Une facture restée en attente au-delà de ce délai vous vaut une notification. Un seul
        rappel, doux, sans répétition.
      </Doux>
      <View style={styles.espacement} />
      <Section>
        <Champ
          nu
          label={t('parametres.relanceDelai')}
          valeur={`${reglages.delai_relance_factures}`}
          onChange={(v) => modifier('delai_relance_factures', analyserNombre(v))}
          clavier="number-pad"
          aide={t('parametres.relanceAide')}
        />
      </Section>

      <SousTitre>{t('parametres.langue')}</SousTitre>
      <Doux>{t('parametres.langueAide')}</Doux>
      <View style={styles.espacement} />
      <Section>
        <View style={styles.bloc}>
          <View style={styles.puces}>
            {(['auto', ...LANGUES] as ChoixLangue[]).map((choix) => (
              <Puce
                key={choix}
                texte={t(
                  choix === 'auto'
                    ? 'parametres.langueAuto'
                    : choix === 'fr'
                      ? 'parametres.langueFr'
                      : 'parametres.langueEn'
                )}
                actif={reglages.langue === choix}
                onPress={() => void choisirLangue(choix)}
              />
            ))}
          </View>
        </View>
      </Section>

      <Section titre={t('veille.reglages')}>
        <Interrupteur
          label={t('veille.rappelActif')}
          detail={t('veille.rappelDetail')}
          valeur={veille.rappel}
          onChange={(v) => changerVeille('veille_rappel_actif', v ? 1 : 0, { rappel: v })}
        />
        {veille.rappel && (
          <SelecteurHeure
            label={t('veille.heureRappel')}
            valeur={veille.heure}
            onChange={(v) => changerVeille('veille_heure', v, { heure: v })}
          />
        )}
        <Champ
          nu
          label={t('veille.plafond')}
          valeur={`${veille.plafond}`}
          onChange={(v) => changerVeille('veille_plafond', Number(v) || 0, { plafond: Number(v) || 0 })}
          clavier="number-pad"
          aide={t('veille.plafondAide')}
        />
        <Interrupteur
          label={t('veille.bandeauReglage')}
          detail={t('veille.bandeauReglageDetail')}
          valeur={veille.bandeau}
          onChange={(v) => changerVeille('veille_bandeau', v ? 1 : 0, { bandeau: v })}
        />
        <Interrupteur
          label={t('veille.navigateurIntegre')}
          detail={t('veille.navigateurIntegreDetail')}
          valeur={veille.navigateur}
          onChange={(v) => changerVeille('veille_navigateur', v ? 1 : 0, { navigateur: v })}
        />
      </Section>

      <Section titre={t('dictee.journal')}>
        <Doux>{t('dictee.journalIntro')}</Doux>
        <Text style={styles.compte}>
          {incomprises === 0
            ? t('dictee.journalAucune')
            : t('dictee.journalDetail', { count: incomprises })}
        </Text>
        {incomprises > 0 && (
          <View style={styles.actionsJournal}>
            <View style={styles.actionJournal}>
              <Bouton
                titre={copiee ? t('dictee.copiee') : t('dictee.copier')}
                variante="secondaire"
                onPress={() => void copierJournal()}
              />
            </View>
            <View style={styles.actionJournal}>
              <Bouton
                titre={t('dictee.effacer')}
                variante="secondaire"
                onPress={() => {
                  effacerIncomprises();
                  setIncomprises(0);
                  setCopiee(false);
                }}
              />
            </View>
          </View>
        )}
      </Section>

      <Section titre={t('parametres.serviceAdresses')}>
        <Champ
          nu
          label={t('parametres.cleItineraire')}
          valeur={reglages.cle_itineraire}
          onChange={(v) => modifier('cle_itineraire', v)}
          masque
          aide={t('parametres.cleAide')}
        />
      </Section>

      <Bouton
        titre={t(enregistre ? 'commun.enregistre' : 'commun.enregistrer')}
        variante={enregistre ? 'secondaire' : 'principal'}
        onPress={() => void sauvegarder()}
      />

      <Pressable
        onPress={() => router.push('/apparence')}
        style={({ pressed }) => [styles.apparence, pressed && { opacity: 0.6 }]}>
        <Ionicons name="color-palette-outline" size={20} color={accent} />
        <View style={styles.apparenceTexte}>
          <Text style={styles.apparenceTitre}>{t('parametres.apparence')}</Text>
          <Doux>{t('parametres.apparenceDetail')}</Doux>
        </View>
        <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
      </Pressable>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bloc: {
    paddingVertical: espace.m,
    gap: espace.s,
  },
  espacement: {
    height: espace.m,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
    marginTop: espace.s,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  compte: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginTop: espace.s,
  },
  actionsJournal: {
    flexDirection: 'row',
    gap: espace.m,
    marginTop: espace.m,
  },
  actionJournal: { flex: 1 },
  apparence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginTop: espace.l,
  },
  apparenceTexte: {
    flex: 1,
  },
  apparenceTitre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
});
