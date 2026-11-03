# Analyse du projet — Qualité & Production

Revue actualisée le 3 novembre 2026. Périmètre : code local, scripts SQL, compilation et tests. Aucun accès à la base distante, aucune migration ni modification applicative. Les classeurs sources et l’interface dans un navigateur n’ont pas été audités.

## État général

Le projet fournit une base exploitable pour poursuivre le développement. La compilation réussit ; les tests des règles mensuelles, des exports et des seuils de rebut passent. Les accès aux données et la conservation des informations qualité restent prioritaires.

Cette revue remplace celle du 30 octobre : l’absence de pagination, le repli silencieux des lectures Supabase vers les données initiales, l’export non raccordé et les dates mensuelles décalées ne décrivent plus le code actuel.

## Fonctionnement et points d’entrée

Application React 19 et Vite, avec Recharts, Lucide, SheetJS et client Supabase. Le navigateur dialogue directement avec la base ; aucun serveur applicatif distinct n’est présent dans ce dépôt.

Cinq départements : injection, soudure, métallisation, assemblage et sérigraphie. Fonctions : saisie production, contrôle qualité, défauts, rebuts, réclamations, tri avec effectif, affectations MOD, historique, sélection mensuelle, export Excel et clôture avec instantané. Cinq langues sont déclarées, avec RTL pour l’arabe ; certains textes restent en français.

- `src/main.jsx` : interface principale, accès aux données, sauvegardes et règles métier.
- `src/monthly.js` : dates civiles, filtrage mensuel, verrouillage local et pagination.
- `src/monthlyExport.js` : classeur mensuel à cinq feuilles.
- `src/scrapRate.js` : objectifs et couleurs des taux de rebut.
- `src/i18n.js`, `src/LanguageSwitcher.jsx`, `src/LiveClock.jsx` : traduction et composants transversaux.
- `supabase-schema.sql` et migrations : tables, politiques d’accès et archives. Documentation complémentaire : `MONTHLY-ARCHIVES.md`.

Sans Supabase, le mode local reste partiel : production et clôtures utilisent localStorage ; sauvegarde qualité, réclamations et heures de tri exigent Supabase. La présence d’une configuration ne prouve pas que la connexion distante fonctionne.

## Constats prioritaires

### P1 — Droits anonymes dans les scripts SQL

Preuves : `supabase-schema.sql:93–123` et `supabase-monthly-archives.sql:90`.

Les politiques utilisent `using (true)` et `with check (true)`. La fonction `close_production_month`, déclarée `security definer`, est exécutable par `anon` : un client anonyme peut clôturer un mois terminé si cette migration est déployée. Les opérations possibles sur les tables dépendent aussi des droits SQL actifs. Aucun parcours d’authentification n’a été trouvé ; les droits réellement déployés restent inconnus.

Action : définir les rôles métier, restreindre les politiques et l’exécution de la clôture, puis tester les accès autorisés et refusés sur une base isolée.

### P1 — Une reprise production efface les informations qualité

Preuve : `src/main.jsx:964–1002`, fonction `saveProductionService`.

Le payload force `note: ''` et le statut « Qualité à compléter », même pour une ligne existante. La référence article et les observations sont encodées dans cette note : une modification production les efface. La colonne dédiée aux défauts reste dans le payload ; les informations présentes uniquement dans la note disparaissent.

Action : préserver les informations qualité existantes et représenter séparément une éventuelle demande de revalidation.

### P2 — Le type « qualité seule » disparaît à la modification

Preuves : `src/main.jsx:153`, `:938` et `:1034`.

`extractQualityNote` retire le marqueur `SAISIE_QUALITE_SEULE`. L’édition utilise cette note nettoyée, puis la sauvegarde ne réintroduit le marqueur que pour une nouvelle ligne sans identifiant. Une ligne qualité seule modifiée peut perdre son exemption de validation production et redevenir incomplète.

Le calcul de la liste des lignes incomplètes utilise désormais `completionStatus` (`:859`) : l’ancien défaut de classement n’est plus présent sous la même forme.

Action : conserver explicitement le type de saisie et centraliser le calcul du statut.

### P2 — Traductions incomplètes

Le test `tests/i18n.test.mjs:33` échoue sur le texte JSX brut « Target du département : ». Plusieurs sections réclamations, tri et fenêtres contiennent aussi des textes français directs.

Action : compléter les dictionnaires et appliquer `t()` aux textes et attributs concernés.

### P2 — Import Excel inaccessible

`importExcel` est défini à `src/main.jsx:1174`, mais aucun appel depuis l’interface ni champ de fichier associé n’a été trouvé. L’export mensuel est désormais raccordé (`:1243`) et sa structure est testée.

Action : exposer l’import selon le besoin métier, avec validation des colonnes, aperçu et gestion d’erreur.

## Progrès vérifiés

- `loadTable` utilise `readAllRows` avec Supabase et laisse remonter les erreurs. Une table distante vide reste vide.
- La pagination couvre les tables principales, réclamations, tri et métadonnées de clôture ; ses tests passent.
- Les fonctions de dates civiles et le test au fuseau Africa/Lagos passent.
- Les indicateurs principaux utilisent les lignes du mois sélectionné. Les filtres supplémentaires affinent la table, conformément à `MONTHLY-ARCHIVES.md`.
- L’export mensuel conserve les en-têtes pour un mois vide et distingue effectif inconnu et effectif nul.
- La migration d’archives prévoit une transaction, des verrous et des déclencheurs sur quatre tables datées. Son exécution réelle n’a pas été vérifiée pendant cette revue.

## Maintenabilité

- `src/main.jsx` concentre formulaires, graphiques, règles métier et opérations de données. Extraire d’abord sauvegardes et validations facilitera les correctifs ciblés.
- Chaque changement de mois recharge les historiques complets avant filtrage local. Ajouter des filtres serveur et des agrégats lorsque le volume le justifie.
- Le bundle principal mesure 1 311,95 kB, soit 377,94 kB gzip. Vite signale sa taille ; le chargement différé d’Excel et des vues est une piste à mesurer.
- Git suit 13 131 fichiers de `node_modules`, ainsi que `dist` et `.env`, sans `.gitignore` à la racine. Le contenu de `.env` n’a pas été affiché ni évalué.
- `package.json` ne fournit ni commande de test ni lint. Les tests utilisent Babel et esbuild comme dépendances transitives. Les paquets optionnels jsdom et PGlite sont absents du projet.

## Vérification du 3 novembre 2026

- `node --test tests/*.test.mjs` : **18 tests, 15 réussites, 1 échec, 2 ignorés**. Échec de traduction décrit ci-dessus. Tests SQL et interface ignorés car `PGLITE_MODULE` et `JSDOM_MODULE` ne sont pas définis ; les paquets correspondants sont absents.
- `node node_modules/vite/bin/vite.js build --outDir .analysis-build` : **réussite**, avertissement de taille. Premier essai limité par les permissions du bac à sable ; compilation autorisée réussie. Sortie isolée puis supprimée, sans remplacer `dist`.
- Les constats de sauvegarde et de droits SQL résultent d’une lecture statique du code. Aucun correctif fonctionnel ni contrôle de la base distante n’a été réalisé.

## Ordre de travail proposé

1. Préserver les notes et le type de saisie lors des modifications production et qualité, avec tests ciblés.
2. Définir les rôles et sécuriser les accès Supabase et la clôture avant exposition en production.
3. Corriger les traductions et rendre les tests reproductibles via les scripts du projet.
4. Raccorder l’import selon le besoin, extraire les modules et réduire le chargement initial.

Démarrage : `npm run dev`. Vérifications : `node --test tests/*.test.mjs` puis `npm run build`.
