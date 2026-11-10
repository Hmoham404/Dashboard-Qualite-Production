# Calendrier des réclamations clients

Le calendrier remplace la courbe quotidienne 0/1. Chaque case affiche le nombre réel de réclamations du jour, y compris plusieurs enregistrements sur une même date. Les semaines commencent le lundi et les mois de 28 à 31 jours sont pris en compte.

Trois indicateurs présentent le total du mois, le nombre de jours concernés et l’écart avec le mois précédent complet. Le pourcentage d’écart est affiché uniquement si le mois précédent contient au moins une réclamation. Les données de chargement indisponibles ne sont pas présentées comme des zéros.

Un clic sur une date filtre la liste ; il n’ouvre pas de saisie. Cliquer à nouveau sur la date, ou sur **Tout le mois**, rétablit la liste mensuelle. La recherche combine le jour choisi avec le texte ou la date, sans modifier les indicateurs mensuels. Les variantes de casse et d’accents sont reconnues.

**Ajouter une réclamation** ouvre le formulaire existant, avec la date consultée ou, par défaut, la date du jour dans le mois affiché. Les sauvegardes et suppressions mettent à jour le calendrier, les indicateurs et la liste. Une sauvegarde échouée conserve le brouillon sans augmenter les compteurs. Les mois clôturés restent consultables sans modification.

En mode réunion, l’ajout et la suppression sont retirés. Le calendrier, la sélection des dates et la recherche restent disponibles. La navigation entre les mois réinitialise les filtres de consultation du calendrier.

Les réclamations existantes sont conservées. Elles restent globales : les filtres de production par client et département ne les limitent pas. Leur stockage, les exports et les archives mensuelles gardent le même format (`customer_complaints` avec date et détail). Aucune migration SQL n’est nécessaire pour ce changement.
