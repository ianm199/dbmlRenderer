# 🗃️ DB Diagram Custom Element - Standalone Setup Guide

## 📋 Full Context

### What This Project Is
This project contains a **framework-agnostic custom element** (`<db-diagram-viewer>`) that provides an interactive DBML (Database Markup Language) editor with real-time diagram visualization. It's the result of extracting and converting core functionality from a Vue.js-based dbdiagram-oss application into a standalone, embeddable web component.

### Key Transformation
- **From**: Vue.js application with complex component hierarchy
- **To**: Single custom element that works in any web environment
- **Architecture**: Vanilla JavaScript + SVG rendering + ACE editor integration
- **Size**: Lightweight (~3KB gzipped) with no framework dependencies

### Current State
The project has been **completely cleaned up** and contains only essential files:

```
web_revised/
├── src/
│   ├── define-custom-element-with-diagram.js  # Main custom element
│   └── diagram/
│       └── DiagramRenderer.js                 # SVG diagram rendering logic
├── public/
│   └── mode-dbml.js                          # ACE editor DBML syntax highlighting
├── test.html                                 # Working demo
├── vite.config.mjs                          # Build configuration
└── package.json                             # Current dependencies
```

### Technical Implementation
- **Custom Element**: Uses Web Components standard for universal compatibility
- **DBML Parser**: Simple regex-based parser for table definitions and relationships
- **SVG Rendering**: Direct SVG manipulation for tables, fields, and relationship lines
- **Interactions**: Draggable tables, zoom/pan controls, real-time updates
- **Manhattan Routing**: Professional right-angle relationship lines
- **Zoom System**: Mouse wheel + button controls with smart constraints (zoom-aware dragging boundaries)

### Code Quality
- **Clean codebase**: All inline comments removed, replaced with JSDoc docstrings
- **No framework bloat**: Removed all Vue.js components, stores, and dependencies  
- **Production ready**: Optimized for embedding and distribution

### Current Features
- ✅ DBML editor with syntax highlighting (ACE editor integration)
- ✅ Real-time diagram visualization 
- ✅ Draggable tables with 1000px boundary margins
- ✅ Zoom controls (mouse wheel + buttons) with live percentage display
- ✅ Pan controls (Shift+drag, middle mouse, clickable pan mode)
- ✅ Smart relationship arrows pointing to field centers
- ✅ Professional Manhattan-style routing for connections
- ✅ Semi-transparent table effect during dragging
- ✅ Responsive zoom-aware constraints
- ✅ Custom event system (dbml-change events)

### Ready For
This codebase is **immediately ready** for:
1. **Standalone repository creation**
2. **NPM package publishing** 
3. **CDN distribution**
4. **Framework integration** (React, Vue, Angular, etc.)
5. **Future TypeScript migration**

### Working Demo
The included `test.html` demonstrates all features working together:
- DBML editor with syntax highlighting
- Real-time diagram updates
- Draggable tables with proper constraints  
- Zoom/pan controls with visual feedback
- Professional relationship routing

Simply open `test.html` in a browser to see the custom element in action.

---

## 📦 Project Overview

This guide covers how to set up this project as a standalone repository and publish it to npm. The custom element provides an interactive DBML editor with real-time diagram visualization, built with vanilla JavaScript and embeddable in any web application.

## 🚀 Setting Up Standalone Repository

### 1. Initialize New Repository

```bash
# Create new repo directory
mkdir db-diagram-element
cd db-diagram-element

# Initialize git
git init
git branch -M main

# Copy essential files from current project
cp -r src/ .
cp -r public/ .
cp test.html .
# Note: You'll need to update vite.config.mjs (see step 3)
```

### 2. Create New package.json

Create a clean `package.json` focused on the custom element:

```json
{
  "name": "db-diagram-element",
  "version": "1.0.0",
  "description": "Framework-agnostic custom element for interactive DBML database diagrams",
  "main": "dist/db-diagram-element.umd.js",
  "module": "dist/db-diagram-element.js",
  "type": "module",
  "files": [
    "dist/",
    "src/",
    "public/mode-dbml.js",
    "README.md"
  ],
  "exports": {
    ".": {
      "import": "./dist/db-diagram-element.js",
      "require": "./dist/db-diagram-element.umd.js"
    },
    "./style.css": "./dist/style.css"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "database",
    "dbml",
    "diagram",
    "visualization",
    "custom-element",
    "web-component",
    "schema",
    "database-design",
    "erd"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/db-diagram-element.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/db-diagram-element/issues"
  },
  "homepage": "https://github.com/yourusername/db-diagram-element#readme",
  "devDependencies": {
    "vite": "^5.0.0"
  },
  "peerDependencies": {
    "ace-builds": "^1.4.14"
  }
}
```

### 3. Create/Update Vite Configuration

Create `vite.config.mjs` for proper library build:

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/define-custom-element-with-diagram.js',
      name: 'DbDiagramElement',
      fileName: (format) => `db-diagram-element.${format === 'es' ? 'js' : 'umd.js'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['ace-builds'],
      output: {
        globals: {
          'ace-builds': 'ace'
        }
      }
    },
    sourcemap: true,
    minify: 'terser'
  },
  server: {
    port: 3000,
    open: '/test.html'
  }
})
```

### 4. Create README.md

```markdown
# 🗃️ DB Diagram Element

Framework-agnostic custom element for interactive DBML database diagrams.

## Features

- 📝 **DBML Editor** with syntax highlighting
- 🎨 **Real-time diagram** visualization  
- 🖱️ **Interactive tables** - drag, zoom, pan
- 🔗 **Smart relationships** with Manhattan-style routing
- 📦 **Framework agnostic** - works anywhere
- 🎯 **Lightweight** - ~3KB gzipped

## Installation

\`\`\`bash
npm install db-diagram-element
\`\`\`

## Usage

### HTML + CDN
\`\`\`html
<!-- Load ACE Editor (required peer dependency) -->
<script src="https://cdn.jsdelivr.net/npm/ace-builds@1.4.14/src-noconflict/ace.js"></script>
<script src="https://cdn.jsdelivr.net/npm/ace-builds@1.4.14/src-noconflict/theme-dracula.js"></script>

<!-- Load the custom element -->
<script type="module" src="https://cdn.jsdelivr.net/npm/db-diagram-element/dist/db-diagram-element.js"></script>

<!-- Use the element -->
<db-diagram-viewer height="400px" dbml="
Table users {
  id int [pk]
  email varchar [unique] 
}
"></db-diagram-viewer>
\`\`\`

### ES Modules
\`\`\`javascript
// Import the custom element (registers <db-diagram-viewer>)
import 'db-diagram-element';

// Note: You still need to load ACE Editor separately
// Either via CDN in your HTML or as a separate import
\`\`\`

\`\`\`html
<!-- Then use anywhere in your HTML -->
<db-diagram-viewer height="500px" dbml="Table users { id int [pk] }"></db-diagram-viewer>
\`\`\`

## API

### Attributes
- \`height\` - Container height (default: "400px")
- \`dbml\` - Initial DBML content
- \`editable\` - Enable/disable editing (default: true)  
- \`theme\` - ACE editor theme (default: "dracula")

### Events
- \`dbml-change\` - Fired when DBML content changes

### Methods
- \`getDbml()\` - Get current DBML content
- \`setDbml(dbml)\` - Set DBML content

## License

MIT
\`\`\`

### 5. Create .gitignore

```
node_modules/
dist/
.DS_Store
*.log
.env
```

### 6. Install Dependencies

```bash
npm install vite --save-dev
```

## 📤 Publishing to NPM

### 1. Build the Package

```bash
npm run build
```

This creates:
- `dist/db-diagram-element.js` (ES module)
- `dist/db-diagram-element.umd.js` (UMD for browsers)
- `dist/style.css` (bundled styles)

### 2. Test Locally

```bash
# Test the build
npm run preview

# Test as npm package (optional)
npm pack
npm install ./db-diagram-element-1.0.0.tgz
```

### 3. Prepare for Publishing

```bash
# Login to npm
npm login

# Verify package contents
npm publish --dry-run
```

### 4. Publish

```bash
# First release
npm publish

# Future releases
npm version patch  # or minor/major
npm publish
```

## 🔄 Development Workflow

### Local Development
```bash
npm run dev
# Opens test.html on http://localhost:3000
```

### Making Changes
1. Edit `src/define-custom-element-with-diagram.js` or `src/diagram/DiagramRenderer.js`
2. Test in browser at `http://localhost:3000`
3. Build with `npm run build`
4. Publish with `npm publish`

## 🎯 Future TypeScript Migration

When ready to convert to TypeScript:

1. Rename `.js` files to `.ts`
2. Add TypeScript dependencies:
   ```bash
   npm install -D typescript @types/node
   ```
3. Update `vite.config.mjs` for TypeScript
4. Add type definitions for better DX

## 📋 Checklist Before Publishing

- [ ] Update version in `package.json`
- [ ] Test build with `npm run build`
- [ ] Verify test.html works with built files
- [ ] Update README.md if needed
- [ ] Commit all changes
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push to GitHub: `git push origin main --tags`
- [ ] Publish to npm: `npm publish`

## 🌟 Package Features

- **Tree-shakeable** ES modules
- **Universal** UMD build for browsers
- **Source maps** for debugging
- **Peer dependencies** for ACE editor
- **Semantic versioning**
- **Comprehensive documentation**

## 📄 Important Files

### `public/mode-dbml.js`
This file contains the DBML syntax highlighting definition for ACE editor. It's required for proper syntax highlighting in the editor panel. Users need to load this file separately or include it in their build process.

### Current Vite Config
The existing `vite.config.mjs` is configured for the old entry point. When setting up the standalone repo, make sure to use the updated configuration provided in step 3 above, which:
- Points to the correct entry file (`define-custom-element-with-diagram.js`)
- Uses proper library naming
- Includes external dependency handling
- Adds source maps and minification