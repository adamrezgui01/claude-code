import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SECTIONS, type Lien as LienFixe } from '../../src/content/liens';
import {
  dernierBandeauRecherche,
  listerContenus,
  listerRecherches,
  listerSources,
  noterBandeauRecherche,
  noterRecherche,
  noterSourceOuverte,
  refuserBandeauRecherche,
  refusDeRecherche,
  reglagesVeille,
  statutsDesSujets,
  sujetsDeLaSource,
  type Source,
} from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { aujourdhui } from '../../src/lib/dates';
import { titreDuLien } from '../../src/lib/liens';
import { ouvrirSource } from '../../src/lib/veille/ouvrir';
import { filtrerSources, parSujet, type SourceCherchable } from '../../src/lib/veille/recherche';
import { parSousSection } from '../../src/lib/liens';
import { cleARevoir } from '../../src/lib/veille/recherches';
import { nomDuSujet } from '../../src/lib/veille/sujets';
import { etatVeille } from '../../src/lib/veille/tableau';
import { Doux, Ecran, Fondu, SousTitre, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

type SourceListee = Source & SourceCherchable;

/**
 * L'onglet Clinique.
 *
 * La veille est la moitié de l'application : elle sort du Menu et prend sa
 * propre place, au centre de la barre, là où le pouce tombe.
 *
 * Trois choses, de haut en bas. Ce qu'il y a à revoir ce soir, mais seulement
 * s'il y a quelque chose — « 0 note à revoir » est une ligne qui ne sert à
 * rien et qu'on apprend à ne plus lire. La recherche. Et les sources, groupées
 * par sujet.
 *
 * L'onglet n'a donc pas d'écran vide : dès le premier lancement, les sources
 * sont là.
 */
export default function Clinique() {
  const { t } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const jour = aujourdhui();

  const [sources, setSources] = useState<SourceListee[]>([]);
  const [revisions, setRevisions] = useState(0);
  const [recherche, setRecherche] = useState('');
  /** L'identifiant de la recherche notée, pour y rattacher la source ouverte. */
  const [notee, setNotee] = useState(0);
  const [aRevoir, setARevoir] = useState<string | null>(null);

  const traduire = useCallback((cle: string) => t(cle), [t]);

  useFocusEffect(
    useCallback(() => {
      const brutes = listerSources();
      const contenus = listerContenus();
      const plafond = reglagesVeille().veille_plafond;

      setSources(
        brutes.map((s) => ({
          ...s,
          sujets: sujetsDeLaSource(s.id).map((sujet) => nomDuSujet(sujet, traduire)),
        }))
      );
      setRevisions(
        etatVeille(
          contenus.map((c) => ({
            id: c.id,
            prochaine: c.prochaine_revision,
            revisable: true,
            sujets: statutsDesSujets(c.id),
            statut: c.statut,
            valide_le: c.valide_le,
          })),
          brutes,
          jour,
          plafond
        ).revisions
      );
      setARevoir(
        cleARevoir(listerRecherches(), refusDeRecherche(), dernierBandeauRecherche(), Date.now())
      );
    }, [jour, traduire])
  );

  /**
   * La recherche est notée quand l'usager s'arrête de taper, pas à chaque
   * lettre : « m », « me », « met » ne sont pas trois questions.
   */
  useEffect(() => {
    const terme = recherche.trim();
    if (terme.length < 3) {
      setNotee(0);
      return;
    }
    const minuterie = setTimeout(() => {
      setNotee(noterRecherche(terme, filtrerSources(sources, terme).length));
    }, 900);
    return () => clearTimeout(minuterie);
  }, [recherche, sources]);

  const trouvees = useMemo(() => filtrerSources(sources, recherche), [sources, recherche]);
  const { outils, liensUtiles } = useMemo(() => parSousSection(trouvees), [trouvees]);
  const groupes = useMemo(
    () => parSujet(liensUtiles, t('clinique.sansSujet')),
    [liensUtiles, t]
  );

  const cherche = recherche.trim().length > 0;

  return (
    <Ecran style={styles.contenu}>
      {/* Rien à revoir : pas de ligne. Un compteur à zéro s'apprend à ne plus
          se lire, et emporte avec lui celui qui ne l'est pas. */}
      {/* Trois fois la même question en trois mois : c'est un sujet qui ne
          rentre pas, et ça se dit sans que personne ait eu à l'admettre. */}
      {!!aRevoir && (
        <Fondu>
          <View style={[styles.rappel, { borderColor: accent }]}>
            <View style={styles.texte}>
              <Text style={styles.titre}>{t('clinique.bandeauTitre')}</Text>
              <Text style={styles.detail}>{aRevoir}</Text>
            </View>
            <Pressable
              onPress={() => {
                noterBandeauRecherche(aRevoir);
                setARevoir(null);
                router.push(`/veille/note/nouvelle?titre=${encodeURIComponent(aRevoir)}`);
              }}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: accent },
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={styles.actionTexte}>{t('clinique.bandeauAction')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                refuserBandeauRecherche(aRevoir);
                setARevoir(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('commun.fermer')}
              hitSlop={10}>
              <Ionicons name="close" size={18} color={couleurs.doux} />
            </Pressable>
          </View>
        </Fondu>
      )}

      {revisions > 0 && (
        <Fondu>
          <Pressable
            onPress={() => router.push('/veille/revision')}
            style={({ pressed }) => [
              styles.revisions,
              { borderColor: accent },
              pressed && { opacity: 0.6 },
            ]}>
            <Ionicons name="school-outline" size={20} color={accent} />
            <Text style={[styles.revisionsTexte, { color: accent }]}>
              {t('clinique.revisionsDuJour', { count: revisions })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={accent} />
          </Pressable>
        </Fondu>
      )}

      <View style={styles.recherche}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('clinique.chercher')}
          placeholderTextColor={couleurs.doux}
          autoCorrect={false}
          returnKeyType="search"
        />
        {cherche && (
          <Pressable
            onPress={() => setRecherche('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('commun.effacerRecherche')}>
            <Ionicons name="close-circle" size={16} color={couleurs.doux} />
          </Pressable>
        )}
      </View>

      {trouvees.length === 0 ? (
        <Vide texte={t('clinique.aucunResultat')} />
      ) : (
        <>
          {/* Les outils d'abord : on les ouvre au comptoir, un patient devant
              soi. Les références ensuite, groupées par sujet. */}
          {outils.length > 0 && (
            <Fondu>
              <SousTitre>{t('clinique.outils')}</SousTitre>
              {outils.map((source) => (
                <LigneSource
                  key={`outil-${source.id}`}
                  source={source}
                  traduire={traduire}
                  onOuvrir={() => noterSourceOuverte(notee, source.id)}
                />
              ))}
              <View style={styles.espace} />
            </Fondu>
          )}

          {liensUtiles.length > 0 && (
            <Fondu>
              <SousTitre>{t('clinique.liensUtiles')}</SousTitre>
              <View style={styles.espace} />
            </Fondu>
          )}
          {groupes.map((groupe) => (
            <Fondu key={groupe.sujet}>
              <SousTitre>{groupe.sujet}</SousTitre>
              {groupe.sources.map((source) => (
                <LigneSource
                  key={`${groupe.sujet}-${source.id}`}
                  source={source}
                  traduire={traduire}
                  onOuvrir={() => noterSourceOuverte(notee, source.id)}
                />
              ))}
              <View style={styles.espace} />
            </Fondu>
          ))}
        </>
      )}

      {!cherche && (
        <>
          <Pressable
            onPress={() => router.push('/veille')}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="bookmark-outline" size={18} color={accent} />
            <Text style={styles.titre}>{t('clinique.maVeille')}</Text>
            <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
          </Pressable>

          {/* Les numéros d'urgence suivent les sources : ils faisaient partie
              de « Liens et infos utiles », et les laisser derrière aurait été
              les perdre. */}
          {SECTIONS.map((section) => (
            <View key={section.titre} style={styles.espace}>
              <SousTitre>{t('clinique.urgences')}</SousTitre>
              {section.liens.map((lien) => (
                <LigneFixe key={lien.libelle} lien={lien} />
              ))}
            </View>
          ))}
        </>
      )}
    </Ecran>
  );
}

function LigneSource({
  source,
  traduire,
  onOuvrir,
}: {
  source: SourceListee;
  traduire: (cle: string) => string;
  onOuvrir: () => void;
}) {
  const accent = useAccent();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        onOuvrir();
        void ouvrirSource(source, !!reglagesVeille().veille_navigateur);
      }}
      onLongPress={() => router.push(`/lien/${source.id}`)}
      delayLongPress={400}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons name="document-text-outline" size={18} color={accent} />
      <View style={styles.texte}>
        <Text style={styles.titre}>{titreDuLien(source, traduire)}</Text>
        {!!source.organisation && (
          <Text style={styles.detail}>
            {source.organisation}
            {source.version ? ` · ${source.version}` : ''}
          </Text>
        )}
      </View>
      <Pressable
        onPress={() => router.push(`/lien/${source.id}`)}
        accessibilityRole="button"
        accessibilityLabel={traduire('commun.details')}
        hitSlop={12}>
        <Ionicons name="ellipsis-horizontal" size={18} color={couleurs.doux} />
      </Pressable>
    </Pressable>
  );
}

function LigneFixe({ lien }: { lien: LienFixe }) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() =>
        void Linking.openURL(
          lien.type === 'tel' ? `tel:${lien.valeur.replace(/[^\d+]/g, '')}` : lien.valeur
        )
      }
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons name={lien.type === 'tel' ? 'call' : 'open-outline'} size={18} color={accent} />
      <View style={styles.texte}>
        <Text style={styles.titre}>{lien.libelle}</Text>
        {!!lien.detail && <Text style={styles.detail}>{lien.detail}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: espace.xl },
  rappel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    borderWidth: 1.5,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    marginBottom: espace.l,
  },
  action: { borderRadius: rayon, paddingVertical: espace.s, paddingHorizontal: espace.m },
  actionTexte: { fontSize: 13, fontFamily: police.demi, color: '#FFFFFF' },
  revisions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    borderWidth: 1.5,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    marginBottom: espace.l,
  },
  revisionsTexte: { flex: 1, fontSize: 15, fontFamily: police.demi },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 44,
    marginBottom: espace.l,
  },
  saisie: { flex: 1, fontSize: 15, fontFamily: police.normal, color: couleurs.texte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.s,
  },
  texte: { flex: 1, gap: 2 },
  titre: { flex: 1, fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  detail: { fontSize: 13, fontFamily: police.normal, color: couleurs.doux },
  espace: { marginTop: espace.m },
});
