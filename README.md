![status](https://img.shields.io/badge/status-beta-orange)

> ⚠️ Ce projet est en version bêta. Non stable, sujet à modifications.

**Utilisation en production déconseillée.**
***
# Agile Board

**Agile Board** est un plugin pour [Obsidian](https://obsidian.md) qui permet d'organiser visuellement le contenu d'une note selon une mise en page sous forme de cadres. Chaque cadre devient une section éditable en mode Aperçu (Live Preview), parfaitement synchronisée avec le Markdown sous-jacent (mode Source).

***

## 🎯 À quoi ça sert ?

Agile Board transforme une note Obsidian en un tableau de bord visuel. Il est alors possible d'ajouter du contenu dans chaque cadre.
Pour le moment, il est possible d'ajouter :
- des notes en markdown
- des requêtes Dataview, Tasks, etc.
(mais les liens vers d'autres notes ou images ne fonctionnent pas encore)

***

## 🚀 Installation manuelle

1. Dézippez le fichier `Agile-Board-vxx.xx.xx.zip`

2. Copier le dossier `agile-board` dans le dossier .obsidian/plungins/ de votre coffre 

3. Redémarrez Obsidian

3. Dans `Paramètres → Plugins communautaires` de Obsidian, sélectionnez `Agile Board` et cliquez sur "Activer"

***

## 📝 Utilisation

1. Créez une note et ajoutez cette propriété en haut du fichier :

   ```yaml
   ---
   agile-board: layout_eisenhower
   ---
   ```
2. Passez en mode `Aperçu en direct` : le plugin vous propose de créer la structure de la note (les titres de niveau 1)

3. Vous pouvez maintenant ajouter du contenu dans chaque cadre ou le modifier en mode Source.

***
## Contribuez !

Vous pouvez reporter les problèmes ou les suggestions ici : https://github.com/a198h/agile-board/issues

Un espace de discussion est disponible ici : https://github.com/a198h/agile-board/discussions/8

Toutes les contributions sont les bienvenues !