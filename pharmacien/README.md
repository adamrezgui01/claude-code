# Pharmacien remplaçant

Application mobile personnelle pour un pharmacien qui travaille dans plusieurs
pharmacies. Horaire, coordonnées et codes d'accès par pharmacie, statistiques,
factures PDF, suivi de la formation continue et des documents professionnels.

Tout reste sur l'appareil : pas de compte, pas de serveur, pas de partage entre
usagers. Une installation = un usager.

## Démarrer

```bash
npm install
npx expo start
```

Puis ouvrir le projet dans Expo Go (ou dans un build de développement) sur le
téléphone.

Les notifications locales fonctionnent de façon fiable dans un build de
développement (`npx expo run:android` / `run:ios`). Dans Expo Go, elles peuvent
être ignorées selon la plateforme ; l'application continue de fonctionner, seuls
les rappels ne sont pas programmés.

## Écrans

- **Horaire** — calendrier mensuel ou liste des quarts à venir, toutes
  pharmacies confondues. Un quart qui en chevauche un autre est encadré en rouge
  dans la liste et dans le calendrier. De là : statistiques, liste des
  pharmacies, ajout et modification d'un quart.
- **Liens et infos utiles** — numéros d'urgence, organismes, marche à suivre en
  cas d'erreur de dispensation. Contenu écrit en dur dans
  `src/content/liens.ts`.
- **Profil** — compteur de formation continue, échéances des documents
  professionnels, réglages de facturation.

Sous-écrans : fiche par pharmacie (coordonnées, contact, notes, codes d'accès),
statistiques (période et pharmacies au choix), génération de facture, historique
des factures générées.

## Stockage

| Donnée | Où | Pourquoi |
| --- | --- | --- |
| Pharmacies, quarts, documents, factures, réglages | SQLite locale (`expo-sqlite`, base `pharmacien.db`) | Requêtes par période et par pharmacie |
| Codes d'accès des pharmacies | Trousseau du système (`expo-secure-store` : Keychain sur iOS, Keystore sur Android) | Ne doivent pas se retrouver en clair dans la base |

Les codes d'accès sont enregistrés sous la clé `codes_pharmacie_<id>`, un tableau
JSON de `{ libelle, valeur }`. Supprimer une pharmacie supprime ses quarts (en
cascade), ses codes et les rappels associés.

## Modèle de données

- `pharmacies` — nom, adresse, contact principal, coordonnées du contact, notes.
- `quarts` — pharmacie, date, heure de début, heure de fin, taux horaire,
  kilométrage, notes, identifiant du rappel programmé. Une heure de fin
  antérieure à l'heure de début désigne un quart de nuit : la durée est calculée
  sur le lendemain.
- `factures` — numéro, période, pharmacies incluses, total d'heures,
  kilométrage, per diem, hébergement, total.
- `reglages` — taux par kilomètre, per diem par défaut, nom, numéro de permis
  OPQ, adresse (en-tête de facture). Une seule ligne.
- `formation_continue` — heures complétées, heures requises, fin de la période
  de référence. Une seule ligne.
- `documents` — nom, date d'expiration, nombre de jours de préavis, identifiant
  du rappel.

Le kilométrage est saisi quart par quart ; les statistiques et la facture en
font la somme sur la période retenue.

## Calculs

- **Heures** — différence entre l'heure de début et l'heure de fin, en tenant
  compte du passage à minuit.
- **Per diem** — nombre de jours distincts travaillés dans la période × montant
  par défaut des réglages.
- **Kilométrage** — somme des kilomètres saisis × taux par kilomètre des
  réglages.
- **Revenu estimé** — honoraires + kilométrage + per diem.

L'hébergement n'apparaît que sur la facture, avec un montant saisi pour
l'occasion.

## Facture

Depuis Statistiques › *Générer une facture* : période, pharmacies à inclure, et
trois interrupteurs (kilométrage, per diem, hébergement). Le PDF est produit avec
`expo-print` et partagé avec `expo-sharing`. Chaque facture générée est
conservée ; la toucher dans l'historique régénère son PDF et le repartage.

## Notifications locales

- 24 h avant le début de chaque quart.
- Avant l'expiration de chaque document professionnel, à 9 h, selon le nombre de
  jours défini pour ce document.

Les rappels sont reprogrammés à chaque modification et annulés à la suppression.

## Hors de cette version

Contenu d'information réglementaire, révision hebdomadaire, remplissage d'un
quart par IA, fonctions multi-usagers, checklist de début et de fin de quart.
