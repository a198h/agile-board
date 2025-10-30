![version](https://img.shields.io/badge/version-0.7.8-blue)

🌍 Read this in other languages:
[English](README.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** est un plugin pour [Obsidian](https://obsidian.md) qui transforme vos notes en tableaux visuels. Chaque mise en page repose sur un modèle (par exemple la matrice d'Eisenhower) défini sur une grille de 24x24. Les sections apparaissent comme des cadres éditables (des "boxes"): vous pouvez écrire, insérer des tâches, des requêtes Dataview/Tasks..., etc.

**Note** : Le contenu est toujours sauvegardé en Markdown classique sous des titres #, ce qui garantit la compatibilité avec toutes vos notes.

---

## 🎯 Fonctionnalités

Transforme vos notes en tableaux de bord visuels avec des cadres éditables. Chaque cadre représente une section (titre de niveau 1) avec support de :

- **Markdown riche** : `[[liens]]`, `- [ ] tâches`, formatage
- **Édition intelligente** : listes auto-continuées, cases à cocher cliquables
- **Plugins compatibles** : Dataview, Tasks, etc.
- **Live Preview** : rendu proche d'Obsidian avec quelques limitations

## 🌍 Support multilingue

**NOUVEAU dans v0.7.7** : Internationalisation complète avec **détection automatique de la langue** !

- 🇺🇸 **English** - langue de référence
- 🇫🇷 **Français** - traduction complète
- 🇪🇸 **Español** - traducción completa  
- 🇩🇪 **Deutsch** - vollständige Übersetzung
- 🇵🇹 **Português** - tradução completa
- 🇨🇳 **中文 (简体)** - 完整翻译

L'interface s'adapte automatiquement au paramètre de langue de votre Obsidian. Tous les éléments UI, paramètres, messages et infobulles sont traduits professionnellement avec **96 clés de traduction** dans toutes les langues.

## ⚠️ Limites actuelles

Le mode Board utilise CodeMirror 6 pour l'édition mais n'inclut pas toutes les fonctionnalités d'édition avancées d'Obsidian :

- **Suggestions de liens** : En tapant `[[`, l'éditeur ne propose pas vos notes (vous pouvez toujours taper le lien complet manuellement)
- **Appels inline de plugins** : Les requêtes Dataview inline (`= this.file.name`) ou les commandes Templater (`<% tp.date.now() %>`) ne s'exécutent pas dans les cadres

### 📎 Support des embeds

**NOUVEAU** : L'aperçu des embeds est maintenant supporté en mode Board !

- **Images** : `![[image.png]]` s'affiche correctement en mode prévisualisation
- **Notes** : `![[autre-note.md]]` affiche le contenu de la note
- **Obsidian Bases** : `![[table.base]]` affiche les vues de base de données interactives

**Sélection de vue persistante pour les Bases** : Pour rendre persistante la sélection de vue dans une base, utilisez la syntaxe avec fragment :
```markdown
![[table.base#NomDeLaVue]]
```
Cela garantit que la vue spécifiée est toujours affichée au chargement de la note.


## 🔄 Deux modes d'affichage

**🏢 Mode Board** : Grille de cadres éditables avec fonctionnalités Live Preview  
**📄 Mode Normal** : Édition markdown classique d'Obsidian

Basculez entre les modes via les icônes dans la toolbar.

![Agile Board – Exemple Eisenhower](./agile-board-eisenhower.gif)

---

## 🚀 Installation

### Option 1 - Coffre complet (recommandé)

1. Téléchargez `Agile-Board-v0.7.7.zip` (coffre Obsidian avec plugin et exemples)
2. Dézippez et ouvrez directement le dossier dans Obsidian

### Option 2 - Plugin seul

1. Téléchargez depuis les [releases GitHub](https://github.com/a198h/agile-board/releases)
2. Copiez le dossier `agile-board` dans `.obsidian/plugins/`
3. Redémarrez Obsidian et activez le plugin
4. **Les 5 layouts par défaut sont inclus** directement dans le plugin

> **✨ Nouveau v0.7.6**: Tous les layouts par défaut (eisenhower, swot, moscow, effort_impact, cornell) sont maintenant vraiment intégrés au plugin ! Fix du problème BRAT v0.7.5.

### Option 3 - BRAT (Test Beta)

Installation via [BRAT](https://github.com/TfTHacker/obsidian42-brat) pour recevoir les dernières mises à jour :

1. Installez et activez le plugin BRAT
2. Ajoutez `a198h/agile-board` comme plugin beta
3. BRAT mettra automatiquement le plugin à jour

---

## 📝 Utilisation

### Configuration

Pour activer un layout sur une note, ajoutez cette ligne dans les propriétés (frontmatter) :

```yaml
---
agile-board: eisenhower
---
```

**Layouts disponibles** (fournis par défaut) :

- `eisenhower` : Matrice 4 quadrants important/urgent
- `swot` : Analyser une situation
- `moscow` : Prioriser les fonctionnalités ou besoins (Must/Should/Could/Won't)
- `effort_impact` : Décider quelles actions mener selon leur efficacité
- `cornell` : Prise de notes active
L'icône 🏢 apparaît dans la toolbar. Cliquez pour basculer en mode Board.

### Édition

- **Clic sur un cadre** → Mode édition
- **Listes intelligentes** : Listes à puces et listes numérotées
- **Cases à cocher** : Clic pour cocher/décocher, sync automatique
- **Requêtes** : Query, Dataview, Tasks

---

## ⚙️ Paramètres du plugin

Depuis le panneau **Paramètres → Modules complémentaires → Agile Board**, vous pouvez gérer vos layouts directement depuis Obsidian.

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 Gestion des layouts

La liste des layouts disponibles apparaît automatiquement dans les paramètres. Chaque layout correspond à un fichier `.json` sauvegardé dans le dossier `layouts` du plugin (l'utilisateur n'a pas besoin de manipuler ce dossier).

- **Créer un layout** : bouton ➕, saisissez un nom.
- **Éditer un layout** : icône ✏️ ouvre l'éditeur visuel.
- **Dupliquer un layout** : icône 📑.
- **Exporter / Importer** : icônes ⬆️ et ⬇️ pour partager ou charger une configuration.
- **Supprimer un layout** : icône 🗑️.

### 🎨 Éditeur visuel

L'éditeur de layout affiche une grille **24×24** sur laquelle vous pouvez placer des **boxes** (les cadres) :

- **Créer** : clic et glisser sur la grille.
- **Déplacer** : glisser une box.
- **Redimensionner** : utilisez les poignées circulaires.
- **Renommer** : modifiez le titre dans le panneau latéral.
- **Supprimer** : bouton rouge «🗑️».
- **Tout effacer** : bouton rouge «🗑️ Effacer toutes les boxes» sous la section d'aide.

Chaque box correspond à une **section de la note** : un titre de **niveau 1** (ligne commençant par `#`) suivi de son contenu.

---

## ✨ Caractéristiques

- **Synchronisation automatique** : Les modifications dans les cadres visuels sont automatiquement sauvegardées dans le fichier markdown
- **Sections automatiques** : Création assistée des sections manquantes
- **Compatibilité plugins** : Dataview, Tasks et Templater semblent fonctionner normalement (reportez les bugs!); autres plugins à vérifier.

---

## 💡 Inspiration

Ce plugin est inspiré de [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) et s'appuie sur le concept de transformation des notes markdown en mises en page visuelles.

---

## 📂 Votre contribution compte !

- **Bugs/Issues** : [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)
- **Discussions** : [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)

## Me soutenir
Si mon travail vous est utile vous pouvez me soutenir ici :  
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)