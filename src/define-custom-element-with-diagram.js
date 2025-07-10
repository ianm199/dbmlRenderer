import { DiagramRenderer } from './diagram/DiagramRenderer.js';

/**
 * Custom element that provides an interactive DBML editor with real-time diagram visualization.
 * Features include syntax highlighting, zoom/pan controls, and draggable table relationships.
 */
class DbDiagramViewer extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    this.diagramRenderer = null;
    this._currentDbml = '';
  }
  
  /**
   * Called when the element is connected to the DOM.
   * Sets up the editor, diagram, and navigation controls.
   */
  connectedCallback() {
    if (!window.ace) {
      console.error('ACE editor not loaded');
      return;
    }
    
    this.widgetId = this.id || `widget-${Math.random().toString(36).substr(2, 9)}`;
    
    this.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      <div class="db-widget-container" style="display: flex; height: ${this.getAttribute('height') || '400px'}; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
        <div class="editor-panel" style="width: 50%; border-right: 1px solid #ddd; display: flex; flex-direction: column;">
          <div class="editor-header" style="background: #f5f5f5; padding: 8px 12px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 14px;">
            DBML Editor
          </div>
          <div id="ace-editor-${this.widgetId}" style="flex: 1;"></div>
        </div>
        <div class="diagram-panel" style="flex: 1; background: #fafafa; display: flex; flex-direction: column;">
          <div class="diagram-header" style="background: #f5f5f5; padding: 8px 12px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 14px;">
            Database Diagram
          </div>
          <div id="diagram-container-${this.widgetId}" style="flex: 1; position: relative; overflow: hidden;">
            <div class="zoom-controls" style="position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 5px; z-index: 100;">
              <button id="zoom-in-${this.widgetId}" class="zoom-btn" title="Zoom In">+</button>
              <div id="zoom-display-${this.widgetId}" class="zoom-display" title="Current Zoom Level">100%</div>
              <button id="zoom-standard-${this.widgetId}" class="zoom-btn zoom-btn-std" title="Standard Zoom (100%)">1:1</button>
              <button id="zoom-out-${this.widgetId}" class="zoom-btn" title="Zoom Out">−</button>
              <button id="pan-btn-${this.widgetId}" class="zoom-btn pan-btn" title="Toggle Pan Mode">🤏</button>
              <button id="reset-zoom-${this.widgetId}" class="zoom-btn" title="Reset Zoom & Position">⌂</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.isPanModeActive = false;
    
    this.initEditor();
    this.initDiagram();
    
    setTimeout(() => {
      this.initZoomControls();
      this.initPanMode();
    }, 0);
  }
  
  /**
   * Returns CSS styles for the widget components.
   */
  getStyles() {
    return `
      .db-widget-container * {
        box-sizing: border-box;
      }
      
      .editor-header, .diagram-header {
        font-family: Arial, sans-serif;
        color: #333;
        user-select: none;
      }
      
      .db-chart {
        background: #fafafa;
        width: 100%;
        height: 100%;
      }
      
      .db-table {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .db-table:hover {
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
      }
      
      .db-table-header__name {
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        fill: white;
        user-select: none;
        pointer-events: none;
      }
      
      .db-field__name {
        font-family: Arial, sans-serif;
        font-size: 12px;
        fill: #333;
        pointer-events: none;
        user-select: none;
      }
      
      .db-field__type {
        font-family: Arial, sans-serif;
        font-size: 11px;
        fill: #666;
        pointer-events: none;
        user-select: none;
      }
      
      .db-field:hover rect {
        fill: #e3f2fd !important;
      }
      
      .db-table__dragging {
        opacity: 0.8;
        filter: drop-shadow(0 8px 16px rgba(0,0,0,0.2));
      }
      
      .db-ref__path {
        stroke: #666;
        stroke-width: 2;
        fill: none;
        pointer-events: stroke;
        cursor: pointer;
      }
      
      .db-ref__path:hover {
        stroke: #2196F3;
        stroke-width: 3;
      }
      
      .ace_editor {
        font-size: 14px !important;
      }
      
      .zoom-btn {
        width: 32px;
        height: 32px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      }
      
      .zoom-btn:hover {
        background: #f5f5f5;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      
      .zoom-btn:active {
        transform: translateY(1px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      
      .zoom-btn-std {
        font-size: 11px;
        font-weight: bold;
      }
      
      .zoom-display {
        width: 32px;
        height: 24px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: #666;
        user-select: none;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
      }
      
      .pan-btn {
        background: #f0f0f0;
        transition: all 0.2s ease;
      }
      
      .pan-btn:hover {
        background: #e3f2fd;
        border-color: #2196f3;
      }
      
      .pan-btn.active {
        background: #2196f3;
        color: white;
        border-color: #1976d2;
      }
      
      .pan-btn.active:hover {
        background: #1976d2;
      }
    `;
  }
  
  /**
   * Initializes the ACE editor with DBML syntax highlighting and change detection.
   */
  initEditor() {
    const editorId = `ace-editor-${this.widgetId}`;
    
    try {
      this.editor = ace.edit(editorId);
      this.editor.setTheme(`ace/theme/${this.getAttribute('theme') || 'dracula'}`);
      this.editor.session.setMode('ace/mode/dbml');
      
      const initialDbml = this.getAttribute('dbml') || this.getDefaultDbml();
      this.editor.setValue(initialDbml, -1);
      this._currentDbml = initialDbml;
      
      this.editor.setOptions({
        fontSize: '14px',
        showPrintMargin: false,
        tabSize: 2,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
      });
      
      const isEditable = this.getAttribute('editable') !== 'false';
      this.editor.setReadOnly(!isEditable);
      
      let timeout;
      this.editor.on('change', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.onDbmlChange();
        }, 300);
      });
    } catch (error) {
      console.error('Failed to initialize ACE editor:', error);
    }
  }
  
  /**
   * Initializes the diagram renderer and sets up zoom change callbacks.
   */
  initDiagram() {
    const containerId = `diagram-container-${this.widgetId}`;
    const container = document.getElementById(containerId);
    
    if (container) {
      this.diagramRenderer = new DiagramRenderer(container);
      
      this.diagramRenderer.onZoomChange = (zoom) => {
        this.updateZoomDisplay(zoom);
      };
      
      this.updateZoomDisplay(1.0);
      this.renderDiagram();
    }
  }

  /**
   * Initializes zoom control buttons and sets up their event handlers.
   */
  initZoomControls() {
    const elementId = this.widgetId;
    
    const zoomInBtn = this.querySelector(`#zoom-in-${elementId}`);
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (this.diagramRenderer) {
          this.diagramRenderer.zoomIn();
        }
      });
    }
    
    const zoomOutBtn = this.querySelector(`#zoom-out-${elementId}`);
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (this.diagramRenderer) {
          this.diagramRenderer.zoomOut();
        }
      });
    }
    
    const standardZoomBtn = this.querySelector(`#zoom-standard-${elementId}`);
    if (standardZoomBtn) {
      standardZoomBtn.addEventListener('click', () => {
        if (this.diagramRenderer) {
          this.diagramRenderer.zoomToStandard();
        }
      });
    }
    
    const resetZoomBtn = this.querySelector(`#reset-zoom-${elementId}`);
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => {
        if (this.diagramRenderer) {
          this.diagramRenderer.resetZoom();
        }
      });
    }
  }

  /**
   * Initializes pan mode button and keyboard shortcuts for temporary pan preview.
   */
  initPanMode() {
    const elementId = this.widgetId;
    
    const panBtn = this.querySelector(`#pan-btn-${elementId}`);
    if (panBtn) {
      panBtn.addEventListener('click', () => {
        this.togglePanMode();
      });
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift' && !this.isPanModeActive) {
        this.showTemporaryPanMode();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift' && !this.isPanModeActive) {
        this.hideTemporaryPanMode();
      }
    });
  }

  /**
   * Toggles pan mode on/off and updates UI accordingly.
   */
  togglePanMode() {
    this.isPanModeActive = !this.isPanModeActive;
    this.updatePanModeUI();
    this.updateDiagramCursor();
  }

  /**
   * Shows temporary pan mode visual feedback when Shift key is held.
   */
  showTemporaryPanMode() {
    if (!this.isPanModeActive) {
      this.updateDiagramCursor(true);
      const panBtn = this.querySelector(`#pan-btn-${this.widgetId}`);
      if (panBtn) {
        panBtn.style.background = '#bbdefb';
        panBtn.style.borderColor = '#2196f3';
      }
    }
  }

  /**
   * Hides temporary pan mode visual feedback when Shift key is released.
   */
  hideTemporaryPanMode() {
    if (!this.isPanModeActive) {
      this.updateDiagramCursor(false);
      const panBtn = this.querySelector(`#pan-btn-${this.widgetId}`);
      if (panBtn && !panBtn.classList.contains('active')) {
        panBtn.style.background = '';
        panBtn.style.borderColor = '';
      }
    }
  }

  /**
   * Updates the pan button UI based on current pan mode state.
   */
  updatePanModeUI() {
    const panBtn = this.querySelector(`#pan-btn-${this.widgetId}`);
    if (panBtn) {
      if (this.isPanModeActive) {
        panBtn.classList.add('active');
        panBtn.title = 'Exit Pan Mode';
      } else {
        panBtn.classList.remove('active');
        panBtn.title = 'Toggle Pan Mode';
        panBtn.style.background = '';
        panBtn.style.borderColor = '';
      }
    }
  }

  /**
   * Updates the diagram cursor to reflect current pan state.
   */
  updateDiagramCursor(temporary = false) {
    const diagramContainer = this.querySelector(`#diagram-container-${this.widgetId}`);
    if (diagramContainer) {
      if (this.isPanModeActive || temporary) {
        diagramContainer.style.cursor = 'grab';
      } else {
        diagramContainer.style.cursor = 'default';
      }
    }
  }

  /**
   * Updates the zoom display with the current zoom percentage.
   */
  updateZoomDisplay(zoom) {
    const elementId = this.widgetId;
    const zoomDisplay = this.querySelector(`#zoom-display-${elementId}`);
    if (zoomDisplay) {
      const percentage = Math.round(zoom * 100);
      zoomDisplay.textContent = `${percentage}%`;
    }
  }
  
  onDbmlChange() {
    const value = this.editor.getValue();
    if (value !== this._currentDbml) {
      this._currentDbml = value;
      this.renderDiagram();
      
      this.dispatchEvent(new CustomEvent('dbml-change', {
        detail: { dbml: value },
        bubbles: true
      }));
    }
  }
  
  renderDiagram() {
    if (!this.diagramRenderer) return;
    
    try {
      // Parse DBML using the same parser as the original app
      const dbmlData = this.parseDbml(this._currentDbml);
      this.diagramRenderer.render(dbmlData);
    } catch (error) {
      console.error('DBML parsing error:', error);
      this.showDiagramError(error.message);
    }
  }
  
  parseDbml(dbmlCode) {
    // For now, create a simple parser that extracts basic table info
    // In a real implementation, you'd use @dbml/core here
    return this.simpleParseDml(dbmlCode);
  }
  
  simpleParseDml(dbmlCode) {
    // Simple regex-based parser for basic DBML structures
    const tables = [];
    const refs = [];
    
    // Extract tables
    const tableMatches = dbmlCode.match(/Table\s+(\w+)\s*\{([^}]*)\}/g);
    if (tableMatches) {
      tableMatches.forEach((tableMatch, index) => {
        const nameMatch = tableMatch.match(/Table\s+(\w+)/);
        const name = nameMatch ? nameMatch[1] : `table_${index}`;
        
        const fieldsContent = tableMatch.match(/\{([^}]*)\}/)[1];
        const fields = this.parseFields(fieldsContent);
        
        tables.push({
          id: index,
          name,
          fields
        });
      });
    }
    
    // Extract basic references - improved parsing
    const refMatches = dbmlCode.match(/Ref:\s*([^>]+)>\s*([^\n\r]+)/g);
    if (refMatches) {
      refMatches.forEach((refMatch, index) => {
        const match = refMatch.match(/Ref:\s*([^.]+)\.([^>\s]+)\s*>\s*([^.]+)\.([^\s\n\r]+)/);
        if (match) {
          const [, fromTable, fromField, toTable, toField] = match;
          refs.push({
            id: index,
            name: `${fromTable}_to_${toTable}`,
            fromTable: fromTable.trim(),
            fromField: fromField.trim(),
            toTable: toTable.trim(),
            toField: toField.trim()
          });
        }
      });
    }
    
    return {
      schemas: [{
        tables,
        refs
      }]
    };
  }
  
  parseFields(fieldsContent) {
    const fields = [];
    const lines = fieldsContent.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//')) {
        const parts = trimmed.split(/\s+/);
        const name = parts[0];
        const type = parts[1] || 'varchar';
        const isPk = trimmed.includes('[pk]');
        
        fields.push({
          id: index,
          name,
          type: { type_name: type },
          pk: isPk
        });
      }
    });
    
    return fields;
  }
  
  showDiagramError(message) {
    if (this.diagramRenderer && this.diagramRenderer.container) {
      this.diagramRenderer.container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #d32f2f; font-family: Arial, sans-serif;">
          <div style="text-align: center;">
            <div style="font-size: 18px; margin-bottom: 8px;">⚠️ Parse Error</div>
            <div style="font-size: 14px;">${message}</div>
          </div>
        </div>
      `;
    }
  }
  
  getDefaultDbml() {
    return `Table users {
  id int [pk]
  username varchar
  email varchar [unique]
  created_at timestamp
}

Table posts {
  id int [pk]
  user_id int [ref: > users.id]
  title varchar
  content text
  created_at timestamp
}`;
  }
  
  // Watch for attribute changes
  static get observedAttributes() {
    return ['dbml', 'editable', 'theme'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.editor || oldValue === newValue) return;
    
    switch (name) {
      case 'dbml':
        this.editor.setValue(newValue || '', -1);
        this._currentDbml = newValue || '';
        this.renderDiagram();
        break;
      case 'editable':
        this.editor.setReadOnly(newValue === 'false');
        break;
      case 'theme':
        this.editor.setTheme(`ace/theme/${newValue || 'dracula'}`);
        break;
    }
  }
  
  disconnectedCallback() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }
  
  // Helper methods
  getDbml() {
    return this.editor ? this.editor.getValue() : '';
  }
  
  setDbml(dbml) {
    if (this.editor) {
      this.editor.setValue(dbml || '', -1);
    }
  }
}

// Register the custom element
if (!customElements.get('db-diagram-viewer')) {
  customElements.define('db-diagram-viewer', DbDiagramViewer);
  console.log('Custom element db-diagram-viewer registered with diagram support');
}