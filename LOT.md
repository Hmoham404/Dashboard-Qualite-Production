# Contrôle des lots

Le bouton rose **LOT** ouvre une page dédiée (`#lot`). Le retour au tableau de bord conserve ses filtres. La page LOT suit la langue sélectionnée dans le tableau de bord.

## Saisie

Renseigner en haut le département, l’OF, la date de contrôle, la référence produit et le client. La ligne de saisie contient le numéro du lot, sa quantité, l’échantillonnage, la décision, le défaut, l’action et le nom du qualiticien.

- Tous les renseignements de contexte, le numéro de lot, les quantités, la décision et le qualiticien sont obligatoires.
- Les quantités sont des entiers positifs. L’échantillon ne peut pas dépasser la quantité du lot.
- **OK** apparaît en vert. Le lot entier est conforme ; le défaut et l’action sont vidés.
- **NOK** apparaît en rouge. Le lot entier est bloqué ; un défaut et une action **Tri**, **Rebut** ou **Dérogation** sont obligatoires.
- L’action enregistre la disposition choisie. Elle ne transforme pas automatiquement une décision NOK en OK, y compris pour une dérogation. Modifier explicitement la décision après une nouvelle validation.
- Un même lot ne peut pas être enregistré deux fois pour le même département, OF, référence et client. Utiliser **Modifier** pour corriger le contrôle existant ; son identifiant est conservé.

Le tableau et le graphique montrent les contrôles enregistrés du département et du mois sélectionnés. Les autres champs du haut renseignent le contrôle en cours ; les OF, références, clients et dates des contrôles enregistrés sont rappelés sous leur numéro de lot.

## Rapports d’anomalie

Pour un contrôle NOK, **Rapport d’anomalie** apparaît directement dans la colonne **Actions**, dès le choix NOK dans la ligne de saisie et sur les contrôles NOK enregistrés. Ce bouton ouvre une page dédiée. Dans la ligne en cours, il enregistre d’abord le contrôle, puis ouvre le rapport ; les mêmes validations de lot restent applicables.

La référence, l’OF, la date, le département, le client, le numéro de lot, le défaut et le qualiticien sont repris automatiquement. Compléter la cause racine, l’action immédiate, son efficacité, l’action corrective et son efficacité. **Enregistrer le rapport** permet de reprendre le document plus tard. **Enregistrer et télécharger le PDF** conserve d’abord le rapport, puis télécharge le fichier. Si le téléchargement échoue, le rapport enregistré reste disponible.

Les cinq descriptions sont des champs libres obligatoires, avec une indication du contenu attendu. Les efficacités se décrivent séparément des actions. En cas de champ manquant, il est signalé et le premier champ à compléter reçoit le focus ; les informations du lot restent préremplies en lecture seule.

Un rapport est conservé dans `lot_inspections.anomaly_report` (ou avec le lot dans le stockage local). Son identité et ses informations initiales sont préservées lors des modifications ; un passage ultérieur du lot à OK conserve le rapport et son accès. Une sauvegarde de rapport partagé ne réécrit pas les quantités du lot et vérifie que le contrôle n’a pas été modifié depuis son ouverture.

Pour une base existante, exécuter `supabase-lot-anomaly-reports.sql` après la migration LOT. Ce script ajoute la colonne et valide les rapports sans supprimer les lots existants. Les rapports font partie du transfert des contrôles locaux. Le PDF utilise la police libre Noto Sans (licence dans `src/assets/fonts/OFL.txt`) pour les textes français et leurs accents.

## Graphique

Deux histogrammes **Bilan du jour**, placés au-dessus du formulaire, affichent le département sélectionné : le **nombre de lots** contrôlés, acceptés (OK) et rejetés (NOK), puis les **quantités des lots** correspondantes. Chaque contrôle enregistré compte pour un lot ; les quantités additionnent les lots entiers, sans utiliser l’échantillonnage. Une dérogation reste comptée en NOK tant que la décision n’est pas explicitement modifiée.

Le jour actuel est sélectionné par défaut dans le mois courant. **Jour à analyser** permet de consulter une autre date du mois affiché, indépendamment de la date du formulaire ; **Aujourd’hui** revient au jour et au mois actuels. Un mois historique commence au premier jour du mois. Les histogrammes se mettent à jour après enregistrement, modification ou transfert des contrôles. Un jour sans contrôle affiche zéro et un message explicite. Les totaux et la courbe mensuels restent disponibles sous le formulaire.

Les courbes journalières additionnent les quantités des lots : quantité contrôlée = lots OK + lots NOK ; quantité conforme = lots OK ; quantité bloquée = lots NOK. L’échantillonnage ne sert pas à extrapoler un taux de défaut. Les jours sans contrôle sont affichés à zéro pour conserver une courbe continue.

Directement sous le tableau et son formulaire, **Évolution des blocages** affiche une courbe rouge dédiée à la quantité des lots NOK de chaque jour du mois affiché, pour le département sélectionné. Le mois courant est affiché par défaut ; les mois précédents restent consultables. Tous les jours, du premier au dernier, sont affichés sur l’axe horizontal, y compris les jours sans blocage à zéro. Sur petit écran, le graphique défile horizontalement pour conserver tous les jours lisibles. Le total mensuel et les valeurs positives sont indiqués ; une modification NOK vers OK retire la quantité du jour concerné. Il s’agit des décisions actuellement enregistrées par date de contrôle, pas d’un historique des changements de statut ni d’un stock cumulé.

## Supabase et stockage local

Exécuter `supabase-lot-inspections.sql` dans le SQL Editor Supabase, puis actualiser la page LOT. Le script crée la table indépendante `public.lot_inspections`, ses contraintes et ses politiques de lecture, insertion et modification. Il peut être réappliqué sans supprimer les contrôles existants. Il reprend les rôles API actuels de l’application (`anon` et `authenticated`) et n’expose pas de suppression.

Sans configuration Supabase, ou si la nouvelle table n’est pas encore installée, la page signale **Sauvegarde locale** : les contrôles sont conservés uniquement dans ce navigateur, sous la clé `quality_lot_inspections_v1`. Une erreur réseau ou d’accès à une table existante bloque l’enregistrement partagé ; elle n’active pas silencieusement le mode local.

Après installation de la table, **Transférer … contrôle(s) local(aux)** permet de copier les contrôles locaux dans Supabase. Les identifiants sont conservés ; le stockage local n’est nettoyé qu’après confirmation des identifiants enregistrés. Une éventuelle erreur doit être vérifiée avant une nouvelle tentative.

Les contrôles LOT sont indépendants des saisies de production : ils ne modifient pas leurs quantités. Les archives, clôtures et exports mensuels de production n’incluent pas cette nouvelle table.

## Vérification

`node --test tests/lotInspections.test.mjs` vérifie la validation, les calculs, le stockage local, le mode sans table et le transfert.

Les tests optionnels utilisent `JSDOM_MODULE` (vers `jsdom/lib/api.js`) et `PGLITE_MODULE` (vers `@electric-sql/pglite/dist/index.js`) : `node --test tests/lotInspections-ui.test.mjs tests/lotInspections-sql.test.mjs`. Ils n’accèdent jamais à Supabase. La géométrie des graphiques est simulée dans le test d’interface.
