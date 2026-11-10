# Gestion mensuelle

Le mois courant s'ouvre automatiquement au chargement de l'application et lors du changement de mois, même si la page reste ouverte. Le sélecteur **Mois affiché** permet de consulter les mois précédents. Un mois historique choisi manuellement reste affiché jusqu'au choix d'un autre mois ou au retour au **Mois actuel**.

Le calendrier **Date à analyser** du graphique **Rebuts par jour** permet aussi de choisir directement une date d'un mois précédent. Le mois affiché suit cette date et le jour choisi reste sélectionné. **Cumul** affiche ensuite tous les jours de ce mois. Les mois futurs restent indisponibles.

Aucune saisie n'est effacée au changement de mois. Tous les départements, les graphiques, la liste des saisies à compléter, les réclamations, le tri avec effectif, les affectations et l'historique utilisent le mois affiché. Les filtres supplémentaires de dates, machine, référence et OF affinent la table de production. Le filtre **Client** général s'applique aux données de production et de qualité de tous les départements : tableaux, graphiques, historique, saisies à compléter et affectations issues de la production. Le tri dispose de ses propres filtres département et client ; les réclamations restent globales. L'export et la clôture couvrent toujours le mois complet, tous les clients et tous les départements, même lorsqu'un client est sélectionné.

Le graphique **Rebuts par jour** propose aussi un sélecteur **Client**, synchronisé avec le filtre général. Il contient **Tous** et les clients présents dans les saisies du mois affiché, sans doublons. La sélection s’applique au cumul journalier, au détail par défaut du jour choisi et à l’évolution mensuelle ouverte depuis un défaut. **Tous** inclut les saisies sans client ; un client dont le nom est « Tous » reste une option distincte. Le changement de mois actualise la liste et revient à tous les clients, comme le filtre général.

Les noms qui diffèrent seulement par les majuscules, les minuscules ou les espaces sont regroupés : `kiko`, `Kiko` et `KIKO` donnent une seule option **KIKO** qui inclut les données des trois écritures. Les noms enregistrés et les archives restent conservés tels quels.

## Installation Supabase

Exécuter **supabase-monthly-archives.sql** dans le SQL Editor de la base existante. Ce script ajoute aussi le champ `headcount` des heures de tri si nécessaire. Il ne supprime aucune donnée existante.

Le schéma principal doit déjà être installé. Pour une nouvelle installation, exécuter `supabase-schema.sql`, puis `supabase-monthly-archives.sql`.

Avant cette migration, le choix du mois et l'export sont utilisables ; la clôture reste désactivée avec une indication dans l'interface. Une erreur de lecture des clôtures autre qu'une table absente bloque temporairement les modifications jusqu'à l'actualisation.

## Opérations de tri par client

Pour une base existante, exécuter **`supabase-sorting-operations.sql`**, puis actualiser tous les postes utilisant l'application. La migration ajoute le client, la référence et le lot, et retire l'ancienne unicité date/département. Les anciennes lignes conservent leur identifiant, leurs heures, leur effectif et leurs quantités. Leur client reste **Client non renseigné** jusqu'à une attribution explicite ; les archives clôturées ne sont pas réécrites. Les scripts `supabase-schema.sql`, `supabase-sorting-hours.sql` et `supabase-install-complete.sql` incluent cette évolution pour les installations suivantes.

**Ajouter un tri** crée une opération distincte : date, département, client obligatoire pour une nouvelle opération, durée en heures, effectif, quantités bonnes et rebutées. Le formulaire ne demande ni référence produit ni numéro de lot. **Enregistrer et ajouter un autre tri** conserve la date, le département et le client pour poursuivre la saisie. Plusieurs opérations d'un même client, jour et département sont permises. **Modifier** agit uniquement sur l'identifiant de l'opération choisie ; une erreur réseau conserve les valeurs saisies et une nouvelle tentative garde le même identifiant.

Le graphique affiche une barre par jour, empilée par client, et une courbe de cumul mensuel sur l'axe de droite. Les jours sans opération sont présents à zéro ; le cumul conserve le total atteint. Les filtres **Département** et **Client / Tous** sont propres au tri et s'appliquent au graphique, aux indicateurs et au détail. Les variantes `kiko`, `Kiko` et `KIKO` sont regroupées. Un clic sur un jour ou **Jour à consulter** affiche ses opérations ; **Tout le mois** réaffiche la liste mensuelle.

Le tableau et le formulaire ne présentent pas de référence ni de numéro de lot. Au survol du graphique, le détail de chaque opération du jour indique le client, le département, la durée, l'effectif et les quantités. Les références et lots historiques restent conservés lors des modifications et visibles au survol et dans l'export Excel lorsqu'ils sont renseignés.

Les heures-personnes sont calculées opération par opération : durée × effectif. Les effectifs ne sont pas additionnés pour produire un nombre de personnes uniques. Un ancien effectif non renseigné reste inconnu ; le total des heures-personnes est signalé comme partiel, ou affiché « — » si tous les effectifs sont inconnus. La feuille Excel **Heures de tri** inclut chaque opération avec son client, sa référence, son lot et ses heures-personnes. Les exports et clôtures conservent toutes les opérations, même si un filtre est actif. Les mois clôturés restent consultables et leur modification est bloquée dans l'interface et en base.

## Clôturer un mois

1. Sélectionner un mois terminé, par exemple octobre à partir du 1er novembre.
2. Vérifier les données et les éventuelles saisies encore à compléter.
3. Cliquer **Clôturer le mois**, puis **Exporter et clôturer** dans la fenêtre de validation.

La base archive les lignes du mois dans une transaction et bloque ensuite les ajouts, modifications et suppressions de ce mois sur les quatre tables datées. Un déplacement de ligne depuis un mois clôturé vers un mois ouvert est également refusé. Les données restent dans leurs tables d'origine et l'archive garde leur état à la clôture. La clôture ne dépend pas d'un export calculé depuis une liste tronquée dans le navigateur.

Le fichier `bilan_AAAA-MM.xlsx` contient cinq feuilles : bilan, production, heures de tri avec effectif, réclamations et affectations MOD. Pour un mois clôturé, les réexports utilisent l'archive conservée. Si le téléchargement échoue après clôture, **Exporter le mois** permet de réessayer.

Le bouton n'autorise pas la clôture du mois courant ou d'un mois futur. Aucune réouverture n'est proposée dans l'interface.

Le script reprend le modèle d'accès anonyme existant pour appeler la clôture ; les archives sont consultables mais non modifiables par l'API. Lors de l'ajout de comptes utilisateurs, limiter l'exécution de `close_production_month` aux responsables autorisés. Les fonctions SQL utilisent un `search_path` vide et des noms de tables qualifiés.

## Mode local

Sans Supabase, les clôtures et leurs instantanés sont conservés dans le stockage du navigateur. Le verrouillage ne concerne que ce navigateur et n'est pas partagé entre postes. Conserver l'export Excel comme copie extérieure au navigateur. Les saisies de tri et les réclamations continuent de nécessiter Supabase, conformément au fonctionnement existant.

## Références techniques

- [Supabase : fonctions de base de données](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL : verrouillage explicite](https://www.postgresql.org/docs/current/explicit-locking.html)

## Vérification

Les tests `monthly.test.mjs` couvrent les dates civiles, les limites de mois, la conservation d'octobre, le filtrage et les chargements paginés. `monthlyExport.test.mjs` vérifie le fichier Excel, y compris les effectifs inconnus ou nuls et la référence article.

`sortingOperations.test.mjs` vérifie les opérations multiples, les filtres, les cumuls, les heures-personnes et les validations. `sortingOperations-ui.test.mjs` couvre la saisie de plusieurs clients le même jour, la modification isolée, une erreur réseau, le rechargement et le verrouillage. `sortingOperations-sql.test.mjs` teste l'évolution d'une ancienne base, les réapplications des installateurs, les archives antérieures et la clôture d'un mois contenant plusieurs tris. Ils utilisent les mêmes modules de test optionnels ci-dessous ; aucun test ne lit `.env` ou n'accède à Supabase.

Les tests SQL et interface sont optionnels : définir `PGLITE_MODULE` vers `@electric-sql/pglite/dist/index.js` et `JSDOM_MODULE` vers `jsdom/lib/api.js` d'installations de test, puis lancer `node --test tests/monthly-sql.test.mjs tests/monthly-ui.test.mjs`. Ils n'utilisent jamais la configuration Supabase du projet. Le test d'interface simule le passage au 1er novembre, une nouvelle saisie, la clôture d'octobre, son réexport et sa consultation après rechargement. Les graphiques et téléchargements y sont simulés ; ce test ne remplace pas un contrôle visuel dans un navigateur.
