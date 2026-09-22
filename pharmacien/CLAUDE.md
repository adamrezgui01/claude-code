@AGENTS.md

# Les tests, et pourquoi ils priment

Cette application calcule de l'argent réel. Une erreur d'arrondi, un taux
appliqué rétroactivement, une pause déduite deux fois : rien de tout ça ne se
voit à l'écran, et tout ça part chez un client sur une facture. Les tests sont
la seule chose qui garde ces chiffres honnêtes.

## Avant de terminer une session

Toute session qui modifie le code lance `npm test` avant de conclure. Tous les
tests doivent passer. Une session se termine par une ligne qui donne le
résultat : combien de tests, combien passent.

## Écrire un test

Une nouvelle règle de calcul introduite par un prompt vient avec ses tests, et
ces tests s'écrivent **à partir de la règle, jamais à partir du code**.

C'est le point qui compte le plus ici. Un test écrit en lisant le code décrit
ce que le code fait déjà, bogues compris, et passe toujours. Il ne prouve rien.
La réponse attendue se calcule à la main, depuis la spécification, avant
d'ouvrir le fichier concerné.

## Voir le test échouer d'abord

Pour chaque bogue corrigé et chaque règle nouvelle : écrire le test, le lancer,
**le voir échouer** sur le code actuel, puis écrire le code. Un test qu'on n'a
jamais vu échouer ne prouve rien — il peut très bien ne rien vérifier du tout.

La même chose vaut pour un test déjà écrit dont on doute : réintroduire le
défaut qu'il est censé attraper, et vérifier qu'il tombe.

## Quand un test échoue

On corrige le code. Jamais la valeur attendue.

Si une valeur attendue semble contredire la spécification, on laisse le test en
échec, on le marque comme contesté, et on s'en explique. On ne la force pas
dans le code pour obtenir du vert.

## Où vivent les tests

Dans `tests/`, un fichier par domaine. Ils portent sur la logique — les
fonctions pures de `src/lib/` — jamais sur l'interface ni sur le stockage.
SQLite, `expo-secure-store` et les notifications ne tournent pas dans Jest, et
n'ont rien à apprendre sur un calcul de toute façon. Les données se construisent
dans le test lui-même, avec les fabriques de `tests/fabriques.ts`.

Un calcul mêlé au code d'un écran est un calcul qu'on ne peut pas vérifier :
il s'extrait dans une fonction pure, que l'écran appelle ensuite.

## Les règles que ces tests tiennent

Elles se contredisent facilement à l'usage ; elles sont écrites ici pour
qu'on ne les redécouvre pas trois fois.

- Un quart est la seule source de vérité. Une facture n'est qu'une mise en
  page de quarts existants : elle n'entre dans aucune statistique, et générer
  autant de factures qu'on veut ne peut rien corrompre.
- Le doublon se vérifie par quart, par le numéro de facture qu'il porte, et
  jamais par période. Un propriétaire qui possède deux pharmacies facture
  légitimement la même quinzaine deux fois.
- Chaque quart fige ses chiffres le jour de sa création : taux horaire, taux
  au kilomètre, aller-retour, pause. Renégocier une entente ne réécrit jamais
  ce qui est déjà entré.
- Zéro kilomètre est une valeur ; une distance jamais calculée n'en est pas
  une. Elles ne se confondent pas, et l'inconnu ne s'affiche jamais comme 0 $.
- Une fin d'horaire inférieure ou égale au début veut dire le lendemain.
- Un quart bascule dans « Antérieurs » quand il est fini, pas quand sa date
  est passée.
- Toute somme sortie d'un calcul est arrondie au cent avant d'être conservée.
- Un montant facturable se calcule et s'arrondit **une seule fois**, sur le
  quart. Factures et statistiques additionnent des montants déjà arrondis :
  elles ne repartent jamais des taux et des distances.
- Dans toute la hiérarchie des valeurs par défaut — réglages, pharmacie,
  quart — zéro est une valeur, et seul le vide hérite du niveau au-dessus.
- « Argent » compte tout ce qui se facture : honoraires, kilométrage, per
  diem, hébergement payé, frais ponctuels. L'hébergement fourni par la
  pharmacie n'est pas facturé, donc n'y entre pas.
- Un quart appartient à la date de son début, quart de nuit compris.
- Un dépôt aimante à la demi-heure la plus proche ; la demie exacte monte.
- Le lecteur de commandes ne crée jamais rien. Il remplit une fiche, l'usager
  confirme, et c'est la création ordinaire qui s'exécute — mêmes défauts,
  mêmes contrôles de chevauchement, même règle de minuit.
- Quand deux lectures d'une phrase tiennent debout, on pose une question avec
  des réponses à toucher. Une supposition silencieuse qui se trompe d'une
  demi-journée coûte un déplacement inutile ; une question coûte un geste.
- Un texte affiché vit dans `src/i18n`, jamais en dur dans un écran. La
  facture fait exception dans l'autre sens : elle est toujours en français,
  quelle que soit la langue choisie.
