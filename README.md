# DB Diagram Element

A framework-agnostic custom element for interactive DBML database diagrams.

## Overview

This project provides a web component that combines a DBML (Database Markup Language) editor with real-time database diagram visualization. It's designed to be embeddable in any web application regardless of framework, making database schema visualization as simple as adding an HTML element.

## Goal

The primary goal is to democratize database visualization by providing a lightweight, easy-to-embed component that can be used in documentation sites, GitHub README files, blog posts, or any web application where you need to show database schemas interactively.

Key objectives:
- **Universal compatibility**: Works with any framework or vanilla HTML
- **Lightweight**: Minimal bundle size with no heavy dependencies
- **Interactive**: Real-time editing with immediate visual feedback
- **Professional**: Clean, production-ready diagrams with proper relationship routing

## Features

- DBML editor with syntax highlighting
- Real-time diagram visualization
- Draggable tables with zoom and pan controls
- Smart relationship arrows with Manhattan-style routing
- Framework-agnostic web component
- Lightweight (~8KB gzipped)

## Quick Start

### Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   This opens `test.html` at http://localhost:3000

3. **Build for production**:
   ```bash
   npm run build
   ```
   Creates optimized bundles in the `dist/` directory

### Testing

- **Development version**: Open `test.html` in your browser
- **Built version**: Open `test-built.html` to test the production build

## Usage

### Basic HTML

```html
<!-- Load ACE Editor (required) -->
<script src="https://cdn.jsdelivr.net/npm/ace-builds@1.4.14/src-noconflict/ace.js"></script>
<script src="https://cdn.jsdelivr.net/npm/ace-builds@1.4.14/src-noconflict/theme-dracula.js"></script>

<!-- Load the custom element -->
<script type="module" src="./dist/db-diagram-element.js"></script>

<!-- Use the element -->
<db-diagram-viewer height="400px" dbml="
Table users {
  id int [pk]
  email varchar [unique]
}

Table posts {
  id int [pk]
  user_id int [ref: > users.id]
  title varchar
}
"></db-diagram-viewer>
```

### Attributes

- `height` - Container height (default: "400px")
- `dbml` - Initial DBML content
- `editable` - Enable/disable editing (default: true)
- `theme` - ACE editor theme (default: "dracula")

### Events

The element fires a `dbml-change` event when the content changes:

```javascript
document.querySelector('db-diagram-viewer').addEventListener('dbml-change', (event) => {
  console.log('New DBML:', event.detail.dbml);
});
```

## Project Structure

```
src/
├── define-custom-element-with-diagram.js  # Main custom element
└── diagram/
    └── DiagramRenderer.js                 # SVG diagram rendering
public/
└── mode-dbml.js                          # ACE editor DBML syntax
test.html                                 # Development demo
test-built.html                           # Production demo
```

## Technical Details

- **Architecture**: Vanilla JavaScript using Web Components standard
- **Rendering**: Direct SVG manipulation for optimal performance
- **Editor**: ACE editor integration for syntax highlighting
- **Parser**: Regex-based DBML parser for table and relationship extraction
- **Build**: Vite with ES modules and UMD output formats

## Future Plans

This project is designed to be published as an npm package for easy distribution. It's also structured to support future TypeScript migration while maintaining the current JavaScript implementation.

For detailed setup instructions for creating a standalone repository and publishing to npm, see `STANDALONE_SETUP.md`.

## License

MIT