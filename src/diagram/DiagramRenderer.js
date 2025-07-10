/**
 * Core diagram renderer that creates interactive SVG database diagrams.
 * Handles table rendering, relationship lines, zoom/pan interactions, and drag operations.
 */
export class DiagramRenderer {
  constructor(container) {
    this.container = container;
    this.svg = null;
    this.tables = new Map();
    this.relationships = new Map();
    this.state = {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      tables: new Map(),
      refs: new Map()
    };
    this.gridSize = 100;
    this.gridSnap = 5;
    
    this.isPanning = false;
    this.lastPanPoint = { x: 0, y: 0 };
    this.minZoom = 0.25;
    this.maxZoom = 3.0;
    
    this.init();
  }
  
  /**
   * Initializes the SVG diagram with layers and interaction handlers.
   */
  init() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('db-chart');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.background = '#fafafa';
    
    this.createSVGStructure();
    
    const existingSvg = this.container.querySelector('svg.db-chart');
    if (existingSvg) {
      this.container.replaceChild(this.svg, existingSvg);
    } else {
      this.container.appendChild(this.svg);
    }
    
    this.setupZoomPan();
  }
  
  createSVGStructure() {
    // Background layer
    const bgLayer = this.createSVGElement('g', { id: 'background-layer' });
    const bgRect = this.createSVGElement('rect', {
      class: 'db-chart__bg',
      width: '100%',
      height: '100%',
      fill: '#ffffff'
    });
    bgLayer.appendChild(bgRect);
    
    // Add defs for arrowheads
    const defs = this.createSVGElement('defs');
    const marker = this.createSVGElement('marker', {
      id: 'arrowhead',
      markerWidth: '10',
      markerHeight: '7',
      refX: '9',
      refY: '3.5',
      orient: 'auto',
      markerUnits: 'strokeWidth'
    });
    const arrowPath = this.createSVGElement('polygon', {
      points: '0 0, 10 3.5, 0 7',
      fill: '#666'
    });
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    this.svg.appendChild(defs);
    
    // Main viewport layer
    const viewportLayer = this.createSVGElement('g', { id: 'viewport-layer' });
    
    // Relationships layer (behind tables)
    const refsLayer = this.createSVGElement('g', { id: 'refs-layer' });
    viewportLayer.appendChild(refsLayer);
    
    // Tables layer
    const tablesLayer = this.createSVGElement('g', { id: 'tables-layer' });
    viewportLayer.appendChild(tablesLayer);
    
    this.svg.appendChild(bgLayer);
    this.svg.appendChild(viewportLayer);
    
    // Store references
    this.layers = {
      background: bgLayer,
      viewport: viewportLayer,
      tables: tablesLayer,
      refs: refsLayer
    };
  }
  
  createSVGElement(tagName, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }
  
  render(dbmlData) {
    if (!dbmlData || !dbmlData.schemas || !dbmlData.schemas[0]) {
      this.clearDiagram();
      return;
    }
    
    const schema = dbmlData.schemas[0];
    
    this.clearDiagram();
    this.renderTables(schema.tables || []);
    this.renderRelationships(schema.refs || []);
    this.autoLayout();
  }
  
  clearDiagram() {
    this.layers.tables.innerHTML = '';
    this.layers.refs.innerHTML = '';
    this.tables.clear();
    this.relationships.clear();
  }
  
  renderTables(tables) {
    tables.forEach((table, index) => {
      const tableRenderer = new TableRenderer(table, this);
      const tableElement = tableRenderer.render();
      
      // Position table (simple grid layout for now)
      const x = (index % 3) * 300 + 50;
      const y = Math.floor(index / 3) * 250 + 50;
      
      tableElement.setAttribute('x', x);
      tableElement.setAttribute('y', y);
      
      // Add dragging functionality
      this.makeDraggable(tableElement, table);
      
      this.layers.tables.appendChild(tableElement);
      this.tables.set(table.id || table.name, {
        table,
        renderer: tableRenderer,
        element: tableElement,
        x,
        y,
        width: 250,
        height: 35 + (table.fields.length * 30)
      });
    });
  }
  
  renderRelationships(refs) {
    refs.forEach(ref => {
      const refRenderer = new RelationshipRenderer(ref, this);
      const refElement = refRenderer.render();
      
      if (refElement) {
        this.layers.refs.appendChild(refElement);
        this.relationships.set(ref.id || ref.name, {
          ref,
          renderer: refRenderer,
          element: refElement
        });
      }
    });
  }
  
  autoLayout() {
    // Simple auto-layout to prevent overlapping
    // This is a basic implementation - can be enhanced later
    const tables = Array.from(this.tables.values());
    
    tables.forEach((tableData, index) => {
      const cols = 3;
      const spacing = 300;
      const x = (index % cols) * spacing + 50;
      const y = Math.floor(index / cols) * 250 + 50;
      
      tableData.x = x;
      tableData.y = y;
      tableData.element.setAttribute('x', x);
      tableData.element.setAttribute('y', y);
    });
    
    // Update relationship lines after table positioning
    this.relationships.forEach(relData => {
      relData.renderer.updatePath();
    });
  }
  
  getTablePosition(tableId) {
    const tableData = this.tables.get(tableId);
    return tableData ? { x: tableData.x, y: tableData.y } : { x: 0, y: 0 };
  }
  
  makeDraggable(element, table) {
    let isDragging = false;
    let startX, startY, startMouseX, startMouseY;
    
    const header = element.querySelector('.db-table-header');
    if (!header) return;
    
    header.style.cursor = 'grab';
    
    const onMouseDown = (e) => {
      isDragging = true;
      header.style.cursor = 'grabbing';
      element.classList.add('db-table__dragging');
      
      this.setAllTablesOpacity(0.3);
      element.style.opacity = '0.8';
      
      const rect = this.svg.getBoundingClientRect();
      startMouseX = e.clientX - rect.left;
      startMouseY = e.clientY - rect.top;
      startX = parseFloat(element.getAttribute('x'));
      startY = parseFloat(element.getAttribute('y'));
      
      e.preventDefault();
      e.stopPropagation();
    };
    
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const rect = this.svg.getBoundingClientRect();
      const currentMouseX = e.clientX - rect.left;
      const currentMouseY = e.clientY - rect.top;
      
      const deltaX = currentMouseX - startMouseX;
      const deltaY = currentMouseY - startMouseY;
      
      const newX = startX + deltaX;
      const newY = startY + deltaY;
      
      const viewportWidth = this.svg.clientWidth / this.state.zoom;
      const viewportHeight = this.svg.clientHeight / this.state.zoom;
      const constrainedX = Math.max(-1000, Math.min(newX, viewportWidth + 1000));
      const constrainedY = Math.max(-1000, Math.min(newY, viewportHeight + 1000));
      
      element.setAttribute('x', constrainedX);
      element.setAttribute('y', constrainedY);
      
      const tableData = this.tables.get(table.id || table.name);
      if (tableData) {
        tableData.x = constrainedX;
        tableData.y = constrainedY;
      }
      
      this.updateAllRelationships();
    };
    
    const onMouseUp = () => {
      isDragging = false;
      header.style.cursor = 'grab';
      element.classList.remove('db-table__dragging');
      
      this.setAllTablesOpacity(1.0);
    };
    
    header.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  updateAllRelationships() {
    this.relationships.forEach(relData => {
      relData.renderer.updatePath();
    });
  }

  setAllTablesOpacity(opacity) {
    this.tables.forEach(tableData => {
      tableData.element.style.opacity = opacity;
    });
  }

  /**
   * Sets up mouse wheel zoom and pan interactions.
   */
  setupZoomPan() {
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.state.zoom * zoomFactor));
      
      if (newZoom !== this.state.zoom) {
        const zoomPoint = this.screenToWorld(mouseX, mouseY);
        
        this.state.zoom = newZoom;
        
        const newScreenPoint = this.worldToScreen(zoomPoint.x, zoomPoint.y);
        this.state.pan.x += mouseX - newScreenPoint.x;
        this.state.pan.y += mouseY - newScreenPoint.y;
        
        this.updateViewport();
        
        if (this.onZoomChange) {
          this.onZoomChange(this.state.zoom);
        }
      }
    });
    
    this.svg.addEventListener('mousedown', (e) => {
      const isPanModeActive = this.container.closest('db-diagram-viewer')?.isPanModeActive;
      
      if (e.button === 1 || (e.button === 0 && (e.shiftKey || isPanModeActive))) {
        e.preventDefault();
        this.startPan(e);
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.updatePan(e);
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.endPan();
      }
    });
    
    this.svg.addEventListener('contextmenu', (e) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    });
  }

  startPan(e) {
    this.isPanning = true;
    this.lastPanPoint = { x: e.clientX, y: e.clientY };
    this.svg.style.cursor = 'grabbing';
    
    const diagramContainer = this.container.closest('db-diagram-viewer')?.querySelector(`[id*="diagram-container"]`);
    if (diagramContainer) {
      diagramContainer.style.cursor = 'grabbing';
    }
  }

  updatePan(e) {
    if (!this.isPanning) return;
    
    const deltaX = e.clientX - this.lastPanPoint.x;
    const deltaY = e.clientY - this.lastPanPoint.y;
    
    this.state.pan.x += deltaX;
    this.state.pan.y += deltaY;
    
    this.lastPanPoint = { x: e.clientX, y: e.clientY };
    this.updateViewport();
  }

  endPan() {
    this.isPanning = false;
    this.svg.style.cursor = 'default';
    
    const widget = this.container.closest('db-diagram-viewer');
    const diagramContainer = widget?.querySelector(`[id*="diagram-container"]`);
    if (diagramContainer && widget) {
      diagramContainer.style.cursor = widget.isPanModeActive ? 'grab' : 'default';
    }
  }

  updateViewport() {
    const transform = `translate(${this.state.pan.x}, ${this.state.pan.y}) scale(${this.state.zoom})`;
    this.layers.viewport.setAttribute('transform', transform);
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.state.pan.x) / this.state.zoom,
      y: (screenY - this.state.pan.y) / this.state.zoom
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.state.zoom + this.state.pan.x,
      y: worldY * this.state.zoom + this.state.pan.y
    };
  }

  zoomIn() {
    const newZoom = Math.min(this.maxZoom, this.state.zoom * 1.1);
    this.setZoom(newZoom);
  }

  zoomOut() {
    const newZoom = Math.max(this.minZoom, this.state.zoom / 1.1);
    this.setZoom(newZoom);
  }

  zoomToStandard() {
    this.setZoom(1.0);
  }

  resetZoom() {
    this.state.zoom = 1.0;
    this.state.pan = { x: 0, y: 0 };
    this.updateViewport();
    
    if (this.onZoomChange) {
      this.onZoomChange(this.state.zoom);
    }
  }

  setZoom(zoom) {
    this.state.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.updateViewport();
    
    if (this.onZoomChange) {
      this.onZoomChange(this.state.zoom);
    }
  }

  getZoomPercentage() {
    return Math.round(this.state.zoom * 100);
  }
  
  findTableByName(tableName) {
    for (const [key, tableData] of this.tables.entries()) {
      if (tableData.table.name === tableName) {
        return tableData;
      }
    }
    return null;
  }
  
  getFieldPosition(tableName, fieldName) {
    const tableData = this.findTableByName(tableName);
    if (!tableData) return { x: 0, y: 0, side: 'right' };
    
    const fieldIndex = tableData.table.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) {
      return { 
        x: tableData.x + tableData.width, 
        y: tableData.y + tableData.height / 2,
        side: 'right'
      };
    }
    
    const fieldY = tableData.y + 35 + (fieldIndex * 30) + 15;
    
    return {
      x: tableData.x + tableData.width,
      y: fieldY,
      side: 'right'
    };
  }
  
  getFieldInputPosition(tableName, fieldName) {
    const tableData = this.findTableByName(tableName);
    if (!tableData) return { x: 0, y: 0, side: 'left' };
    
    const fieldIndex = tableData.table.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) {
      return { 
        x: tableData.x, 
        y: tableData.y + tableData.height / 2,
        side: 'left'
      };
    }
    
    const fieldY = tableData.y + 35 + (fieldIndex * 30) + 15;
    
    return {
      x: tableData.x,
      y: fieldY,
      side: 'left'
    };
  }
}

/**
 * Renders individual database tables as SVG elements with headers and fields.
 */
export class TableRenderer {
  constructor(table, diagramRenderer) {
    this.table = table;
    this.diagram = diagramRenderer;
    this.width = 250;
    this.headerHeight = 35;
    this.fieldHeight = 30;
  }
  
  render() {
    const height = this.headerHeight + (this.table.fields.length * this.fieldHeight);
    
    const tableGroup = this.diagram.createSVGElement('svg', {
      class: 'db-table',
      width: this.width,
      height: height
    });
    
    const background = this.diagram.createSVGElement('rect', {
      class: 'db-table__background',
      width: this.width,
      height: height,
      fill: 'white',
      stroke: '#e0e0e0',
      'stroke-width': '1',
      rx: '4'
    });
    tableGroup.appendChild(background);
    
    const header = this.renderHeader();
    tableGroup.appendChild(header);
    
    const fieldsGroup = this.diagram.createSVGElement('g', { class: 'db-table-fields' });
    this.table.fields.forEach((field, index) => {
      const fieldElement = this.renderField(field, index);
      fieldsGroup.appendChild(fieldElement);
    });
    tableGroup.appendChild(fieldsGroup);
    
    return tableGroup;
  }
  
  renderHeader() {
    const headerGroup = this.diagram.createSVGElement('g', { class: 'db-table-header' });
    
    const headerBg = this.diagram.createSVGElement('rect', {
      width: this.width,
      height: this.headerHeight,
      fill: '#2196F3',
      rx: '4'
    });
    headerGroup.appendChild(headerBg);
    
    const nameText = this.diagram.createSVGElement('text', {
      class: 'db-table-header__name',
      x: '12',
      y: '22',
      fill: 'white',
      'font-weight': 'bold',
      'font-size': '14px',
      'font-family': 'Arial, sans-serif'
    });
    nameText.textContent = this.table.name;
    headerGroup.appendChild(nameText);
    
    return headerGroup;
  }
  
  renderField(field, index) {
    const y = this.headerHeight + (index * this.fieldHeight);
    
    const fieldGroup = this.diagram.createSVGElement('g', { 
      class: 'db-field',
      'data-field-id': field.id || field.name
    });
    
    const fieldBg = this.diagram.createSVGElement('rect', {
      width: this.width,
      height: this.fieldHeight,
      y: y,
      fill: index % 2 === 0 ? '#fafafa' : '#ffffff',
      stroke: '#f0f0f0',
      'stroke-width': '0.5'
    });
    fieldGroup.appendChild(fieldBg);
    
    const nameText = this.diagram.createSVGElement('text', {
      class: 'db-field__name',
      x: '12',
      y: y + 20,
      'font-size': '12px',
      'font-family': 'Arial, sans-serif',
      fill: '#333'
    });
    nameText.textContent = field.name;
    fieldGroup.appendChild(nameText);
    
    const typeText = this.diagram.createSVGElement('text', {
      class: 'db-field__type',
      x: this.width - 12,
      y: y + 20,
      'text-anchor': 'end',
      'font-size': '11px',
      'font-family': 'Arial, sans-serif',
      fill: '#666'
    });
    typeText.textContent = field.type?.type_name || 'unknown';
    fieldGroup.appendChild(typeText);
    
    if (field.pk) {
      const pkIcon = this.diagram.createSVGElement('circle', {
        cx: '6',
        cy: y + 15,
        r: '3',
        fill: '#ff9800',
        stroke: '#fff',
        'stroke-width': '1'
      });
      fieldGroup.appendChild(pkIcon);
      
      nameText.setAttribute('x', '16');
      nameText.setAttribute('font-weight', 'bold');
      nameText.setAttribute('fill', '#ff9800');
    }
    
    const isForeignKey = field.name.endsWith('_id') && !field.pk;
    if (isForeignKey) {
      const fkIcon = this.diagram.createSVGElement('circle', {
        cx: this.width - 12,
        cy: y + 15,
        r: '2',
        fill: '#2196F3',
        stroke: '#fff',
        'stroke-width': '1'
      });
      fieldGroup.appendChild(fkIcon);
    }
    
    return fieldGroup;
  }
}

/**
 * Renders relationship lines between database tables.
 */
export class RelationshipRenderer {
  constructor(ref, diagramRenderer) {
    this.ref = ref;
    this.diagram = diagramRenderer;
    this.element = null;
  }
  
  render() {
    const relInfo = this.parseRelationship();
    if (!relInfo) return null;
    
    this.element = this.diagram.createSVGElement('path', {
      class: 'db-ref__path',
      stroke: '#666',
      'stroke-width': '2',
      fill: 'none',
      'marker-end': 'url(#arrowhead)'
    });
    
    this.relInfo = relInfo;
    this.updatePath();
    return this.element;
  }
  
  parseRelationship() {
    if (this.ref.fromTable && this.ref.toTable) {
      return {
        fromTable: this.ref.fromTable,
        fromField: this.ref.fromField,
        toTable: this.ref.toTable,
        toField: this.ref.toField
      };
    }
    
    if (this.ref.name && this.ref.name.includes('_to_')) {
      const parts = this.ref.name.split('_to_');
      if (parts.length === 2) {
        return {
          fromTable: parts[0],
          fromField: 'id',
          toTable: parts[1],
          toField: 'id'
        };
      }
    }
    
    return null;
  }
  
  updatePath() {
    if (!this.element || !this.relInfo) return;
    
    const fromTableData = this.diagram.findTableByName(this.relInfo.fromTable);
    const toTableData = this.diagram.findTableByName(this.relInfo.toTable);
    
    if (!fromTableData || !toTableData) return;
    
    const fromPos = this.getConnectionPoint(fromTableData, this.relInfo.fromField, toTableData);
    const toPos = this.getConnectionPoint(toTableData, this.relInfo.toField, fromTableData, true);
    
    const path = this.createManhattanPath(fromPos, toPos);
    this.element.setAttribute('d', path);
  }
  
  getConnectionPoint(tableData, fieldName, otherTableData, isTarget = false) {
    const fieldIndex = tableData.table.fields.findIndex(f => f.name === fieldName);
    const fieldY = fieldIndex === -1 
      ? tableData.y + tableData.height / 2
      : tableData.y + 35 + (fieldIndex * 30) + 15;
    
    const fieldCenterX = tableData.x + 50;
    
    return {
      x: fieldCenterX,
      y: fieldY,
      side: 'center'
    };
  }
  
  /**
   * Creates a Manhattan-style path (right angles) between connection points.
   */
  createManhattanPath(start, end) {
    const startX = start.x;
    const startY = start.y;
    const endX = end.x;
    const endY = end.y;
    
    if (Math.abs(startY - endY) < 15) {
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
    
    const tableMargin = 20;
    const targetTableX = endX - 50;
    const bendX = targetTableX - tableMargin;
    
    return `M ${startX} ${startY} L ${bendX} ${startY} L ${bendX} ${endY} L ${endX} ${endY}`;
  }
}