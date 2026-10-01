import { useState } from 'react';

import { SOURCES } from '../donnees/sources';
import { adresseDouverture, filtrerSources, LONGUEUR_MIN, parTheme, type Source } from '../lib/sources';
import { Recherche } from '../ui/composants';
import { Ecran, Vide } from '../ui/Ecran';
import { Icone } from '../ui/Icone';

/**
 * La clinique : la recherche par-dessus, puis deux sous-sections, Outils et
 * Liens utiles. Un calculateur s'ouvre en pleine conversation ; un guide se
 * consulte. La recherche est une seule recherche, sur les deux.
 */
export default function Clinique() {
  const [recherche, setRecherche] = useState('');
  const terme = recherche.trim();
  const trouvees = filtrerSources(SOURCES, recherche);
  const outils = trouvees.filter((s) => s.sousSection === 'outils');
  const liens = trouvees.filter((s) => s.sousSection === 'liens_utiles');

  return (
    <Ecran titre="Clinique">
      <Recherche valeur={recherche} onChange={setRecherche} etiquette="Chercher une source" invite="Sujet, sigle, molécule" />
      {terme.length > 0 && terme.length < LONGUEUR_MIN && (
        <p className="aide indication">En dessous de trois lettres, seuls les sigles exacts répondent.</p>
      )}

      {trouvees.length === 0 ? (
        <Vide texte="Aucune source ne correspond." />
      ) : (
        <>
          {outils.length > 0 && (
            <section className="sous-section">
              <h2 className="titre-sous-section">Outils</h2>
              <Lignes sources={outils} />
            </section>
          )}
          {liens.length > 0 && (
            <section className="sous-section">
              <h2 className="titre-sous-section">Liens utiles</h2>
              {/* Pendant une recherche, les résultats se lisent d'un bloc : des
                  en-têtes de thème au-dessus d'une ligne chacun ne sépareraient
                  rien. */}
              {terme ? (
                <Lignes sources={liens} />
              ) : (
                parTheme(liens).map(({ theme, sources }) => (
                  <div key={theme.cle} className="theme">
                    <h3 className="en-tete en-tete-theme">
                      <Icone nom={theme.icone} taille="petite" />
                      {theme.nom}
                    </h3>
                    <Lignes sources={sources} />
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
    </Ecran>
  );
}

function Lignes({ sources }: { sources: Source[] }) {
  return (
    <div className="section-corps">
      {sources.map((s) => (
        <div key={s.cle} className="section-ligne">
          <LigneSource source={s} />
        </div>
      ))}
    </div>
  );
}

/**
 * Une source : le document s'ouvre en principal, la page officielle en
 * secondaire. Un feuillet pour le patient porte son repère sur la ligne.
 */
function LigneSource({ source }: { source: Source }) {
  const document = adresseDouverture(source);
  const reference = source.url_reference && source.url_reference !== document ? source.url_reference : '';
  return (
    <div className="ligne-source">
      <a href={document} target="_blank" rel="noopener noreferrer" className="ligne-source-lien">
        <span className="ligne-source-texte">
          <span>{source.titre}</span>
          <span className="footnote secondaire">
            {source.organisation}
            {source.pourPatient && <span className="a-remettre">À remettre au patient</span>}
          </span>
        </span>
        <Icone nom="ouvrir" />
      </a>
      {reference && (
        <a href={reference} target="_blank" rel="noopener noreferrer" className="lien-source" title="La page officielle, qui suit la version courante du document">
          <Icone nom="lien" taille="petite" />
          <span>Source</span>
        </a>
      )}
    </div>
  );
}
