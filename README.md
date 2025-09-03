![version](https://img.shields.io/badge/version-0.7.1-blue)

***
# Agile Board

**Agile Board** est un plugin pour [Obsidian](https://obsidian.md) qui transforme vos notes en tableaux visuels.
Chaque mise en page repose sur un modèle (par exemple la matrice d'Eisenhower) défini sur une grille de 24x24. Les sections apparaissent comme des cadres éditables (des "boxes"): vous pouvez écrire, insérer des tâches, des requêtes Dataview/Tasks..., etc. 

**Note** : Le contenu est toujours sauvegardé en Markdown classique sous des titres #, ce qui garantit la compatibilité avec toutes vos notes.
***

## 🎯 Fonctionnalités

Transforme vos notes en tableaux de bord visuels avec des cadres éditables. Chaque cadre représente une section (titre de niveau 1) avec support de :

- **Markdown riche** : `[[liens]]`, `- [ ] tâches`, formatage
- **Édition intelligente** : listes auto-continuées, cases à cocher cliquables
- **Plugins compatibles** : Dataview, Tasks, etc.
- **Live Preview** : rendu proche d'Obsidian avec quelques limitations

**Note** : Les images (`![[image.png]]`) ne sont pas encore prises en charge dans les cadres en mode Board.

## 🔄 Deux modes d'affichage

**🏢 Mode Board** : Grille de cadres éditables avec fonctionnalités Live Preview   
**📄 Mode Normal** : Édition markdown classique d'Obsidian

Basculez entre les modes via les icônes dans la toolbar.

![Agile Board – Exemple Eisenhower](./agile-board-eisenhower.gif)
***

## 🚀 Installation

### Option 1 - Via BRAT (Beta Testing - Recommandé)
1. Installez le plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat) depuis la communauté Obsidian
2. Ouvrez les paramètres BRAT et ajoutez ce repository : `a198h/agile-board`
3. BRAT installera automatiquement la dernière version et gérera les mises à jour

### Option 2 - Installation manuelle  
1. Téléchargez la dernière release depuis [GitHub Releases](https://github.com/a198h/agile-board/releases)
2. Extrayez `main.js`, `manifest.json` et `styles.css` dans `.obsidian/plugins/agile-board/`
3. Redémarrez Obsidian et activez le plugin

### Option 3 - Coffre complet (pour tester)
1. Téléchargez `Agile-Board-v0.7.1.zip` (coffre Obsidian avec plugin et exemples)
2. Dézippez et ouvrez directement le dossier dans Obsidian

***

## 📝 Utilisation

### Configuration
Pour activer un layout sur une note, ajoutez cette ligne dans les propriétés (frontmatter) :

```yaml
---
agile-board: eisenhower
---
```

**Layouts disponibles** (fournis par défaut) :

* `eisenhower` : Matrice 4 quadrants important/urgent
* `swot` : Analyser une situation
* `moscow` : Prioriser les fonctionnalités ou besoins (Must/Should/Could/Won't)
* `effort_impact` : Décider quelles actions mener selon leur efficacité
* `cornell` : Prise de notes active
L'icône 🏢 apparaît dans la toolbar. Cliquez pour basculer en mode Board.

### Édition

* **Clic sur un cadre** → Mode édition
* **Listes intelligentes** : Listes à puces et listes numérotées
* **Cases à cocher** : Clic pour cocher/décocher, sync automatique
* **Requêtes** : Query, Dataview, Tasks

***

## ⚙️ Paramètres du plugin

Depuis le panneau **Paramètres → Modules complémentaires → Agile Board**, vous pouvez gérer vos layouts directement depuis Obsidian.

### 📋 Gestion des layouts

La liste des layouts disponibles apparaît automatiquement dans les paramètres.
Chaque layout correspond à un fichier `.json` sauvegardé dans le dossier `layouts` du plugin (l’utilisateur n’a pas besoin de manipuler ce dossier).

* **Créer un layout** : bouton ➕, saisissez un nom.
* **Éditer un layout** : icône ✏️ ouvre l’éditeur visuel.
* **Dupliquer un layout** : icône 📑.
* **Exporter / Importer** : icônes ⬆️ et ⬇️ pour partager ou charger une configuration.
* **Supprimer un layout** : icône 🗑️.

### 🎨 Éditeur visuel

L’éditeur de layout affiche une grille **24×24** sur laquelle vous pouvez placer des **boxes** (les cadres) :

* **Créer** : clic et glisser sur la grille.
* **Déplacer** : glisser une box.
* **Redimensionner** : utilisez les poignées circulaires.
* **Renommer** : modifiez le titre dans le panneau latéral.
* **Supprimer** : bouton rouge «🗑️».

Chaque box correspond à une **section de la note** : un titre de **niveau 1** (ligne commençant par `#`) suivi de son contenu.

***

## ✨ Caractéristiques

* **Synchronisation automatique** : Les modifications dans les cadres visuels sont automatiquement sauvegardées dans le fichier markdown
* **Sections automatiques** : Création assistée des sections manquantes
* **Compatibilité plugins** : Dataview, Tasks et Templater semblent fonctionner normalement (reportez les bugs!); autres plugins à vérifier.

***

## 🔮 Roadmap & Améliorations prévues

### Version actuelle (v0.7.1)
- ✅ **Architecture refactorisée** : Code enterprise-grade avec TypeScript strict
- ✅ **Gestion d'erreurs fonctionnelle** : Patterns Result<T> 
- ✅ **Documentation complète** : JSDoc pour toutes les APIs
- ✅ **Lifecycle management** : Nettoyage approprié des ressources

### Prochaines améliorations
- 🚧 **CodeMirror 6 Integration** : Remplacement des textarea par l'éditeur CM6 natif d'Obsidian
  - Meilleure intégration avec l'écosystème Obsidian
  - Support amélioré des plugins (Vim, divers thèmes, etc.)
  - Performance et UX améliorées
- 🔄 **Gestion avancée des images** : Support complet des `![[image.png]]` 
- 🎨 **Thèmes personnalisés** : Support des thèmes pour les layouts
- ⚡ **Performance** : Optimisations du rendu pour les grandes notes

### Feedback souhaité via BRAT
- 📝 **Expérience utilisateur** générale
- 🐛 **Bugs ou comportements inattendus** 
- 💡 **Idées d'améliorations** et cas d'usage
- 🔌 **Compatibilité** avec vos plugins favoris

***

## 📂 Votre contribution compte !

* **Beta Testing** : Testez via [BRAT](https://github.com/TfTHacker/obsidian42-brat) et partagez vos retours !
* **Bugs/Issues** : [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)
* **Discussions** : [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)
* **Discord Obsidian** : Mention `@agile-board` dans #plugin-dev ou #general
