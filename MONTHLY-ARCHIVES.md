# Gestion mensuelle

Le mois courant s'ouvre automatiquement au chargement de l'application et lors du changement de mois, même si la page reste ouverte. Le sélecteur **Mois affiché** permet de consulter les mois précédents. Un mois historique choisi manuellement reste affiché jusqu'au choix d'un autre mois ou au retour au **Mois actuel**.

Aucune saisie n'est effacée au changement de mois. Tous les départements, les graphiques, la liste des saisies à compléter, les réclamations, le tri avec effectif, les affectations et l'historique utilisent le mois affiché. Les filtres supplémentaires de dates, machine, référence et OF affinent la table de production ; l'export couvre toujours le mois complet et tous les départements.

## Installation Supabase

Exécuter **supabase-monthly-archives.sql** dans le SQL Editor de la base existante. Ce script ajoute aussi le champ `headcount` des heures de tri si nécessaire. Il ne supprime aucune donnée existante.

Le schéma principal doit déjà être installé. Pour une nouvelle installation, exécuter `supabase-schema.sql`, puis `supabase-monthly-archives.sql`.

Avant cette migration, le choix du mois et l'export sont utilisables ; la clôture reste désactivée avec une indication dans l'interface. Une erreur de lecture des clôtures autre qu'une table absente bloque temporairement les modifications jusqu'à l'actualisation.

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

Les tests SQL et interface sont optionnels : définir `PGLITE_MODULE` vers `@electric-sql/pglite/dist/index.js` et `JSDOM_MODULE` vers `jsdom/lib/api.js` d'installations de test, puis lancer `node --test tests/monthly-sql.test.mjs tests/monthly-ui.test.mjs`. Ils n'utilisent jamais la configuration Supabase du projet. Le test d'interface simule le passage au 1er novembre, une nouvelle saisie, la clôture d'octobre, son réexport et sa consultation après rechargement. Les graphiques et téléchargements y sont simulés ; ce test ne remplace pas un contrôle visuel dans un navigateur.
