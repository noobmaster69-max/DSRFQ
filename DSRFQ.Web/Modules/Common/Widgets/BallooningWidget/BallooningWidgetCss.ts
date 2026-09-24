export function BallooningWidgetCss() :string {
    return `<style>
        :root {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --danger-color: #dc2626;
  --danger-bg: #fef2f2;
  --danger-border: #fecaca;
  --text-main: #1f2937;
  --text-muted: #6b7280;
  --bg-main: #f9fafb;
  --bg-panel: #ffffff;
  --border-color: #e5e7eb;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-main);
  background-color: var(--bg-main);
}

/* Layout Containers */
#root {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.ab-app-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  width: 100%;
  position: relative;
}

.ab-workspace {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
}

/* Toolbar */
.ab-toolbar {
  height: 80px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
  flex-shrink: 0;
  overflow-x: auto;
  /* Explicit, and not just tidiness: setting overflow-x alone makes the
     computed overflow-y auto as well, so the couple of pixels by which the
     buttons can exceed the height above were enough to put a vertical
     scrollbar on the toolbar. It is a fixed-height strip with nothing to
     scroll down to. */
  overflow-y: hidden;
  white-space: nowrap;
}

.ab-toolbar-group {
  display: flex;
  gap: 8px;
  padding-right: 16px;
  border-right: 1px solid var(--border-color);
  align-items: center;
}

.ab-toolbar-group:last-child {
  border-right: none;
}

/* Buttons */
.ab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ab-btn:hover:not(:disabled) {
  background-color: var(--bg-main);
  border-color: var(--border-color);
}

.ab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ab-btn.active {
  background-color: #eff6ff;
  color: var(--primary-color);
  border-color: #bfdbfe;
}

.ab-btn-primary {
  background-color: var(--primary-color);
  color: white;
  flex-direction: row;
  gap: 6px;
}

.ab-btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.ab-btn-danger {
  background-color: var(--danger-bg);
  color: var(--danger-color);
  border-color: var(--danger-border);
}

.ab-btn-danger:hover:not(:disabled) {
  background-color: #fee2e2;
}

.ab-btn-icon {
  padding: 6px;
  flex-direction: row;
}

/* Viewport & Canvas */
.ab-viewport {
  flex-grow: 1;
  background-color: #f3f4f6;
  overflow: auto;
  position: relative;
  user-select: none;
}

.ab-canvas-container {
  position: absolute;
  background-color: white;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform-origin: top left;
}

.ab-image {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
}

.ab-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

/* Annotations & Overlays */
.ab-overlay-mask {
  position: absolute;
  background-color: rgba(239, 68, 68, 0.2);
  border: 1px solid #b91c1c;
  pointer-events: auto;
}

.ab-annotation-box {
  position: absolute;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.2s;
  z-index: 10;
  background-color: rgba(121, 191, 247,0.2);
}

/* Only draggable in select mode, so the drawing tools can still draw on top of one. */
.ab-annotation-box.movable {
  cursor: move;
  user-select: none;
}

.ab-annotation-box:hover {
  border-color: #93c5fd;
}

.ab-annotation-box.selected {
  /*border-color: var(--primary-color);*/
  z-index: 20;
}

.ab-annotation-bg {
  width: 100%;
  height: 100%;
}

.ab-annotation-box.selected .ab-annotation-bg {
  background-color: rgba(59, 130, 246, 0.1);
}

/* A datum feature is the surface the other characteristics are measured FROM,
   not one of them, so it is marked apart from the dimension boxes rather than
   left to be told apart by the small triangle in its text.
   The colour matches DATUM_COLOR (#c026d3) in BallooningStyle.ts, so the box
   and its balloon read as the same thing.
   The BORDER carries the datum, not the wash: .audited tints the inner
   .ab-annotation-bg green, and an audited datum has to stay identifiable. */
.ab-annotation-box.datum {
  background-color: rgba(192, 38, 211, 0.18);
  border-color: rgba(192, 38, 211, 0.6);
}

.ab-annotation-box.datum:hover {
  border-color: #c026d3;
}

.ab-balloon-badge {
  position: absolute;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  font-weight: bold;
  cursor: move;
  color: var(--primary-color);
  /*border:1px solid var(--primary-color);*/
  container-type: size;
  line-height: 1;
}
.ab-balloon-badge span {
  font-size: 50cqh;
  line-height: 1;
  display: inline-block;
  /*line-height: 1;*/
}
.ab-annotation-box.selected .ab-balloon-badge {
  background-color: var(--primary-color);
  transform: scale(1.1);
}

.ab-drawing-preview {
  position: absolute;
  /*border: 2px solid var(--primary-color);*/
  background-color: rgba(59, 130, 246, 0.1);
}

.ab-drawing-preview.mask-mode {
  border-color: #ef4444;
  background-color: rgba(239, 68, 68, 0.2);
}

/* Property Editor */
.ab-property-editor {
  width: 500px;
  background-color: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex:1;
  flex-shrink: 0;
  z-index: 20;
  height: 100%;
  min-height: 0; 
  box-shadow: -4px 0 15px -3px rgba(0, 0, 0, 0.1);
}
.ab-panel-content {
  padding: 16px;
  
  /* Take up remaining space */
  flex-grow: 1;
  
  /* Enable scrolling */
  overflow-y: auto;
  
  /* The Flexbox Fix: prevents the div from stretching beyond the parent container */
  min-height: 0; 
}

.ab-panel-header {
  padding: 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid var(--border-color);
  height: 70px;
  flex-shrink: 0;
}
.ab-panel-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border-top: 1px solid var(--border-color); 
  border-bottom: none; 
}
.ab-panel-title {
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  font-size: 1rem;
}

.ab-panel-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 4px 0 0 0;
}

.ab-form-group {
  margin-bottom: 12px;
}

.ab-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.ab-input, .ab-select, .ab-textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 14px;
  outline: none;
}

.ab-input:focus, .ab-select:focus, .ab-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.ab-textarea {
  resize: none;
  height: 80px;
  font-family: monospace;
}

/* The characteristic picker is a Serenity LookupEditor, so its markup is
   select2's rather than ours. It brings its own combobox styling from the
   theme; this only makes it fill the rail like the plain inputs beside it. */
.ab-feature-editor .select2-container,
.ab-feature-editor input,
.ab-tool-editor .select2-container,
.ab-tool-editor input { width: 100% !important; }

.ab-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* Table */
.ab-table-container {
  height: 25rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-panel);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width:100%;
  min-width: 40%;
}

.ab-table-header {
  padding: 8px 16px;
  background-color: #f3f4f6;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ab-table-wrapper {
  overflow: auto;
  flex-grow: 1;
}

.ab-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: left;
}

.ab-table th {
  background-color: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 8px 16px;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
}

.ab-table td {
  padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: var(--text-main);
}

.ab-table tr:hover {
  background-color: #eff6ff;
  cursor: pointer;
}

.ab-table tr.selected {
  background-color: #dbeafe;
}

/* Badges */
.ab-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ab-badge-pending { background-color: #f3f4f6; color: #4b5563; }
.ab-badge-review { background-color: #ffedd5; color: #c2410c; }
.ab-badge-approved { background-color: #dcfce7; color: #15803d; }

/* Modal */
.ab-modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  pointer-events: auto;
  z-index: 40;
}

.ab-modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 600px;
  max-width: 90%;
  z-index: 50;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -48%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}

.ab-modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.ab-modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: 70vh;
}

.ab-modal-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background-color: #f9fafb;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.ab-tol-table {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  font-size: 14px;
}

.ab-tol-table th {
  background-color: #f3f4f6;
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
}

.ab-tol-table td {
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
}

.ab-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ab-input-mini {
  width: 80px;
  text-align: center;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.hidden { display: none !important; }
.pointer-events-none { pointer-events: none; }

/* Container Overlay */
.progress-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.5); /* bg-black/50 */
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px); /* backdrop-blur-sm */
}

/* Helper to hide the element (standard Tailwind utility replacement) */
.progress-overlay.hidden {
  display: none;
}

/* Modal Box */
.progress-modal {
  background-color: #ffffff;
  padding: 1.5rem; /* p-6 */
  border-radius: 0.5rem; /* rounded-lg */
  width: 20rem; /* w-80 */
  text-align: center;
  /* shadow-xl approximation */
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
  0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Title */
.progress-title {
  font-weight: 600; /* font-semibold */
  color: #1f2937; /* text-gray-800 */
  margin-bottom: 1rem; /* mb-4 */
  margin-top: 0;
}

/* Progress Bar Background (Track) */
.progress-track {
  width: 100%;
  background-color: #e5e7eb; /* bg-gray-200 */
  border-radius: 9999px; /* rounded-full */
  height: 0.625rem; /* h-2.5 */
  margin-bottom: 0.5rem; /* mb-2 */
  overflow: hidden;
}

/* Progress Bar Foreground (Fill) */
.progress-fill {
  background-color: #2563eb; /* bg-blue-600 */
  height: 0.625rem; /* h-2.5 */
  border-radius: 9999px; /* rounded-full */
  transition: all 300ms ease; /* transition-all duration-300 */
}

/* Helper Text */
.progress-text {
  font-size: 0.75rem; /* text-xs */
  color: #6b7280; /* text-gray-500 */
  font-weight: 500; /* font-medium */
  margin: 0;
}
.ab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Icon sizing */
.btn-icon {
  width: 14px;   /* w-3.5 */
  height: 14px;  /* h-3.5 */
  margin-bottom: 2px;
}

/* Saving animation */
.ab-btn.is-saving .btn-icon {
  animation: bounce 1s infinite;
}

/* Bounce keyframes (Tailwind animate-bounce equivalent) */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-25%);
  }
}

/* Property Editor (PE) Styles */
.pe-header {
  padding: 1rem;
  background-color: #f9fafb; /* gray-50 */
  border-bottom: 1px solid #e5e7eb; /* gray-200 */
}

.pe-title {
  font-weight: 600;
  color: #374151; /* gray-700 */
  margin: 0;
  font-size: 1rem;
}

.pe-subtitle {
  font-size: 0.75rem; /* text-xs */
  color: #6b7280; /* gray-500 */
  margin: 0;
}

.pe-body {
  padding: 1rem;
}

.pe-warning {
  background-color: #fefce8; /* yellow-50 */
  border: 1px solid #fef08a; /* yellow-200 */
  border-radius: 0.25rem;
  padding: 0.75rem;
  font-size: 0.875rem; /* text-sm */
  color: #854d0e; /* yellow-800 */
  margin-bottom: 1rem;
}

.pe-label {
  font-size: 0.75rem; /* text-xs */
  font-weight: 500;
  color: #6b7280; /* gray-500 */
  margin-bottom: 0.5rem;
}

.pe-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  font-size: 0.75rem; /* text-xs */
  color: #4b5563; /* gray-600 */
}

.pe-footer {
  padding: 1rem;
  border-top: 1px solid #e5e7eb; /* gray-200 */
  background-color: #f9fafb; /* gray-50 */
}

.pe-btn-delete {
  width: 100%;
  background-color: white;
  border: 1px solid #d1d5db; /* gray-300 */
  color: #374151; /* gray-700 */
  padding: 0.375rem 0;
  border-radius: 0.25rem;
  font-size: 0.875rem; /* text-sm */
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-btn-delete:hover {
  background-color: #fef2f2; /* red-50 */
  color: #dc2626; /* red-600 */
  border-color: #fecaca; /* red-200 */
}

.pe-icon {
  width: 0.875rem;
  height: 0.875rem;
}
.pe-empty-state {
  width: 100%;
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af; /* gray-400 */
  font-size: 0.875rem; /* text-sm */
}

.pe-empty-subtext {
  font-size: 0.75rem; /* text-xs */
  margin-top: 0.25rem; /* mt-1 */
  margin-bottom: 0;
}
/* Container for the whole widget */
.bst-container {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--s-input-outline);; /* gray-200 */
  border-radius: 0.5rem;
  overflow: hidden;
  height: 100%; /* Adjust as needed */
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Header Section */
.bst-header {
  background-color: #f3f4f6; /* gray-100 */
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bst-title {
  font-weight: 600;
  font-size: 0.875rem; /* text-sm */
  margin: 0;
}

/* Button Base Styles */
.bst-btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

/* Add Button Specifics */
.bst-btn-add {
  color: #2563eb; /* blue-600 */
}

.bst-btn-add:hover {
  background-color: #dbeafe; /* blue-100 */
}

/* Table Layout */
.bst-table-wrapper {
  overflow: auto;
  flex-grow: 1;
}

.bst-table {
  width: 100%;
  text-align: left;
  font-size: 0.875rem; /* text-sm */
  border-collapse: collapse;
}

.bst-thead {
  background-color: #f9fafb; /* gray-50 */
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.bst-th {
  padding: 0.5rem 1rem;
  font-weight: 500;
  color: #4b5563; /* gray-600 */
  border-bottom: 1px solid #e5e7eb;
}

/* Table Rows and Cells */
.bst-row {
  border-bottom: 1px solid var(--s-input-outline);
}

.bst-row:hover {
  background-color: #f9fafb; /* gray-50 */
}

.bst-td {
  padding: 0.375rem 1rem;
  vertical-align: middle;
}

/* Input Fields */
.bst-input {
  width: 100%;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  padding: 0.25rem;
  outline: none;
  font-size: inherit;
  box-sizing: border-box; /* Ensures padding doesn't break width */
}

.bst-input:focus {
  background-color: #fff;
  border-color: #93c5fd; /* blue-300 */
  box-shadow: 0 0 0 1px #93c5fd;
}

/* Delete Button Specifics */
.bst-btn-delete {
  color: #9ca3af; /* gray-400 */
  opacity: 0; /* Hidden by default */
}

.bst-btn-delete:hover {
  color: #ef4444; /* red-500 */
}

/* Show delete button only when row is hovered */
.bst-row:hover .bst-btn-delete {
  opacity: 1;
}

/* Column Widths */
.col-description { width: 40%; }
.col-action { width: 2.5rem; }

/* --- Ballooning Widget Shared Styles (bw-) --- */

/* Container */
.bw-container {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  height: 100%;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
}

/* Header */
.bw-header {
  background-color: #f3f4f6;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bw-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  margin: 0;
}

/* Buttons */
.bw-btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.bw-btn-add {
  color: #2563eb; /* blue-600 */
}

.bw-btn-add:hover {
  background-color: #dbeafe; /* blue-100 */
}

.bw-btn-delete {
  color: #9ca3af; /* gray-400 */
  opacity: 0;
}

.bw-btn-delete:hover {
  color: #ef4444; /* red-500 */
}

/* Table Structure */
.bw-table-wrapper {
  overflow: auto;
  flex-grow: 1;
}

.bw-table {
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.bw-thead {
  background-color: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.bw-th {
  padding: 0.5rem 1rem;
  font-weight: 500;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
}

.bw-row {
  border-bottom: 1px solid #f3f4f6;
}

.bw-row:hover {
  background-color: #f9fafb;
}

/* Show delete button on row hover */
.bw-row:hover .bw-btn-delete {
  opacity: 1;
}

.bw-td {
  padding: 0.375rem 1rem;
  vertical-align: middle;
}

/* Inputs */
.bw-input {
  width: 100%;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  padding: 0.25rem;
  outline: none;
  font-size: inherit;
  box-sizing: border-box;
}

.bw-input:focus {
  background-color: #fff;
  border-color: #93c5fd; /* blue-300 */
  box-shadow: 0 0 0 1px #93c5fd;
}

.col-w24 { width: 6rem; }
.col-w10 { width: 2.5rem; }
.bw-panel-col {
  flex: 1 1 0%;        /* flex-1 */
  display: flex;       /* flex */
  flex-direction: column; /* flex-col */
  min-width: 0;        /* min-w-0 */
  background-color: #ffffff; /* bg-white */
  border-left: 1px solid #e5e7eb; /* border-l (gray-200) */
}
.bw-bottom-panel {
  height: 25rem; /* h-48 (192px) */
  border-top: 1px solid #e5e7eb; /* border-t */
  background-color: #ffffff; /* bg-white */
  display: flex; /* flex */
  flex-direction: row; /* flex-row */
  flex-shrink: 0; /* flex-shrink-0 */
  overflow: hidden; /* overflow-hidden */
  width:500px;
}

/* Replicate 'divide-x': Add left border to every child except the first one */
.bw-bottom-panel > * + * {
  border-left: 1px solid #e5e7eb;
}

/* --- Ballooning Summary Specifics --- */

/* Content Area */
.bw-summary-content {
  overflow-y: auto;
  overflow-x: hidden;
  flex-grow: 1;
  padding: 0.5rem;
}

/* Summary Row */
.bw-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem; /* py-2 px-2 */
  border-bottom: 1px solid #f9fafb; /* border-gray-50 */
  transition: background-color 0.2s;
}

.bw-summary-row:last-child {
  border-bottom: none;
}

.bw-summary-row:hover {
  background-color: #f9fafb; /* gray-50 */
}

/* Left Group (Dot + Text) */
.bw-summary-group {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* gap-2 */
}

/* Color Dot */
.bw-dot {
  width: 0.75rem; /* w-3 */
  height: 0.75rem; /* h-3 */
  border-radius: 9999px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

/* Text Truncation */
.bw-label-truncate {
  font-size: 0.875rem; /* text-sm */
  color: #374151; /* gray-700 */
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  display: block;
}

/* Count Badge */
.bw-badge {
  font-size: 0.875rem; /* text-sm */
  font-weight: 600;
  color: #4b5563; /* gray-600 */
  background-color: #f3f4f6; /* gray-100 */
  padding: 0.125rem 0.5rem; /* px-2 py-0.5 */
  border-radius: 9999px;
}

/* Meta Text (Total Count) */
.bw-meta-text {
  font-size: 0.75rem; /* text-xs */
  color: #6b7280; /* gray-500 */
  font-weight: 500;
}

/* Empty State */
.bw-empty-state {
  padding: 1rem;
  text-align: center;
  font-size: 0.75rem; /* text-xs */
  color: #9ca3af; /* gray-400 */
}
.bw-sidebar-fixed {
  width: 500px; /* w-64 */
  max-height: 200px;
  
  min-width: 16rem; /* min-w-[16rem] */
  display: flex; /* flex */
  flex-direction: column; /* flex-col */
  background-color: #ffffff; /* bg-white */
  border-left: 1px solid #e5e7eb; /* border-l */
}

/* Stamp box and resize handles styling */
.ab-stamp-box {
  position: absolute;
  cursor: move;
  border: 1px dashed transparent;
  user-select: none;
}

.ab-stamp-box:hover {
  border-color: #3b82f6;
}

.ab-stamp-box.selected {
  border: 1px solid #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}

/* Shared by stamp boxes and mask boxes */
.sb-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #ffffff;
  border: 2px solid #2563eb;
  border-radius: 50%;
  z-index: 10;
}

.sb-resize-handle.top-left {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}

.sb-resize-handle.top-right {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}

.sb-resize-handle.bottom-left {
  bottom: -4px;
  left: -4px;
  cursor: nesw-resize;
}

.sb-resize-handle.bottom-right {
  bottom: -4px;
  right: -4px;
  cursor: nwse-resize;
}
    .font-container {
            background: #fff;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 15px;
            max-width: 900px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header-title {
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 500;
        }
        /* Grid container replicating the main window layout in image_1382c1.png */
        .grid-container {
            border: 1px solid var(--border-color);
            height: 350px;
            overflow-y: scroll;
            display: grid;
            grid-template-columns: repeat(20, 1fr); /* 20 items per row */
            background-color: #fff;
        }
        .cell {
            border-right: 1px solid #eee;
            border-bottom: 1px solid #eee;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            cursor: pointer;
            user-select: none;
            font-family: Y14_5M;
        }
        .cell:hover {
            background-color: #e5f1fb;
            
        }
        .cell.selected {
            background-color: var(--bg-selected);
            color: var(--text-selected);
        }
        /* Bottom metadata display */
        .footer-pane {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .info-box {
            font-size: 13px;
        }
        .info-box span {
            font-weight: bold;
        }
       
        .loading {
            grid-column: span 20;
            text-align: center;
            padding: 40px;
            color: #666;
        }

        /* ── Areas ─────────────────────────────────────────────────────────
           A drawn area is a background wash, so it must not compete with the
           balloons on top of it: the fill is applied at 8% alpha inline (the
           palette colour plus "14") and only the border carries full colour. */
        .ab-region {
            position: absolute;
            border: 2px dashed;
            border-radius: 3px;
            pointer-events: auto;
            z-index: 1;
        }
        .ab-region.selected {
            border-style: solid;
            box-shadow: 0 0 0 2px rgba(255,255,255,.85), 0 2px 10px rgba(0,0,0,.28);
        }
        .ab-region-label {
            position: absolute;
            top: -1px; left: -1px;
            transform: translateY(-100%);
            display: flex; align-items: baseline; gap: 6px;
            padding: 2px 8px;
            border-radius: 3px 3px 0 0;
            color: #fff;
            font-size: 11px; font-weight: 600;
            white-space: nowrap;
            /* Zoom scales the whole canvas; without this the label grows with
               it and swamps the drawing at high magnification. */
            transform-origin: bottom left;
        }
        .ab-region-mode {
            font-weight: 400;
            opacity: .85;
            font-size: 10px;
        }
        .ab-region-swatch {
            display: inline-block;
            width: 10px; height: 10px;
            border-radius: 2px;
            margin-right: 6px;
        }

        /* ── Area right-click menu ────────────────────────────────────────
           Positioned against the widget rather than the canvas: the canvas is
           pan/zoom transformed, and a menu inside it would scale with the
           drawing. */
        .ab-context-menu {
            position: absolute;
            z-index: 60;
            min-width: 210px;
            padding: 4px;
            background: #fff;
            border: 1px solid #d7dce5;
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0,0,0,.18);
            font-size: 12px;
        }
        .ab-context-title {
            display: flex; align-items: center;
            padding: 5px 8px 7px;
            font-weight: 600;
            color: #334155;
            border-bottom: 1px solid #eef1f6;
            margin-bottom: 4px;
        }
        .ab-context-menu button {
            display: block; width: 100%;
            text-align: left;
            padding: 6px 8px;
            border: 0; background: none;
            border-radius: 4px;
            font-size: 12px; color: #1f2937;
            cursor: pointer;
        }
        .ab-context-menu button:hover:not(:disabled) { background: #eef2ff; }
        .ab-context-menu button:disabled { color: #b0b7c3; cursor: default; }
        .ab-context-menu button.danger { color: var(--danger-color, #dc2626); }
        .ab-context-menu button.danger:hover:not(:disabled) { background: #fef2f2; }
        .ab-context-sep { height: 1px; background: #eef1f6; margin: 4px 2px; }

        /* ── Area order list ──────────────────────────────────────────────── */
        .ab-order-list { list-style: none; margin: 0; padding: 0; }
        .ab-order-list li {
            display: flex; align-items: center; gap: 8px;
            padding: 7px 8px;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            margin-bottom: 6px;
            background: #fff;
            cursor: grab;
            font-size: 12px;
        }
        .ab-order-list li:active { cursor: grabbing; }
        .ab-order-pos {
            min-width: 18px; height: 18px;
            display: inline-flex; align-items: center; justify-content: center;
            border-radius: 9px;
            background: #eef2ff; color: #3730a3;
            font-size: 11px; font-weight: 600;
        }
        .ab-order-name { flex: 1; }
        .ab-order-list button {
            border: 1px solid #e5e7eb; background: #fff;
            border-radius: 4px; cursor: pointer;
            padding: 2px 7px; font-size: 11px; line-height: 1.4;
        }
        .ab-order-list button:hover:not(:disabled) { background: #eef2ff; }
        .ab-order-list button:disabled { color: #cbd2dc; cursor: default; }

        /* ── Balloon properties, stacked ───────────────────────────────────
           One field per layer, full width, so nothing is squeezed into half a
           300px rail. The only pair kept side by side is lower/upper, because
           a tolerance is one value read as two halves and splitting it across
           layers reads worse than the narrow boxes cost. */
        .ab-props { display: flex; flex-direction: column; gap: 10px; }
        .ab-props .ab-form-group { margin: 0; }
        .ab-props .ab-label {
            display: block;
            margin-bottom: 3px;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: .02em;
        }
        .ab-props .ab-input,
        .ab-props .ab-textarea {
            width: 100%;
            box-sizing: border-box;
        }
        /* The symbol carries GD&T glyphs, so it gets a face that has them and
           enough size to tell ⌀ from Ø at a glance. */
        /* Y14_5M is the ASME Y14.5M-2009 face, declared in site.css and already
           shipped at Content/site/Y145m2009-127e.ttf. It is what makes a
           feature control frame read as one - the fallbacks after it cover the
           plain characters on a machine where the face failed to load. */
        .ab-props .ab-symbol {
            font-family: 'Y14_5M', "Segoe UI Symbol", "Cambria Math", Consolas, monospace;
            font-size: 13px;
            line-height: 1.5;
            resize: vertical;
        }
        .ab-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .ab-props .ab-check {
            display: flex; align-items: center; gap: 6px;
            font-weight: 500; color: #334155; text-transform: none;
        }
        .ab-props .ab-check input { margin: 0; }

        .ab-props-more {
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
        }
        .ab-props-more > summary {
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            list-style: none;
            padding: 2px 0;
            user-select: none;
        }
        .ab-props-more > summary::-webkit-details-marker { display: none; }
        .ab-props-more > summary::before {
            content: "\\25B8";
            display: inline-block;
            width: 12px;
            transition: transform .12s ease;
        }
        .ab-props-more[open] > summary::before { transform: rotate(90deg); }
        .ab-props-more > summary:hover { color: #334155; }
        .ab-props-more > *:not(summary) { margin-top: 10px; }

        /* ── Batch selection ──────────────────────────────────────────────
           Which balloons are in the selection, named. A count alone ("40
           selected") is not checkable - the operator has to be able to see
           that row 7 got in by accident before they apply anything to it. */
        .ab-batch-list {
            margin: 0 0 8px;
            padding: 5px 7px;
            border-radius: 4px;
            background: rgba(255, 140, 0, .10);
            border: 1px solid rgba(255, 140, 0, .35);
            font-size: 11px;
            line-height: 1.45;
            color: #7c4a03;
            font-variant-numeric: tabular-nums;
            max-height: 4.5rem;
            overflow-y: auto;
        }
        :root[class*="-dark"] .ab-batch-list { color: #f0b27a; }

        /* ── Default tolerance dialog ─────────────────────────────────────
           The decimal-places grid. Narrow value columns because a tolerance is
           five characters at most, and the label column carries ".XXX" which
           has to stay readable beside them. */
        .ab-tol-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 12px;
        }
        .ab-tol-table th {
            text-align: left;
            font-weight: 600;
            color: #64748b;
            padding: 2px 6px;
            border-bottom: 1px solid #e5e7eb;
        }
        .ab-tol-table td { padding: 3px 6px; }
        .ab-tol-table td:first-child {
            width: 5rem;
            font-family: 'Y14_5M', Consolas, monospace;
            color: #334155;
        }
        .ab-tol-table td:nth-child(2), .ab-tol-table td:nth-child(3) { width: 8rem; }
        .ab-tol-table .ab-input { padding: 2px 6px; font-size: 12px; }

        /* ── Repeat instances of one balloon ──────────────────────────────
           44_2 onwards are the SAME balloon measured on another feature, so
           they are muted: the eye should read 44_1..44_4 as one group rather
           than four unrelated characteristics. The symbol is not repeated in
           bold either, for the same reason. */
        .ab-table tr.ab-row-instance td { color: #64748b; }
        .ab-table tr.ab-row-instance td:first-child { font-style: italic; }

        /* ── GD&T symbol palette ──────────────────────────────────────────
           Bottom RIGHT, unlike DS_ERP's bottom-left: the balloon editor is in
           the left rail here, so a palette on that side would cover the field
           it is feeding. */
        .ab-gdt-palette {
            position: absolute;
            right: 12px; bottom: 12px;
            z-index: 45;
            width: 550px;
            max-height: 72%;
            display: flex; flex-direction: column;
            background: #fff;
            border: 1px solid #d7dce5;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,.22);
        }
        .ab-gdt-head {
            display: flex; align-items: center; justify-content: space-between;
            padding: 7px 10px;
            border-bottom: 1px solid #eef1f6;
            font-size: 12px; font-weight: 600; color: #334155;
        }
        .ab-gdt-close {
            border: 0; background: none; cursor: pointer;
            font-size: 17px; line-height: 1; color: #94a3b8; padding: 0 2px;
        }
        .ab-gdt-close:hover { color: #334155; }
        .ab-gdt-search { padding: 8px 10px 6px; }
        .ab-gdt-filter {
            width: 100%; box-sizing: border-box;
            padding: 5px 8px;
            border: 1px solid #e5e7eb; border-radius: 5px;
            font-size: 12px;
        }
        .ab-gdt-filter:focus { outline: 2px solid #c7d2fe; outline-offset: -1px; }
        /* A fixed 10-column grid over a scrolling area, as in DS_ERP: the font
           carries a couple of hundred glyphs and they have to be scannable
           rather than reflowing into a different shape on every filter. */
        .ab-gdt-grid {
            flex: 1 1 auto;
            min-height: 140px;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            gap: 1px;
            padding: 0 10px 8px;
            background: #fff;
        }
        .ab-gdt-loading {
            grid-column: 1 / -1;
            padding: 22px 6px;
            text-align: center;
            font-size: 12px; color: #94a3b8;
        }
        .ab-gdt-error { color: var(--danger-color, #dc2626); }
        .ab-gdt-cell {
            aspect-ratio: 1;
            display: flex; align-items: center; justify-content: center;
            border: 1px solid #eef1f6; border-radius: 4px;
            background: #fff; cursor: pointer;
            /* The editor is the one place the Y14.5 face matters most: these
               glyphs are the whole point of it. Registered by the loader under
               its own family so it cannot collide with the site.css face. */
            font-family: 'Y14_5M_Editor', 'Y14_5M', "Segoe UI Symbol", serif;
            font-size: 19px; line-height: 1; color: #1f2937;
            padding: 0;
        }
        .ab-gdt-cell:hover { background: #eef2ff; border-color: #c7d2fe; }
        .ab-gdt-cell.selected {
            background: #e0e7ff; border-color: #818cf8;
            box-shadow: inset 0 0 0 1px #818cf8;
        }
        .ab-gdt-foot {
            display: flex; align-items: baseline; gap: 8px;
            padding: 6px 10px;
            border-top: 1px solid #eef1f6;
            font-size: 11px; color: #475569;
        }
        .ab-gdt-name {
            flex: 1; font-weight: 600;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ab-gdt-code { font-family: Consolas, monospace; color: #94a3b8; }

        /* ── Live progress from the pipeline ──────────────────────────────── */
        .ab-progress {
            display: flex; align-items: center; gap: 6px;
            max-width: 340px;
            font-size: 11px;
            color: #475569;
        }
        .ab-progress-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #2563eb; flex: 0 0 auto;
            animation: ab-pulse 1.4s ease-in-out infinite;
        }
        .ab-progress-text {
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        @keyframes ab-pulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: .25; }
        }

        /* ── Always-filter keywords ───────────────────────────────────────── */
        .ab-kw-list {
            list-style: none; margin: 10px 0 0; padding: 0;
            max-height: 210px; overflow-y: auto;
            border: 1px solid #e5e7eb; border-radius: 6px;
        }
        .ab-kw-list li {
            display: flex; align-items: center; gap: 8px;
            padding: 5px 8px;
            font-size: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .ab-kw-list li:last-child { border-bottom: 0; }
        .ab-kw-list li span { flex: 1; word-break: break-word; }
        .ab-kw-list li button {
            border: 1px solid #e5e7eb; background: #fff;
            border-radius: 4px; cursor: pointer;
            padding: 1px 7px; font-size: 12px; line-height: 1.4;
            color: var(--danger-color, #dc2626);
        }
        .ab-kw-list li button:hover { background: #fef2f2; }
        .ab-kw-empty { color: #94a3b8; font-style: italic; }
        .ab-kw-hits {
            margin-top: 10px;
            padding: 8px 10px;
            border-radius: 6px;
            background: #f1f5f9;
            font-size: 12px;
            line-height: 1.6;
        }
        .ab-kw-hits span { display: block; color: #64748b; font-size: 11px; }

        /* ── Default tolerance dialog ────────────────────────────────────
           One Supply's three tabs, with the tables editable in place. */
        .ab-modal.ab-tol-modal { width: 780px; max-width: 96%; }
        .ab-tol-tabs {
            display: flex; gap: 2px;
            padding: 8px 16px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .ab-tol-tab {
            border: 1px solid transparent; border-bottom: none;
            background: none; cursor: pointer;
            padding: 6px 12px; margin-bottom: -1px;
            font-size: 12px; color: #64748b;
            border-radius: 6px 6px 0 0;
        }
        .ab-tol-tab.active {
            background: #fff; border-color: #e5e7eb;
            color: #0f172a; font-weight: 600;
        }
        .ab-tol-bar {
            display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
            font-size: 12px; margin-bottom: 8px;
        }
        .ab-tol-bar > .ab-select { width: auto; min-width: 160px; flex: 0 1 240px; }
        .ab-tol-actions { display: flex; gap: 4px; flex-wrap: nowrap; margin-left: auto; }
        .ab-tol-actions .ab-btn { border: 1px solid #e5e7eb; padding: 3px 10px; font-size: 12px; }
        .ab-tol-inline { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; margin-right: 10px; }
        .ab-tol-inline .ab-select { width: auto; min-width: 140px; }
        .ab-tol-num { width: 90px; }
        .ab-tol-badge { color: #1d4ed8; font-weight: 600; font-size: 11px; }
        .ab-tol-namer {
            display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
            padding: 8px; margin-bottom: 8px;
            background: #f8fafc; border-radius: 6px; font-size: 12px;
        }
        .ab-tol-namer .ab-select { width: auto; }
        .ab-tol-namer .ab-input { width: 200px; }
        .ab-tol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ab-tol-block { margin-bottom: 10px; }
        .ab-tol-block-head {
            display: flex; align-items: center; justify-content: space-between;
            font-size: 12px; color: #334155;
        }
        .ab-tol-table.ab-tol-edit td:first-child { width: auto; font-family: inherit; }
        .ab-tol-table.ab-tol-edit td:nth-child(2),
        .ab-tol-table.ab-tol-edit td:nth-child(3) { width: auto; }
        .ab-tol-table.ab-tol-edit td:last-child:has(.ab-tol-x) { width: 1.5rem; }
        .ab-tol-edit .ab-input.ab-invalid { border-color: #dc2626; background: #fef2f2; }
        .ab-tol-add {
            border: none; background: none; cursor: pointer;
            color: #2563eb; font-size: 11px; padding: 2px 4px;
        }
        .ab-tol-add:hover { text-decoration: underline; }
        .ab-tol-x {
            border: none; background: none; cursor: pointer;
            color: #94a3b8; font-size: 15px; line-height: 1; padding: 0 4px;
        }
        .ab-tol-x:hover { color: #dc2626; }
        .ab-tol-empty { color: #94a3b8; font-size: 11px; text-align: center; }
        .ab-tol-warn { color: #b45309; font-size: 11px; margin: 0 0 8px; }
        .ab-tol-error { color: #b91c1c; font-size: 12px; }
        .ab-tol-ok { color: #15803d; font-size: 11px; }
        .ab-tol-excl { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; }
        .ab-tol-excl label { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; }
        /* A checkbox is a flex item here, and shrinks to a sliver without this. */
        .ab-tol-excl input { flex: 0 0 auto; width: 14px; height: 14px; margin: 2px 0 0; }
        .ab-tol-rules { margin: 4px 0 6px; }
        .ab-tol-rules summary { cursor: pointer; font-size: 12px; color: #334155; }
        .ab-tol-rules ul { margin: 6px 0 0 18px; padding: 0; font-size: 11px; color: #64748b; line-height: 1.5; }
        /* One Supply's orange: it overwrites, so it should not look like Apply. */
        .ab-btn.ab-tol-btn-update { background: #fd7e14; border-color: #fd7e14; color: #fff; }
        .ab-btn.ab-tol-btn-update:hover:not(:disabled) { background: #e8590c; }
        .ab-btn.ab-tol-btn-update:disabled { opacity: .5; }
        .ab-tol-status { font-size: 11px; color: #b45309; margin-top: 3px; }

        /* ── Area numbering dialog ───────────────────────────────────────── */
        .ab-modal-overlay {
            position: absolute; inset: 0;
            background: rgba(15,23,42,.45);
            display: flex; align-items: center; justify-content: center;
            z-index: 50;
        }
        .ab-modal {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 12px 40px rgba(0,0,0,.3);
            width: 460px;
            max-height: 88%;
            display: flex; flex-direction: column;
        }
        .ab-modal-header {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600; font-size: 13px;
            display: flex; align-items: center;
        }
        .ab-modal-body { padding: 12px 16px; overflow-y: auto; }
        .ab-modal-note { margin: 0 0 10px; font-size: 12px; color: #555; }
        .ab-modal-group {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 8px 10px 10px;
            margin: 0 0 10px;
        }
        .ab-modal-group legend {
            font-size: 11px; font-weight: 600;
            color: #64748b; padding: 0 4px;
        }
        .ab-modal-radio {
            display: flex; align-items: flex-start; gap: 8px;
            padding: 5px 4px; border-radius: 4px; cursor: pointer;
        }
        .ab-modal-radio:hover { background: #f8fafc; }
        .ab-modal-radio span { display: flex; flex-direction: column; }
        .ab-modal-radio b { font-size: 12px; font-weight: 600; }
        .ab-modal-radio small { font-size: 11px; color: #64748b; line-height: 1.35; }
        .ab-modal-row {
            display: flex; align-items: center; gap: 8px;
            font-size: 12px; flex-wrap: wrap;
        }
        .ab-modal-row small { color: #64748b; flex: 1 1 100%; font-size: 11px; }
        .ab-modal-row.disabled { opacity: .45; }
        .ab-modal-footer {
            padding: 10px 16px;
            border-top: 1px solid #e5e7eb;
            display: flex; justify-content: flex-end; gap: 8px;
        }
    </style>`;
}