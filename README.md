![status](https://img.shields.io/badge/status-beta-orange)

> ⚠️ Ce projet est en version bêta. Non stable, sujet à modifications.

**Utilisation en production déconseillée.**
***
# Agile Board

**Agile Board** est un plugin pour [Obsidian](https://obsidian.md) qui permet d'organiser visuellement le contenu d'une note selon une mise en page sous forme de cadres. Le plugin offre deux modes d'affichage : un **mode Board** avec grille de cadres éditables, et le **mode Normal** pour l'édition markdown classique.

***

## 🎯 Fonctionnalités

Transforme vos notes en tableaux de bord visuels avec des cadres éditables. Chaque cadre représente une section (titre de niveau 1) avec support complet de :

- **Markdown riche** : `![[images]]`, `[[liens]]`, `- [ ] tâches`, formatage
- **Édition intelligente** : listes auto-continuées, cases à cocher cliquables
- **Plugins compatibles** : Dataview, Tasks, etc.
- **Live Preview natif** : rendu identique à Obsidian standard

## 🔄 Deux modes d'affichage

**🏢 Mode Board** : Grille de cadres éditables avec fonctionnalités Live Preview  
**📄 Mode Normal** : Édition markdown classique d'Obsidian

Basculez entre les modes via les icônes dans la toolbar.

***

## 🚀 Installation

1. Dézippez `Agile-Board-vxx.xx.xx.zip`
2. Copiez le dossier `agile-board` dans `.obsidian/plugins/`
3. Redémarrez Obsidian et activez le plugin

***

## 📝 Utilisation

### Configuration
Ajoutez cette propriété en haut de votre note :

```yaml
---
agile-board: layout_eisenhower
---
```

L'icône 🏢 apparaît dans la toolbar. Cliquez pour basculer en mode Board.

### Édition
- **Clic sur un cadre** → mode édition avec Live Preview
- **Listes intelligentes** : Entrée crée un nouvel item, double Entrée sort de la liste
- **Cases à cocher** : Clic pour cocher/décocher, sync automatique
- **Contenu riche** : `![[images]]`, `[[liens]]`, Dataview, Tasks

## 🔧 Configuration

**Layout inclus** : `layout_eisenhower` (matrice 4 quadrants)

**Layouts personnalisés** : Éditez `layout.json` dans le dossier du plugin

```json
{
  "mon_layout": [
    {
      "title": "Titre du cadre",
      "x": 0, "y": 0,     // Position (colonne, ligne)
      "w": 12, "h": 12    // Taille (largeur, hauteur)
    }
  ]
}
```

Grille 24×100, validation automatique des collisions.

## ✨ Caractéristiques

- **Synchronisation bidirectionnelle** : Un fichier, deux modes d'affichage
- **Sections automatiques** : Création assistée des sections manquantes
- **Compatibilité plugins** : Dataview, Tasks et Templater semblent fonctionner normalement (reportez les bugs!); autres plugins à vérifer.

***

## 📂 Votre contribution compte !

- **Bugs/Issues** : https://github.com/a198h/agile-board/issues
- **Discussions** : https://github.com/a198h/agile-board/discussions/8