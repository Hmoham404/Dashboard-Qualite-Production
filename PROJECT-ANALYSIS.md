# Analyse du projet — Qualité & Production

Revue du 30 octobre 2026. Périmètre : code local, scripts SQL, compilation et tests existants. Aucune base Supabase distante n'a été interrogée ou modifiée. Le contenu des classeurs Excel n'a pas été audité.

## Conclusion

Le projet couvre des besoins métier concrets et compile correctement. Il nécessite toutefois des corrections de sécurité et de fiabilité des données avant un usage de production exposé. Les principaux risques concernent les accès anonymes prévus dans les scripts SQL, le remplacement silencieux des données par des données initiales, et des incohérences dans le parcours qualité et les dates.

## Fonctionnement et architecture

- Application React 19 et Vite, sans serveur applicatif dédié dans ce dépôt.
- Cinq départements : injection, soudure, métallisation, assemblage et sérigraphie.
- Parcours de saisie production puis contrôle qualité, avec répartition des défauts et suivi des lignes à compléter.
- Graphiques Recharts : rebut et objectif, performance, défauts, réclamations et heures de tri.
- Accès direct à Supabase depuis le navigateur ; stockage local de certaines données lorsque Supabase n'est pas configuré.
- Cinq langues déclarées : français, arabe, anglais, italien et chinois ; adaptation RTL pour l'arabe.
- Fonctions de lecture et d'export Excel présentes, mais non raccordées à l'interface actuelle.

## Constats prioritaires

### P1 — Politiques SQL sans restriction d'identité

Preuve : `supabase-schema.sql:91`, notamment les politiques production aux lignes 99–102. Elles utilisent `using (true)` ou `with check (true)` sans restriction de rôle ni de propriétaire. Aucun parcours d'authentification n'est présent dans le code examiné.

Si ces scripts sont appliqués avec les droits API habituels, un visiteur disposant de la configuration publique du client peut lire, créer, modifier et supprimer les données de production sans connexion. Les noms d'opérateurs et les réclamations sont également concernés par les politiques ouvertes. Les droits réellement déployés n'ont pas été vérifiés.

Correction : définir les utilisateurs et leurs rôles métier, puis limiter les droits SQL et les politiques RLS à chaque opération autorisée. Ajouter des tests d'accès autorisé et refusé. La clé anonyme publique côté navigateur n'est pas, en elle-même, un secret à cacher : la protection doit être imposée par la base.

Référence : [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### P1 — Données initiales affichées à la place d'une table vide ou inaccessible

Preuve : `src/main.jsx:310`. `loadTable` renvoie le cache local ou les données initiales en cas d'erreur ; une réponse vide valide renvoie aussi les données initiales. L'état initial peut afficher « Connecté à Supabase » avant toute lecture réussie.

Conséquence : une base vide peut présenter 13 anciennes saisies et une panne peut être masquée par des chiffres de repli. Les identifiants initiaux tels que `paper-injection-d2301-1` ne sont pas des UUID alors que le schéma impose des UUID ; leur sauvegarde comme lignes existantes peut échouer.

Correction : distinguer chargement, erreur, résultat vide et mode démonstration. En production, afficher explicitement les erreurs et conserver une table vide comme vide. Importer les données initiales par une procédure distincte avec identifiants valides.

### P1 — Chargement incomplet possible faute de pagination

Preuve : `src/main.jsx:312`, et chargements réclamations/tri aux lignes 496 et 510. Les requêtes chargent une seule réponse `select('*')`, puis les calculs sont faits dans le navigateur.

Conséquence : au-delà du plafond de réponse configuré sur le serveur, les graphiques et historiques peuvent omettre des lignes sans erreur visible. Supabase documente un plafond par défaut de 1 000 lignes ; la valeur de cette installation n'a pas été vérifiée.

Correction : filtrer les données à la source et paginer les historiques ; calculer les agrégats dans des vues ou fonctions SQL adaptées.

Référence : [Supabase — plafond de réponse et pagination](https://supabase.com/docs/reference/python/select).

### P2 — Export Excel non déclenché et import inaccessible

Preuve : `src/main.jsx:1139` environ. Le bouton « Exporter Excel » n'a pas de `onClick`. La fonction `exportExcel` est définie à la ligne 1029 mais n'est jamais appelée. `importExcel`, ligne 1065, n'est reliée à aucun champ de fichier dans le JSX.

Conséquence : l'utilisateur ne peut pas utiliser ces fonctions depuis l'interface. Le bouton « Appliquer » n'a pas non plus de gestionnaire, tandis que les filtres changent immédiatement.

Correction : connecter l'export, exposer un import avec validation et gestion d'erreur, puis clarifier le comportement des filtres.

### P2 — Dates décalées par la conversion UTC

Preuve : `src/main.jsx:242` et `src/main.jsx:716`. Des dates construites à minuit en heure locale sont transformées avec `toISOString().slice(0, 10)`.

Reproduction sous `Africa/Lagos` : `new Date(2026, 9, 1)` représente le 1er octobre à minuit local ; sa conversion ISO donne la clé `2026-09-30`. Le début de filtre mensuel et certaines bornes de graphiques peuvent donc tomber la veille.

Correction : utiliser la fonction existante `localDateKey` pour les dates civiles, de manière cohérente dans les filtres, formulaires, semaines et mois.

### P2 — Statut incohérent des saisies qualité seules

Preuve : `src/main.jsx:277`, `src/main.jsx:791` et `src/main.jsx:957`. `completionStatus` dispense les lignes marquées qualité seule des champs production. Le calcul de `incompleteEntries` applique toujours `validateProduction`. Le marqueur n'est ajouté à la sauvegarde qualité que lorsque le formulaire n'a pas d'identifiant ; `editProduction` enlève ce marqueur de la note éditable.

Reproduction sur les fonctions extraites du code : une ligne qualité seule avec référence article et zéro rebut obtient `{ status: 'Complete', missingFields: [] }`, mais le prédicat de la liste la classe comme incomplète. Une sauvegarde ultérieure peut aussi perdre son marqueur.

Correction : stocker explicitement le type de saisie et centraliser la validation et le calcul du statut.

### P2 — La reprise en production efface les métadonnées qualité

Preuve : `src/main.jsx:910`. Lors de `saveProductionService`, le payload remplace `note` par une chaîne vide et force le statut « Qualité à compléter », même pour une ligne existante chargée avec ses données qualité.

Conséquence : modifier la partie production d'une ligne déjà renseignée supprime sa référence article et sa note qualité encodées dans `note`. Le détail JSON des défauts est conservé dans la colonne dédiée s'il existe, mais le contenu historique de la note est perdu.

Correction : préserver les données qualité lors des modifications production ; si une nouvelle validation est nécessaire, la représenter séparément sans effacer les observations.

### P2 — Traduction incomplète, test existant en échec

Preuve : `tests/i18n.test.mjs:33` et `src/main.jsx:1249`. Le test échoue sur le texte JSX brut « Target du département : ». D'autres sections réclamations, tri et fenêtres contiennent des libellés français directs.

Correction : ajouter les messages manquants aux dictionnaires et passer les libellés par `t()`, puis relancer le test.

## Maintenabilité et performances

- `src/main.jsx` compte 1 531 lignes et regroupe accès aux données, validation, calculs, formulaires et présentation. Extraire d'abord les services de données et les règles métier, puis les composants de saisie et de graphiques.
- La compilation produit un bloc JavaScript principal de 1 004,35 kB, soit 274,42 kB gzip. Vite émet un avertissement de taille. Charger Excel à la demande et séparer les vues peut réduire le téléchargement initial.
- Le dépôt suit 13 131 fichiers sous `node_modules`, ainsi que `dist` et `.env`, sans `.gitignore` suivi. Nettoyer le suivi des dépendances et des sorties générées ; vérifier la nature des valeurs de `.env` avant de partager le dépôt. Le contenu de `.env` n'a pas été affiché pendant cette revue.
- `package.json` ne propose ni commande de test ni lint. Les tests importent des dépendances Babel transitives sans les déclarer directement.
- Les graphiques ne suivent pas tous les filtres globaux : la table utilise `filtered`, tandis que plusieurs graphiques calculent leurs séries depuis `entries`. Définir explicitement les périodes et filtres de chaque panneau.

## Vérification réalisée

- `npm run build` : réussite ; avertissement de taille du JavaScript. Le premier lancement a été bloqué par le bac à sable, puis le lancement avec les permissions nécessaires a réussi.
- `node --test tests/i18n.test.mjs` : 4 tests, 3 réussites, 1 échec de traduction.
- Reproductions isolées sur les fonctions réelles extraites du code : décalage de date sous Lagos et statut qualité seule contradictoire.
- Revue statique du raccordement des boutons, des lectures et sauvegardes et des politiques SQL.
- Les fichiers générés par la compilation ont été remis dans leur état initial. Aucun correctif applicatif ni changement de base n'a été effectué.

## Ordre de correction conseillé

1. Restreindre les accès à la base et tester les droits.
2. Retirer le repli silencieux vers les données initiales et rendre les lectures complètes.
3. Corriger dates, statuts et préservation des notes qualité.
4. Raccorder Excel et terminer les traductions.
5. Structurer les modules, réduire le bundle et nettoyer le dépôt ; ajouter des tests ciblés sur les parcours métier corrigés.
