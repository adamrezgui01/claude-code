import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  enregistrerFormation,
  enregistrerReglages,
  listerDocuments,
  obtenirFormation,
  obtenirReglages,
} from '../src/db/profil';
import type { DocumentProfessionnel, Reglages } from '../src/db/types';
import {
  adresseDesReglages,
  adresseRenseignee,
  champsAdresseReglages,
  estLocalisee,
} from '../src/lib/adresses';
import { localiserAdresse } from '../src/lib/adressesRecherche';
import { aujourdhui, formatDateCourte, joursEntre } from '../src/lib/dates';
import { analyserNombre, argent, nombre } from '../src/lib/format';
import {
  Bouton,
  Champ,
  ChampTelephone,
  Doux,
  Ecran,
  Fondu,
  Rangee,
  Section,
  Vide,
} from '../src/ui/composants';
import { SelecteurDate } from '../src/ui/Selecteurs';
import { SaisieAdresse } from '../src/ui/SaisieAdresse';
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  typo,
  CIBLE_MIN,
} from '../src/ui/theme';
import { useTextes } from '../src/i18n';

export default function Profil() {
  const { t } = useTextes();
  const router = useRouter();

  const [heuresCompletees, setHeuresCompletees] = useState('0');
  const [heuresRequises, setHeuresRequises] = useState('40');
  const [finPeriode, setFinPeriode] = useState('');
  const [ajusteFormation, setAjusteFormation] = useState(false);

  const [documents, setDocuments] = useState<DocumentProfessionnel[]>([]);

  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const f = obtenirFormation();
      setHeuresCompletees(`${f.heures_completees}`);
      setHeuresRequises(`${f.heures_requises}`);
      setFinPeriode(f.date_fin_periode);
      setDocuments(listerDocuments());
      setReglages(obtenirReglages());
    }, [])
  );

  function modifier<C extends keyof Reglages>(champ: C, valeur: Reglages[C]) {
    setReglages((actuels) => (actuels ? { ...actuels, [champ]: valeur } : actuels));
    setEnregistre(false);
  }

  function sauvegarderFormation() {
    enregistrerFormation({
      heures_completees: analyserNombre(heuresCompletees),
      heures_requises: analyserNombre(heuresRequises),
      date_fin_periode: finPeriode,
    });
    setAjusteFormation(false);
  }

  async function sauvegarderReglages() {
    if (!reglages) return;

    // Une adresse saisie à la main n'a pas de coordonnées : on tente de la
    // situer, sans jamais bloquer l'enregistrement si ça échoue. Les
    // coordonnées évitent ensuite un géocodage à chaque calcul de distance.
    let adresse = adresseDesReglages(reglages);
    if (adresseRenseignee(adresse) && !estLocalisee(adresse)) {
      const point = await localiserAdresse(adresse);
      if (point) adresse = { ...adresse, ...point };
    }

    enregistrerReglages({
      ...reglages,
      ...champsAdresseReglages(adresse),
      nom: reglages.nom.trim(),
      permis_opq: reglages.permis_opq.trim(),
      telephone: reglages.telephone.trim(),
      courriel: reglages.courriel.trim(),
      cle_itineraire: reglages.cle_itineraire.trim(),
    });
    setEnregistre(true);
  }

  if (!reglages) return null;

  return (
    <Ecran>
      {/* Une ligne qui se nomme elle-même : l'en-tête « Formation continue »
          au-dessus ne couvrait qu'elle et son bouton. */}
      <Rangee
        label={t('profil.formationContinue')}
        valeur={t('profil.compteur', {
          faites: nombre(analyserNombre(heuresCompletees)),
          requises: nombre(analyserNombre(heuresRequises)),
        })}
        fort
      />
      {!!finPeriode && (
        <Doux>{t('profil.echeance', { date: formatDateCourte(finPeriode) })}</Doux>
      )}
      {!ajusteFormation ? (
        <Pressable
          onPress={() => setAjusteFormation(true)}
          accessibilityRole="button"
          style={styles.lienCible}>
          <Ionicons name="create-outline" size={icone.courante} color={couleurs.textePrincipal} />
          <Text style={styles.lien}>{t('commun.ajuster')}</Text>
        </Pressable>
      ) : (
        <Fondu style={styles.bloc}>
          <Champ
            label={t('profil.heuresCompletees')}
            valeur={heuresCompletees}
            onChange={setHeuresCompletees}
            clavier="decimal-pad"
          />
          <Champ
            label={t('profil.heuresRequises')}
            valeur={heuresRequises}
            onChange={setHeuresRequises}
            clavier="decimal-pad"
          />
          <SelecteurDate
            label={t('profil.finPeriode')}
            valeur={finPeriode || aujourdhui()}
            onChange={setFinPeriode}
          />
          <Bouton titre={t('commun.enregistrer')} onPress={sauvegarderFormation} />
        </Fondu>
      )}

      <View style={styles.entreGroupes} />

      {/* L'en-tête ne paraît que s'il a une liste à coiffer. Sans document, la
          phrase et le lien qui suit disent tout. */}
      {documents.length === 0 ? (
        <Vide texte={t('profil.aucunDocument')} />
      ) : (
        <Section titre={t('profil.documents')}>
        {documents.map((d) => {
          const restants = joursEntre(aujourdhui(), d.date_expiration);
          return (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/document/${d.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.document, pressed && { opacity: 0.6 }]}>
              <View style={styles.documentTexte}>
                <Text style={styles.documentNom}>{d.nom}</Text>
                <Doux>
                  {t('profil.expireLe', {
                    date: formatDateCourte(d.date_expiration),
                    jours: d.jours_avant_rappel,
                  })}
                </Doux>
              </View>
              <Text style={[styles.restants, restants <= 0 && styles.expire]}>
                {restants <= 0 ? t('profil.expire') : t('profil.joursRestants', { jours: restants })}
              </Text>
            </Pressable>
          );
        })}
        </Section>
      )}
      <Pressable
        onPress={() => router.push('/document/nouveau')}
        accessibilityRole="button"
        style={styles.lienCible}>
        <Ionicons name="add" size={icone.courante} color={couleurs.textePrincipal} />
        <Text style={styles.lien}>{t('profil.ajouterDocument')}</Text>
      </Pressable>

      <View style={styles.entreGroupes} />

      {/* Ce qui décrit l'usager et ce qui part sur ses factures. Sans en-tête
          « Informations » au-dessus : les trois sections qui suivent portent
          déjà chacune le leur. */}
      <Doux>{t('profil.coordonneesEntete')}</Doux>
      <View style={styles.bloc} />

      <Section titre={t('profil.identite')}>
        <Champ
          nu
          label={t('profil.votreNom')}
          valeur={reglages.nom}
          onChange={(v) => modifier('nom', v)}
        />
        <Champ
          nu
          label={t('profil.permisOpq')}
          valeur={reglages.permis_opq}
          onChange={(v) => modifier('permis_opq', v)}
        />
      </Section>

      <Section titre={t('profil.adresse')}>
        <SaisieAdresse
          adresse={adresseDesReglages(reglages)}
          onChange={(a) => {
            setReglages((actuels) => (actuels ? { ...actuels, ...champsAdresseReglages(a) } : actuels));
            setEnregistre(false);
          }}
          cle={reglages.cle_itineraire}
        />
      </Section>

      <Section titre={t('profil.coordonnees')}>
        <ChampTelephone
          nu
          label={t('pharmacie.telephone')}
          valeur={reglages.telephone}
          onChange={(v) => modifier('telephone', v)}
        />
        <Champ
          nu
          label={t('pharmacie.courriel')}
          valeur={reglages.courriel}
          onChange={(v) => modifier('courriel', v)}
          clavier="email-address"
        />
        <Champ
          nu
          label={t('profil.tauxParKmDefaut')}
          valeur={`${reglages.taux_par_km}`}
          onChange={(v) => modifier('taux_par_km', analyserNombre(v))}
          clavier="decimal-pad"
          aide={t('profil.tauxParKmAide', { montant: argent(reglages.taux_par_km) })}
        />
      </Section>

      {/* Ces champs ne partent nulle part tout seuls : sans ce bouton, le nom,
          le permis et l'adresse saisis ici étaient perdus en quittant l'écran,
          et l'en-tête des factures restait vide. */}
      <Bouton
        titre={t(enregistre ? 'commun.enregistre' : 'commun.enregistrer')}
        variante={enregistre ? 'secondaire' : 'principal'}
        onPress={() => void sauvegarderReglages()}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  lien: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  lienCible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    alignSelf: 'flex-start',
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  entreGroupes: { height: dimensions.formulaire.entreGroupes },
  label: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
    marginTop: espace[2],
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bloc: {
    marginTop: espace[3],
    gap: espace[2],
  },
  document: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace[3],
    paddingVertical: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  documentTexte: {
    flex: 1,
  },
  documentNom: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  restants: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
  },
  expire: {
    color: couleurs.alerte,
    fontWeight: graisse.demi,
  },
});
