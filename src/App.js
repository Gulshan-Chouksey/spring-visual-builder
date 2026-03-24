import React, { useState } from 'react';

/* ═══════════════════════════════════════════════════════════════
   🌿 Spring Visual Builder — App.js
   Visual code generator for Spring Boot @Entity classes.
   Everything lives in this single file: styles, components, logic.
   ═══════════════════════════════════════════════════════════════ */

// ─── DATA TYPES & CONSTRAINTS ────────────────────────────────
const DATA_TYPES = [
    'String', 'Long', 'Integer', 'Boolean',
    'Double', 'LocalDate', 'LocalDateTime',
];
const CONSTRAINTS = ['Primary Key', 'Auto Increment', 'Not Null', 'Unique'];
const RELATIONSHIP_TYPES = ['@OneToOne', '@OneToMany', '@ManyToOne', '@ManyToMany'];

// ─── HELPERS ─────────────────────────────────────────────────
/** Capitalize first letter */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/** Lower-case first letter */
const lcFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

/** Build a blank column object */
const newColumn = () => ({
    id: Date.now() + Math.random(),
    name: '',
    type: 'String',
    constraints: [],
});

/** Build a blank relationship object */
const newRelationship = () => ({
    id: Date.now() + Math.random(),
    type: '@OneToMany',
    target: '',
});

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════
function App() {
    // ── state ──────────────────────────────────────────────────
    const [entityName, setEntityName] = useState('');
    const [packageName, setPackageName] = useState('com.example.model');
    const [useLombok, setUseLombok] = useState(true);
    const [columns, setColumns] = useState([newColumn()]);
    const [relationships, setRelationships] = useState([]);
    const [relType, setRelType] = useState('@OneToMany');
    const [relTarget, setRelTarget] = useState('');
    const [copied, setCopied] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // ── column handlers ────────────────────────────────────────
    const addColumn = () => setColumns((prev) => [...prev, newColumn()]);

    const removeColumn = (id) =>
        setColumns((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));

    const updateColumn = (id, field, value) =>
        setColumns((prev) =>
            prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
        );

    const toggleConstraint = (id, constraint) =>
        setColumns((prev) =>
            prev.map((c) =>
                c.id === id
                    ? {
                        ...c,
                        constraints: c.constraints.includes(constraint)
                            ? c.constraints.filter((x) => x !== constraint)
                            : [...c.constraints, constraint],
                    }
                    : c
            )
        );

    // ── relationship handlers ──────────────────────────────────
    const addRelationship = () => {
        if (!relTarget.trim()) return;
        setRelationships((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), type: relType, target: relTarget.trim() },
        ]);
        setRelTarget('');
    };

    const removeRelationship = (id) =>
        setRelationships((prev) => prev.filter((r) => r.id !== id));

    // ═════════════════════════════════════════════════════════════
    // CODE GENERATION
    // ═════════════════════════════════════════════════════════════
    const generateCode = () => {
        const eName = cap(entityName.trim()) || 'MyEntity';
        const pkg = packageName.trim() || 'com.example.model';
        const hasPK = columns.some((c) => c.constraints.includes('Primary Key'));
        const hasNotNull = columns.some((c) => c.constraints.includes('Not Null'));
        const hasUnique = columns.some((c) => c.constraints.includes('Unique'));
        const hasLocalDate = columns.some((c) => c.type === 'LocalDate');
        const hasLocalDateTime = columns.some((c) => c.type === 'LocalDateTime');

        // ── imports ───────────────────────────────────
        let imports = [];
        imports.push(`package ${pkg};`);
        imports.push('');
        imports.push('import jakarta.persistence.*;');
        if (hasNotNull || hasUnique) {
            imports.push('import jakarta.validation.constraints.*;');
        }
        if (hasLocalDate) imports.push('import java.time.LocalDate;');
        if (hasLocalDateTime) imports.push('import java.time.LocalDateTime;');
        if (relationships.some((r) => r.type === '@OneToMany' || r.type === '@ManyToMany')) {
            imports.push('import java.util.List;');
        }
        if (useLombok) {
            imports.push('import lombok.Data;');
            imports.push('import lombok.NoArgsConstructor;');
            imports.push('import lombok.AllArgsConstructor;');
        }
        imports.push('');

        // ── class annotations ─────────────────────────
        let lines = [...imports];
        if (useLombok) {
            lines.push('@Data');
            lines.push('@NoArgsConstructor');
            lines.push('@AllArgsConstructor');
        }
        lines.push('@Entity');
        lines.push(`@Table(name = "${lcFirst(eName)}s")`);
        lines.push(`public class ${eName} {`);
        lines.push('');

        // ── fields ────────────────────────────────────
        columns.forEach((col) => {
            if (!col.name.trim()) return;
            const fieldName = lcFirst(col.name.trim());
            const isPK = col.constraints.includes('Primary Key');
            const isAutoInc = col.constraints.includes('Auto Increment');
            const isNotNull = col.constraints.includes('Not Null');
            const isUnique = col.constraints.includes('Unique');

            if (isPK) {
                lines.push('    @Id');
                if (isAutoInc) {
                    lines.push('    @GeneratedValue(strategy = GenerationType.IDENTITY)');
                }
            }

            // build @Column annotation
            let colParts = [];
            if (isNotNull) colParts.push('nullable = false');
            if (isUnique) colParts.push('unique = true');
            if (colParts.length > 0) {
                lines.push(`    @Column(${colParts.join(', ')})`);
            } else if (!isPK) {
                lines.push('    @Column');
            }

            lines.push(`    private ${col.type} ${fieldName};`);
            lines.push('');
        });

        // ── relationships ─────────────────────────────
        relationships.forEach((rel) => {
            if (!rel.target.trim()) return;
            const targetEntity = cap(rel.target.trim());
            const fieldName = lcFirst(targetEntity);
            lines.push(`    ${rel.type}`);
            if (rel.type === '@OneToMany' || rel.type === '@ManyToMany') {
                lines.push(`    private List<${targetEntity}> ${fieldName}s;`);
            } else {
                lines.push(`    private ${targetEntity} ${fieldName};`);
            }
            lines.push('');
        });

        // ── getters & setters (if no Lombok) ──────────
        if (!useLombok) {
            columns.forEach((col) => {
                if (!col.name.trim()) return;
                const fieldName = lcFirst(col.name.trim());
                const capName = cap(col.name.trim());
                lines.push(`    public ${col.type} get${capName}() {`);
                lines.push(`        return ${fieldName};`);
                lines.push('    }');
                lines.push('');
                lines.push(`    public void set${capName}(${col.type} ${fieldName}) {`);
                lines.push(`        this.${fieldName} = ${fieldName};`);
                lines.push('    }');
                lines.push('');
            });

            relationships.forEach((rel) => {
                if (!rel.target.trim()) return;
                const targetEntity = cap(rel.target.trim());
                const fieldName = lcFirst(targetEntity);
                const isList = rel.type === '@OneToMany' || rel.type === '@ManyToMany';
                const javaType = isList ? `List<${targetEntity}>` : targetEntity;
                const fName = isList ? `${fieldName}s` : fieldName;
                lines.push(`    public ${javaType} get${cap(fName)}() {`);
                lines.push(`        return ${fName};`);
                lines.push('    }');
                lines.push('');
                lines.push(`    public void set${cap(fName)}(${javaType} ${fName}) {`);
                lines.push(`        this.${fName} = ${fName};`);
                lines.push('    }');
                lines.push('');
            });
        }

        lines.push('}');
        return lines.join('\n');
    };

    const code = generateCode();

    // ── copy to clipboard ──────────────────────────────────────
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setShowToast(true);
            setTimeout(() => setCopied(false), 2000);
            setTimeout(() => setShowToast(false), 2500);
        });
    };

    // ── download as .java ──────────────────────────────────────
    const handleDownload = () => {
        const eName = cap(entityName.trim()) || 'MyEntity';
        const blob = new Blob([code], { type: 'text/x-java-source' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${eName}.java`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ═════════════════════════════════════════════════════════════
    // SYNTAX HIGHLIGHTING (token-based, no external lib)
    // ═════════════════════════════════════════════════════════════
    const highlightCode = (src) => {
        const KEYWORDS = new Set([
            'package', 'import', 'public', 'private', 'class', 'return', 'this',
            'if', 'else', 'void', 'new', 'static', 'final', 'extends', 'implements',
            'interface', 'enum', 'abstract', 'synchronized', 'volatile', 'transient',
            'native', 'throws', 'throw', 'try', 'catch', 'finally',
        ]);
        const TYPES = new Set([
            'String', 'Long', 'Integer', 'Boolean', 'Double', 'LocalDate',
            'LocalDateTime', 'List', 'int', 'long', 'double', 'boolean',
            'float', 'char', 'byte', 'short',
        ]);
        const STRATEGIES = new Set([
            'GenerationType.IDENTITY', 'GenerationType.AUTO',
            'GenerationType.SEQUENCE', 'GenerationType.TABLE',
        ]);

        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const wrap = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;

        return src.split('\n').map((line) => {
            let result = '';
            let i = 0;
            while (i < line.length) {
                // ── comments ──
                if (line[i] === '/' && line[i + 1] === '/') {
                    result += wrap('hl-comment', line.slice(i));
                    i = line.length;
                    continue;
                }
                // ── strings ──
                if (line[i] === '"') {
                    let j = i + 1;
                    while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; }
                    j = Math.min(j + 1, line.length);
                    result += wrap('hl-string', line.slice(i, j));
                    i = j;
                    continue;
                }
                // ── annotations ──
                if (line[i] === '@') {
                    let j = i + 1;
                    while (j < line.length && /\w/.test(line[j])) j++;
                    // include parenthesised params if present
                    if (j < line.length && line[j] === '(') {
                        let depth = 1; j++;
                        while (j < line.length && depth > 0) {
                            if (line[j] === '(') depth++;
                            else if (line[j] === ')') depth--;
                            j++;
                        }
                    }
                    result += wrap('hl-annotation', line.slice(i, j));
                    i = j;
                    continue;
                }
                // ── identifiers / keywords / types ──
                if (/[A-Za-z_]/.test(line[i])) {
                    let j = i;
                    // consume word (including dots for GenerationType.IDENTITY etc.)
                    while (j < line.length && /[\w.]/.test(line[j])) j++;
                    const word = line.slice(i, j);
                    if (STRATEGIES.has(word)) {
                        result += wrap('hl-strategy', word);
                    } else if (KEYWORDS.has(word)) {
                        result += wrap('hl-keyword', word);
                    } else if (TYPES.has(word)) {
                        result += wrap('hl-type', word);
                    } else {
                        result += esc(word);
                    }
                    i = j;
                    continue;
                }
                // ── everything else ──
                result += esc(line[i]);
                i++;
            }
            return result;
        }).join('\n');
    };

    // ═════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════
    return (
        <div style={styles.app}>
            {/* ── INLINE STYLES in <style> tag for pseudo-elements ── */}
            <style>{cssAnimations}</style>

            {/* ════════ HEADER ════════ */}
            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <h1 style={styles.headerTitle}>🌿 Spring Visual Builder</h1>
                    <p style={styles.headerSub}>
                        Visual code generator for Spring Boot developers
                    </p>
                </div>
            </header>

            {/* ════════ MAIN LAYOUT ════════ */}
            <main style={styles.main}>
                {/* ──────── LEFT: FORM PANEL ──────── */}
                <section style={styles.formPanel}>
                    {/* Entity name + package */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <span style={styles.sectionIcon}>📦</span> Entity Configuration
                        </h2>

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Entity Name</label>
                                <input
                                    style={styles.input}
                                    placeholder="e.g. User, Product, Order"
                                    value={entityName}
                                    onChange={(e) => setEntityName(e.target.value)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Package Name</label>
                                <input
                                    style={styles.input}
                                    placeholder="com.example.model"
                                    value={packageName}
                                    onChange={(e) => setPackageName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={styles.checkRow}>
                            <label style={styles.checkLabel}>
                                <input
                                    type="checkbox"
                                    checked={useLombok}
                                    onChange={() => setUseLombok(!useLombok)}
                                    style={styles.checkbox}
                                />
                                Use Lombok (@Data)
                            </label>
                        </div>
                    </div>

                    {/* Column designer */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <span style={styles.sectionIcon}>🗂️</span> Columns / Fields
                        </h2>

                        <div style={styles.tableWrap}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.th, width: '22%' }}>Column Name</th>
                                        <th style={{ ...styles.th, width: '18%' }}>Data Type</th>
                                        <th style={{ ...styles.th, width: '48%' }}>Constraints</th>
                                        <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {columns.map((col) => (
                                        <tr key={col.id} style={styles.tr}>
                                            <td style={styles.td}>
                                                <input
                                                    style={styles.tableInput}
                                                    placeholder="e.g. id, name"
                                                    value={col.name}
                                                    onChange={(e) =>
                                                        updateColumn(col.id, 'name', e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <select
                                                    style={styles.select}
                                                    value={col.type}
                                                    onChange={(e) =>
                                                        updateColumn(col.id, 'type', e.target.value)
                                                    }
                                                >
                                                    {DATA_TYPES.map((t) => (
                                                        <option key={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.constraintRow}>
                                                    {CONSTRAINTS.map((ct) => (
                                                        <label key={ct} style={styles.constraintLabel}>
                                                            <input
                                                                type="checkbox"
                                                                checked={col.constraints.includes(ct)}
                                                                onChange={() => toggleConstraint(col.id, ct)}
                                                                style={styles.constraintCheck}
                                                            />
                                                            <span style={styles.constraintText}>{ct}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <button
                                                    style={styles.removeBtn}
                                                    onClick={() => removeColumn(col.id)}
                                                    title="Remove column"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button style={styles.addBtn} onClick={addColumn}>
                            ＋ Add Column
                        </button>
                    </div>

                    {/* Relationships */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <span style={styles.sectionIcon}>🔗</span> Relationships
                        </h2>

                        <div style={styles.relRow}>
                            <select
                                style={{ ...styles.select, flex: 1 }}
                                value={relType}
                                onChange={(e) => setRelType(e.target.value)}
                            >
                                {RELATIONSHIP_TYPES.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <input
                                style={{ ...styles.input, flex: 2 }}
                                placeholder="Related entity (e.g. Address, Order)"
                                value={relTarget}
                                onChange={(e) => setRelTarget(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addRelationship()}
                            />
                            <button style={styles.addBtn} onClick={addRelationship}>
                                ＋ Add
                            </button>
                        </div>

                        {relationships.length > 0 && (
                            <ul style={styles.relList}>
                                {relationships.map((r) => (
                                    <li key={r.id} style={styles.relItem}>
                                        <span style={styles.relBadge}>{r.type}</span>
                                        <span style={styles.relTarget}>{cap(r.target)}</span>
                                        <button
                                            style={styles.relRemove}
                                            onClick={() => removeRelationship(r.id)}
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {relationships.length === 0 && (
                            <p style={styles.emptyHint}>
                                No relationships added yet. Add one above to see it in the preview.
                            </p>
                        )}
                    </div>
                </section>

                {/* ──────── RIGHT: CODE PREVIEW ──────── */}
                <section style={styles.previewPanel}>
                    <div style={styles.previewCard}>
                        <div style={styles.previewHeader}>
                            <h2 style={styles.previewTitle}>
                                <span style={styles.sectionIcon}>☕</span> Generated Entity Code
                            </h2>
                            <div style={styles.previewActions}>
                                <button
                                    style={copied ? styles.copiedBtn : styles.copyBtn}
                                    onClick={handleCopy}
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                                <button style={styles.downloadBtn} onClick={handleDownload}>
                                    ⬇ Download .java
                                </button>
                            </div>
                        </div>

                        <div style={styles.codeWrap}>
                            <pre style={styles.pre}>
                                <code
                                    dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
                                />
                            </pre>
                        </div>
                    </div>
                </section>
            </main>

            {/* ════════ FOOTER ════════ */}
            <footer style={styles.footer}>
                <span>
                    🌿 Spring Visual Builder &middot; Made for Spring Boot developers
                </span>
            </footer>

            {/* ════════ TOAST ════════ */}
            {showToast && (
                <div style={styles.toast}>✓ Code copied to clipboard!</div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CSS ANIMATIONS & PSEUDO-ELEMENT STYLES (injected via <style>)
// ═══════════════════════════════════════════════════════════════
const cssAnimations = `
  /* ── reset ───────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #f0f4f8;
    color: #1b1b1b;
    -webkit-font-smoothing: antialiased;
  }

  /* ── scrollbar ───────────────────── */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #e9ecef; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #40916c; border-radius: 4px; }

  /* ── syntax highlighting ─────────── */
  .hl-keyword    { color: #d73a49; font-weight: 600; }
  .hl-annotation { color: #d4a017; font-weight: 600; }
  .hl-type       { color: #005cc5; font-weight: 500; }
  .hl-string     { color: #22863a; }
  .hl-comment    { color: #6a737d; font-style: italic; }
  .hl-strategy   { color: #6f42c1; font-weight: 500; }

  /* ── toast animation ─────────────── */
  @keyframes slideInUp {
    from { transform: translateX(-50%) translateY(30px); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }

  /* ── responsive ──────────────────── */
  @media (max-width: 1024px) {
    main { flex-direction: column !important; }
  }

  /* ── button hover helpers ────────── */
  button { transition: all 0.2s ease; cursor: pointer; }
  button:hover { filter: brightness(1.08); }
  button:active { transform: scale(0.97); }

  /* ── input focus ─────────────────── */
  input:focus, select:focus {
    outline: none;
    border-color: #40916c !important;
    box-shadow: 0 0 0 3px rgba(64, 145, 108, 0.18);
  }

  /* ── table row hover ─────────────── */
  tbody tr:hover { background: #f0faf4; }
`;

// ═══════════════════════════════════════════════════════════════
// INLINE STYLES OBJECT
// ═══════════════════════════════════════════════════════════════
const styles = {
    /* ── app shell ──────────────────── */
    app: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f0f4f8',
    },

    /* ── header ─────────────────────── */
    header: {
        background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 60%, #52b788 100%)',
        padding: '28px 32px',
        boxShadow: '0 4px 20px rgba(45, 106, 79, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
    },
    headerInner: { maxWidth: 1440, margin: '0 auto' },
    headerTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '-0.4px',
        marginBottom: 4,
    },
    headerSub: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 14,
        fontWeight: 400,
    },

    /* ── main layout ────────────────── */
    main: {
        display: 'flex',
        gap: 24,
        maxWidth: 1440,
        width: '100%',
        margin: '24px auto',
        padding: '0 24px',
        flex: 1,
        alignItems: 'flex-start',
    },

    /* ── form panel (left) ──────────── */
    formPanel: {
        flex: '1 1 54%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
    },

    /* ── preview panel (right) ──────── */
    previewPanel: {
        flex: '1 1 46%',
        position: 'sticky',
        top: 100,
        maxHeight: 'calc(100vh - 120px)',
    },

    /* ── card ────────────────────────── */
    card: {
        background: '#fff',
        borderRadius: 14,
        padding: '24px 28px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #e9ecef',
    },

    /* ── section title ──────────────── */
    sectionTitle: {
        fontSize: 17,
        fontWeight: 700,
        color: '#2d6a4f',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    sectionIcon: { fontSize: 20 },

    /* ── form inputs ────────────────── */
    formRow: {
        display: 'flex',
        gap: 16,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    formGroup: { flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 },
    label: {
        fontSize: 13,
        fontWeight: 600,
        color: '#495057',
        letterSpacing: '0.2px',
    },
    input: {
        padding: '10px 14px',
        border: '1.5px solid #dee2e6',
        borderRadius: 8,
        fontSize: 14,
        color: '#212529',
        background: '#fafcfe',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    select: {
        padding: '10px 14px',
        border: '1.5px solid #dee2e6',
        borderRadius: 8,
        fontSize: 14,
        color: '#212529',
        background: '#fafcfe',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    checkRow: { marginTop: 4 },
    checkLabel: {
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#495057',
        cursor: 'pointer',
    },
    checkbox: { accentColor: '#2d6a4f', width: 16, height: 16 },

    /* ── table ──────────────────────── */
    tableWrap: {
        overflowX: 'auto',
        borderRadius: 10,
        border: '1px solid #e9ecef',
        marginBottom: 14,
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: 620,
    },
    th: {
        padding: '12px 14px',
        background: '#eaf4ef',
        color: '#2d6a4f',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        textAlign: 'left',
        borderBottom: '2px solid #d8f3dc',
    },
    tr: {
        borderBottom: '1px solid #f1f3f5',
        transition: 'background 0.15s',
    },
    td: { padding: '10px 14px', verticalAlign: 'middle' },
    tableInput: {
        width: '100%',
        padding: '8px 10px',
        border: '1.5px solid #dee2e6',
        borderRadius: 6,
        fontSize: 14,
        background: '#fff',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },

    /* ── constraint checkboxes ──────── */
    constraintRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 14px',
    },
    constraintLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        fontSize: 13,
    },
    constraintCheck: { accentColor: '#2d6a4f', width: 14, height: 14 },
    constraintText: { color: '#495057', whiteSpace: 'nowrap' },

    /* ── buttons ────────────────────── */
    addBtn: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(45, 106, 79, 0.18)',
    },
    removeBtn: {
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff0f0',
        color: '#e03131',
        border: '1px solid #ffc9c9',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
    },

    /* ── relationship section ───────── */
    relRow: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 14,
    },
    relList: {
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    relItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: '#f0faf4',
        borderRadius: 8,
        border: '1px solid #d8f3dc',
    },
    relBadge: {
        padding: '3px 10px',
        background: '#2d6a4f',
        color: '#fff',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'monospace',
    },
    relTarget: { flex: 1, fontWeight: 600, color: '#2d6a4f', fontSize: 14 },
    relRemove: {
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff0f0',
        color: '#e03131',
        border: '1px solid #ffc9c9',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
    },
    emptyHint: {
        color: '#868e96',
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 4,
    },

    /* ── preview card ───────────────── */
    previewCard: {
        background: '#1e1e2e',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 120px)',
    },
    previewHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 22px',
        background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
        flexWrap: 'wrap',
        gap: 10,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    previewActions: { display: 'flex', gap: 8 },
    copyBtn: {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.15)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
    },
    copiedBtn: {
        padding: '8px 16px',
        background: '#52b788',
        color: '#fff',
        border: '1px solid #52b788',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
    },
    downloadBtn: {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.15)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
    },

    /* ── code block ─────────────────── */
    codeWrap: {
        flex: 1,
        overflow: 'auto',
        padding: '20px 24px',
    },
    pre: {
        margin: 0,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: 13.5,
        lineHeight: 1.7,
        color: '#cdd6f4',
        whiteSpace: 'pre',
        tabSize: 4,
    },

    /* ── footer ─────────────────────── */
    footer: {
        textAlign: 'center',
        padding: '18px 24px',
        fontSize: 13,
        color: '#868e96',
        borderTop: '1px solid #e9ecef',
        background: '#fff',
        marginTop: 'auto',
    },

    /* ── toast ──────────────────────── */
    toast: {
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 28px',
        background: '#2d6a4f',
        color: '#fff',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: '0 8px 30px rgba(45, 106, 79, 0.35)',
        animation: 'slideInUp 0.3s ease',
        zIndex: 1000,
    },
};

export default App;
