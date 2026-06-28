![version](https://img.shields.io/badge/version-0.9.2-blue) ![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A50.15.0-7C3AED) ![1.13+](https://img.shields.io/badge/1.13%2B-compatible-brightgreen) ![Desktop only](https://img.shields.io/badge/plataforma-desktop-lightgrey)

🌍 Leia isto em outros idiomas:
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** transforma as suas notas do Obsidian em quadros visuais interativos. As suas secções tornam-se molduras editáveis dispostas numa grelha — mantendo-se sempre Markdown válido e portátil por baixo.

![Agile Board – Exemplo Eisenhower](./agile-board-eisenhower.gif)

---

## 🆕 Novidades

### v0.9.2 — Impressão do quadro melhorada

- **Escala da grelha**: as molduras adaptam-se ao tamanho do papel (retrato ou paisagem) sem transbordar
- **Cabeçalho e rodapé**: título do ficheiro no topo, versão do plugin no canto inferior direito
- **Callouts**: corretamente estilizados na impressão
- **Obsidian Bases**: cartões e tabelas são impressos de forma limpa — interface removida, datas formatadas como `DD/MM/AAAA HH:MM:SS`, etiquetas de propriedades mostradas (exceto o redundante «name»)
- **Listas de tarefas**: caixas de verificação preservadas com espaçamento adequado

### v0.9.1 — Correção de compatibilidade para Obsidian 1.13.0
Os controladores de redimensionamento do editor de layouts deixaram de funcionar após a atualização do Chromium do Obsidian na v1.13.0. Este patch restaura completamente o editor visual em todas as versões suportadas.

### v0.9.0 — Editor popout

> Anteriormente, editar uma moldura exigia mudar toda a nota para o modo de edição, dificultando a escrita enquanto se mantinha o quadro visível.

**Agora pode fazer duplo clique no título de qualquer moldura para a abrir numa janela dedicada**, com o Live Preview completo do Obsidian. O conteúdo é sincronizado automaticamente ao fechar a janela. As molduras bloqueadas não podem ser abertas em popout.

![Agile Board – Quadro para Markdown](./Agile-Board-Board-to-Markdown_c.gif)

---

## 🎯 Funcionalidades

### Quadro & Edição
- **Dois modos de visualização**: alterne livremente entre o quadro visual (🏢) e a edição Markdown clássica (📄)
- **Molduras editáveis**: clique em qualquer moldura para entrar no modo de edição com CodeMirror 6
- **Editor popout**: duplo clique no título de uma moldura para editá-la numa janela separada — mantenha o quadro visível enquanto escreve
- **Edição inteligente**: listas e callouts auto-continuados, caixas de verificação clicáveis com sincronização instantânea
- **Markdown rico**: `[[ligações]]`, `- [ ] tarefas`, formatação, blocos de código, regras horizontais

### Personalização de molduras
- **Bloqueio de moldura**: bloqueie uma moldura para evitar edições acidentais — ligações, embeds e caixas de verificação continuam a funcionar
- **Tamanho de fonte**: ajuste a escala do texto em todas as molduras (0,7× a 1,5×) nas definições do plugin
- **Cores personalizadas**: atribua uma cor a qualquer moldura — barra de título colorida e borda colorida na vista do quadro

![Agile Board – Bloqueio de moldura](./Agile-Board-Lock-frame_c.gif)
![Agile Board – Tamanho de fonte](./Agile-Board-Font-Size-in-Board_c.gif)

### Embeds & Compatibilidade com plugins
- **Imagens**: `![[imagem.png]]` é apresentado corretamente na pré-visualização do quadro
- **Notas**: `![[outra-nota.md]]` incorpora o conteúdo da nota diretamente na moldura
- **Obsidian Bases**: `![[tabela.base]]` apresenta vistas de base de dados interativas; use `![[tabela.base#NomeVista]]` para memorizar a vista selecionada
- **Dataview & Tasks**: as consultas são calculadas e atualizadas normalmente dentro das molduras
- **Menu contextual e impressão**: clique com o botão direito no separador do quadro para todas as opções padrão do Obsidian, mais impressão direta do quadro

![Agile Board – Menu contextual](./Agile-Board-Menu_c.gif)
![Agile Board – Imprimir quadro](./Agile-Board-Print-Board_c.gif)

---

## ⚠️ Limitações conhecidas

O editor de molduras usa CodeMirror 6, mas não replica todas as funcionalidades de edição do Obsidian:

- **Sugestões de ligações**: escrever `[[` não sugere as suas notas — escreva a ligação completa manualmente
- **Chamadas inline de plugins**: consultas Dataview inline (`= this.file.name`) e comandos Templater (`<% tp.date.now() %>`) não são executados dentro das molduras
- **Apenas desktop**: os quadros não estão disponíveis em dispositivos móveis — as suas notas continuam legíveis como Markdown padrão em mobile

---

## 🚀 Instalação

**Requisitos**: Obsidian desktop ≥ 0.15.0. Compatível com Obsidian 1.13.0 (Catalyst) e versões posteriores.

### Opção 1 — BRAT (Recomendado)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) gere as atualizações automáticas:

1. Instale e ative o plugin comunitário **BRAT**
2. Nas definições do BRAT, adicione `a198h/agile-board`
3. O BRAT instala o plugin e mantém-no atualizado automaticamente

### Opção 2 — Instalação manual

1. Descarregue `main.js`, `manifest.json` e `styles.css` da [última release do GitHub](https://github.com/a198h/agile-board/releases/latest)
2. Copie os três ficheiros para `.obsidian/plugins/agile-board/`
3. Reinicie o Obsidian e ative o **Agile Board** em Definições → Plugins da comunidade

> **5 layouts predefinidos estão incluídos** no plugin — não é necessário download adicional.

---

## 📝 Início rápido

### 1. Ativar um layout numa nota

Adicione a propriedade `agile-board` no frontmatter da nota:

```yaml
---
agile-board: eisenhower
---
```

Clique no ícone 🏢 na barra de ferramentas para mudar para o modo Quadro.

### 2. Layouts disponíveis

| Layout | Descrição |
|---|---|
| `eisenhower` | Matriz de 4 quadrantes Importante / Urgente |
| `swot` | Forças, Fraquezas, Oportunidades, Ameaças |
| `moscow` | Priorização Must / Should / Could / Won't |
| `effort_impact` | Priorização de ações por eficácia |
| `cornell` | Sistema ativo de tomada de notas |

### 3. Editar uma moldura

- **Clique simples** → modo de edição
- **Duplo clique no título** → abrir na janela popout
- As alterações são guardadas automaticamente no ficheiro Markdown

---

## ⚙️ Definições do plugin

Abra **Definições → Plugins da comunidade → Agile Board** para gerir layouts e aparência.

![Agile Board – Configuração](./agile-board-customize-board.png)

### Gestão de layouts

Cada layout é um ficheiro `.json` na pasta `layouts/` do plugin. No painel de definições:

| Ação | Controlo |
|---|---|
| Criar | botão ➕ — introduza um nome |
| Editar | ícone ✏️ — abre o editor visual |
| Duplicar | ícone 📑 |
| Exportar / Importar | ícones ⬆️ / ⬇️ — partilhar ou carregar configurações |
| Eliminar | ícone 🗑️ |

### Editor visual de layouts

O editor mostra uma **grelha 24×24** onde coloca e redimensiona **boxes** (molduras):

- **Criar**: clicar e arrastar numa área vazia
- **Mover**: arrastar uma box para a reposicionar
- **Redimensionar**: arrastar os controladores circulares nos cantos e bordas da box
- **Renomear**: editar o título no painel lateral
- **Cor**: escolher uma cor personalizada no painel lateral — clicar em **Repor** para voltar à cor da paleta
- **Eliminar**: botão 🗑️ no painel lateral
- **Limpar tudo**: remove todas as boxes do layout (com confirmação)

Cada box corresponde a um **título de nível 1** (`#`) na nota e ao conteúdo que se segue.

---

## 🌍 Suporte multilingue

A interface adapta-se automaticamente ao idioma do seu Obsidian. Todos os elementos UI, definições, mensagens e tooltips estão disponíveis em **7 idiomas** (96 chaves de tradução):

| Idioma | Estado |
|---|---|
| 🇺🇸 English | referência |
| 🇫🇷 Français | completo |
| 🇪🇸 Español | completo |
| 🇩🇪 Deutsch | completo |
| 🇵🇹 Português | completo |
| 🇨🇳 中文 (简体) | completo |
| 🇷🇺 Русский | completo |

---

## 💡 Inspiração

Este plugin é inspirado em [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) e baseia-se na ideia de transformar notas Markdown em layouts visuais.

---

## 📂 Contribuição & Suporte

- **Relatórios de erros e pedidos de funcionalidades**: [GitHub Issues](https://github.com/a198h/agile-board/issues)
- **Discussões**: [GitHub Discussions](https://github.com/a198h/agile-board/discussions/8)

Se este plugin lhe for útil, considere apoiar o seu desenvolvimento:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
