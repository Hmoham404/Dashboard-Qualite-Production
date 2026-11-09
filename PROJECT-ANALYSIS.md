# Analyse du projet — Qualité & Production

Revue actualisée le **9 novembre 2026**, pour préparer la suite du développement.

Périmètre : code local, migrations SQL, modifications Git en cours, tests et compilation isolée. Aucun accès à Supabase, aucune migration appliquée, aucune modification applicative. Le contenu de `.env`, les classeurs sources, le rendu navigateur et le rendu PDF n'ont pas été examinés. Les modifications préexistantes sont conservées.

## État général

Le projet dispose d'une base fonctionnelle étendue et compile. Résultat des tests : **36 tests, 28 réussites, 1 échec, 7 ignorés**. L'état réel des migrations et des droits de la base distante reste inconnu.

Des modifications en cours concernent LOT, les rapports d'anomalie, le PDF, les traductions, les styles et les dépendances. Plusieurs nouveaux fichiers sont encore non suivis par Git et devront faire partie d'une livraison complète.

## Architecture et périmètre fonctionnel

Application React 19 et Vite, avec accès direct à Supabase depuis le navigateur, Recharts, Lucide, SheetJS et jsPDF. Aucun serveur applicatif distinct dans le dépôt. Environnement vérifié : Node 24.14.1, npm 11.11.0 ; Vite installé : 7.3.6.

Cinq départements : injection, soudure, métallisation, assemblage et sérigraphie. Fonctions : production, contrôle qualité, défauts et rebuts, réclamations, tri avec effectif, affectations MOD, historique, filtre client, export Excel mensuel à cinq feuilles et clôture avec instantané.

La page `#lot` gère les contrôles OK/NOK, les actions Tri/Rebut/Dérogation, la modification et les quantités journalières. Un lot NOK peut recevoir un rapport avec cause racine, action immédiate, action corrective et leurs efficacités. La sauvegarde précède le téléchargement PDF. Les contrôles LOT et leurs rapports sont indépendants des archives et exports mensuels de production.

Cinq langues sont déclarées : français, anglais, arabe, italien et chinois, avec RTL pour l'arabe. Certains textes restent en français.

### Points d'entrée

- `src/main.jsx` : tableau de bord, formulaires, graphiques et opérations de données ; environ 104 ko et de nombreuses responsabilités regroupées.
- `src/monthly.js`, `src/monthlyExport.js` : calendrier civil, pagination, archives locales et classeur mensuel.
- `src/qualityNote.js`, `src/productionFilters.js` : métadonnées qualité historiques et filtre client.
- `src/scrapRate.js`, `src/defectEvolution.js`, `src/DefectEvolutionDialog.jsx` : objectifs et évolution des défauts.
- `src/LotWorkspacePage.jsx`, `src/lotInspections.js` : interface LOT, validation, stockage et transfert.
- `src/AnomalyReportPage.jsx`, `src/anomalyReports.js`, `src/anomalyReportPdf.js` : formulaire, sauvegarde et génération PDF.
- `src/i18n.js`, `src/styles.css` : traductions et styles partagés.
- `supabase-*.sql`, `LOT.md`, `MONTHLY-ARCHIVES.md` : schéma, migrations et documentation métier.

### Configuration et mode local

Variables attendues : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, documentées dans `.env.example`. Leur présence ne prouve pas la connexion distante.

Sans Supabase, production et clôtures utilisent localStorage ; les sauvegardes qualité, réclamations et tri exigent Supabase (`src/main.jsx:694`, `:735`, `:1020`). LOT dispose de son propre mode local, aussi utilisé si sa table manque. Une erreur réseau sur une table LOT existante ne déclenche pas silencieusement ce repli.

## Constats prioritaires

### P1 — Accès anonymes ouverts dans les scripts SQL

Preuves : `supabase-schema.sql:93–123`, `supabase-lot-inspections.sql:33–41`, `supabase-monthly-archives.sql:54–90`.

Les politiques utilisent largement `using (true)` et `with check (true)`. LOT accorde explicitement lecture, insertion et modification à `anon` et `authenticated`. La fonction de clôture, déclarée `security definer`, est exécutable par ces deux rôles. Aucun parcours d'authentification utilisateur n'a été trouvé.

Ces scripts prévoient un accès anonyme étendu s'ils sont déployés ainsi ; les droits effectivement installés restent inconnus. Avant exposition en production partagée : définir les rôles métier, adapter les politiques et la clôture, puis tester les accès autorisés et refusés sur une base isolée.

### P1 — Une édition de lot peut écraser un rapport plus récent

Preuves : `src/lotInspections.js:26–33`, `:82–99`, `src/anomalyReports.js:42–54`.

La sauvegarde d'un rapport compare `updated_at` et ne modifie que le rapport et son horodatage. La modification d'un contrôle LOT envoie en revanche une ligne complète, avec son ancienne copie éventuelle du rapport, sans comparer la version. Un onglet ou poste resté sur une ancienne version peut donc remplacer un rapport modifié entre-temps. Le transfert local utilise aussi un upsert complet ; son comportement concurrent doit être défini.

Reproduction **confirmée en mémoire** : création du lot et du rapport, modification de la cause depuis une première copie, puis modification de l'échantillon depuis une copie ancienne ; l'ancienne cause remplace la nouvelle. Aucune donnée réelle utilisée. Le chemin distant présente le même risque à la lecture du code, sans avoir été exécuté contre Supabase.

Action : vérifier la version lors des modifications de contrôle et limiter les champs écrits. Tester le conflit entre édition du lot et édition du rapport, ainsi que le transfert local.

### P2 — Traductions incomplètes et test en échec

Preuves : `tests/i18n.test.mjs:33`, `src/main.jsx:1404–1440`.

Le contrôle JSX échoue sur « Target du département : ». D'autres textes du graphique, des réclamations et des fenêtres restent écrits directement en français. La complétude des dictionnaires passe, mais le contrôle JSX actuel ne parcourt que `main.jsx`.

Action : traduire textes et attributs restants puis étendre la vérification aux composants concernés, en préservant les valeurs métier des options.

### P2 — Tests partiellement reproductibles

`package.json` propose `dev`, `build` et `preview`, sans commande de test ni lint. Les tests utilisent Babel et esbuild via des dépendances transitives. jsdom et PGlite sont absents, et `JSDOM_MODULE` / `PGLITE_MODULE` ne sont pas configurés pour cette exécution.

Les 7 tests ignorés concernent **3 tests SQL et 4 tests d'interface**. Une compilation réussie ne valide pas ces parcours.

Action : déclarer les dépendances de test et fournir des commandes reproductibles pour les tests métier, interface et SQL.

### P2 — Hygiène du dépôt

Git suit **13 131 fichiers de `node_modules`**, trois fichiers de `dist` et `.env`. Aucun `.gitignore` à la racine. Le contenu de `.env` n'a pas été examiné : ce constat ne démontre pas la présence d'un secret privilégié.

Action : préparer un nettoyage Git conservant les fichiers locaux, ignorer dépendances, sorties de build et configuration locale, puis vérifier les types de clés avant publication. Préserver les modifications en cours.

### P3 — Import Excel et maintenabilité

`importExcel` existe (`src/main.jsx:1188`), sans appel d'interface ni champ de fichier associé trouvé. Les deux classeurs présents à la racine n'ont pas été analysés.

Le bundle principal compilé mesure **1 368,60 ko**, soit **395,11 ko gzip** ; Vite signale sa taille. jsPDF est déjà importé dynamiquement. Excel et les vues principales sont des pistes de découpage. Plusieurs chargements relisent les historiques complets avant filtrage local.

Action : confirmer le besoin d'import avant de le raccorder avec aperçu et validation ; extraire progressivement sauvegardes et règles métier de `main.jsx`, puis mesurer les volumes et le chargement avant optimisation.

## Corrections déjà présentes depuis l'analyse du 3 novembre

Deux anciens constats ne décrivent plus le code actuel :

- La modification production préserve la note enregistrée (`src/main.jsx:1003`), donc référence article, client et observations encodés dans cette note. Elle remet encore explicitement la ligne en attente qualité ; cette règle reste à confirmer avec le fonctionnement métier attendu.
- La sauvegarde qualité réintroduit le marqueur « qualité seule » pour une ligne existante qui le possède (`src/main.jsx:1048`).

Restent également présents : pagination et remontée des erreurs de lecture, dates civiles, export mensuel stable même pour un mois vide, distinction entre effectif inconnu et nul, filtre client, évolution des défauts et validations LOT. Les tests métier correspondants passent.

## Vérifications du 9 novembre 2026

- `node --test tests/*.test.mjs` : **36 tests, 28 réussites, 1 échec, 7 ignorés**. Échec de traduction ; tests optionnels non exécutés faute des modules configurés.
- Compilation standard vers `tmp/project-review-build-2026-11-09` : premier essai bloqué par les permissions de lecture du chargeur de configuration esbuild.
- `node node_modules/vite/bin/vite.js build --configLoader native --outDir tmp/project-review-build-2026-11-09` : **réussite**, 2 565 modules transformés, avertissement de taille. Le chargeur natif évite cette limitation sans élargir les permissions ni modifier la configuration. `dist` n'a pas été remplacé.
- Reproduction du conflit LOT : **confirmée en stockage mémoire isolé**, sans écriture de données applicatives.

Limites : aucun contrôle navigateur, rendu PDF, test SQL exécuté ou accès distant ; aucun audit des classeurs ni du contenu de `.env`.

## Ordre de travail conseillé

1. Rendre les tests reproductibles et corriger les traductions en échec pour établir une référence fiable.
2. Protéger les modifications LOT contre les conflits, avec un test de non-régression sur les rapports.
3. Définir les rôles métier et sécuriser Supabase avant exposition partagée en production.
4. Nettoyer le suivi Git en préservant les fichiers locaux et inclure tous les nouveaux fichiers nécessaires aux rapports.
5. Vérifier visuellement LOT et les PDF, puis traiter la prochaine fonctionnalité ; extraire progressivement les responsabilités de `main.jsx`.

Démarrage : `npm run dev`. Tests actuels : `node --test tests/*.test.mjs`. Compilation standard : `npm run build` ; dans le bac à sable observé, employer le chargeur natif comme indiqué ci-dessus.
