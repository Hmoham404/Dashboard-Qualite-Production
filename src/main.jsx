import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  CalendarDays,
  Clock3,
  Factory,
  Gauge,
  History,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Wrench,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { initialMachines, initialReferences } from './initialCatalog';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const departments = [
  { key: 'Injection', subtitle: 'Moulage plastique', icon: Factory },
  { key: 'Metallisation', subtitle: 'Depot sous vide', icon: Gauge },
  { key: 'Assemblage', subtitle: 'Montage & controle', icon: Settings },
  { key: 'Serigraphie', subtitle: 'Marquage & impression', icon: Printer },
  { key: 'Soudure', subtitle: 'Soudure & finition', icon: Wrench }
];

const defectTypesByDepartment = {
  Assemblage: ['Ecart', 'Fissure', 'Cassure miroir', 'Trace de colle', 'Manque pin', 'Autres'],
  Serigraphie: ['Impression decalee', 'Variation de couleur', 'Impression incomplete', 'Manque de nettete', 'Contour deforme', 'Autres'],
  Metallisation: ['Particule', 'Rayure', 'Trace d huile', 'Tache blanche', 'Tache noir', 'Bavure', 'Retassure', 'Zone non metallisee', 'Couleur non conforme', 'Autres'],
  Soudure: ['Bavure', 'Cassure', 'Trace de sonotrode', 'Piqure', 'Brulure', 'Sur soudure', 'Deformation', 'Autres'],
  Injection: ['Bavure', 'Retassure', 'Effet diesel', 'Peau d orange', 'Ligne de soudure', 'Manque matiere', 'Arrachement', 'Givrage', 'Trace d ejecteur', 'Trace d huile', 'Autres']
};

const colors = ['#1d7fe2', '#35ae72', '#ff8124', '#7657c9', '#e23d3d', '#0f5f83'];
const seedEntries = [];
const seedMachines = initialMachines;
const seedReferences = initialReferences;
const seedAssignments = [];

function cleanKey(key = '') {
  return key.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function pick(row, names) {
  const match = Object.keys(row).find((key) => names.includes(cleanKey(key)));
  return match ? row[match] : '';
}

function toNumber(value) {
  const parsed = Number(String(value ?? 0).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultDefect(department) {
  return defectTypesByDepartment[department]?.[0] || 'Autres';
}

function currentDateRange() {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { from, to };
}

function validateProduction(row) {
  const errors = [];
  if (!row.department) errors.push('departement');
  if (!row.machine_code) errors.push('machine');
  if (!row.product_reference) errors.push('reference machine');
  if (!row.work_order?.trim()) errors.push('OF / Bon');
  if (!row.defect_type) errors.push('pareto defaut');
  if (toNumber(row.good_qty) <= 0 && toNumber(row.scrap_qty) <= 0) errors.push('qte bonne ou qte rebut');
  if (toNumber(row.justified_scrap_qty) > toNumber(row.scrap_qty)) errors.push('rebut justifie <= qte rebut');
  if (toNumber(row.mod_count) > 0 && !row.operator_names?.trim()) errors.push('nom MOD');
  if (toNumber(row.mod_count) > 0 && toNumber(row.mod_hours) <= 0) errors.push('total heure MOD');
  return errors;
}

function mergeUnique(rows, fallback, key) {
  const map = new Map();
  [...fallback, ...rows].forEach((row) => {
    if (row?.[key]) map.set(row[key], row);
  });
  return [...map.values()];
}

function localRead(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function localWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadTable(name, fallback) {
  if (!supabase) return localRead(name, fallback);
  const { data, error } = await supabase.from(name).select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn(error);
    return localRead(name, fallback);
  }
  return data?.length ? data : fallback;
}

async function insertRows(name, rows) {
  if (!rows.length) return rows;
  if (!supabase) {
    const existing = localRead(name, []);
    const localRows = rows.map((row) => ({ ...row, id: row.id || `local-${Date.now()}-${Math.random().toString(36).slice(2)}` }));
    const key = name === 'machines' ? 'code' : name === 'product_references' ? 'reference' : null;
    const next = key
      ? [...localRows, ...existing.filter((item) => !localRows.some((row) => row[key] === item[key]))]
      : [...localRows, ...existing];
    localWrite(name, next);
    return localRows;
  }
  const conflict = name === 'machines' ? 'code' : name === 'product_references' ? 'reference' : undefined;
  const request = conflict ? supabase.from(name).upsert(rows, { onConflict: conflict }) : supabase.from(name).insert(rows);
  const { data, error } = await request.select();
  if (error) throw error;
  return data;
}

async function deleteRow(name, row) {
  if (supabase && row.id && !String(row.id).startsWith('local-')) {
    const { error } = await supabase.from(name).delete().eq('id', row.id);
    if (error) throw error;
    return;
  }
  const existing = localRead(name, []);
  localWrite(name, existing.filter((item) => item.id !== row.id));
}

function App() {
  const [activeDept, setActiveDept] = useState('Injection');
  const [entries, setEntries] = useState(seedEntries);
  const [machines, setMachines] = useState(seedMachines);
  const [references, setReferences] = useState(seedReferences);
  const [assignments, setAssignments] = useState(seedAssignments);
  const [status, setStatus] = useState(supabase ? 'Connecte a Supabase' : 'Mode local: ajoutez .env pour Supabase');
  const [showHistoryWindow, setShowHistoryWindow] = useState(false);
  const [filters, setFilters] = useState({ ...currentDateRange(), machine: 'Tous', reference: 'Tous', workOrder: 'Tous' });
  const [form, setForm] = useState({
    production_date: new Date().toISOString().slice(0, 10),
    department: 'Injection',
    machine_code: '',
    product_reference: '',
    work_order: '',
    good_qty: 0,
    scrap_qty: 0,
    justified_scrap_qty: 0,
    purge_kg: 0,
    work_hours: 0,
    mod_count: 1,
    mod_hours: 0,
    operator_names: '',
    defect_type: 'Bavure',
    note: ''
  });

  useEffect(() => {
    Promise.all([
      loadTable('production_entries', seedEntries),
      loadTable('machines', seedMachines),
      loadTable('product_references', seedReferences),
      loadTable('mod_assignments', seedAssignments)
    ]).then(([production, machineRows, referenceRows, modRows]) => {
      setEntries(production);
      setMachines(mergeUnique(machineRows, seedMachines, 'code'));
      setReferences(mergeUnique(referenceRows, seedReferences, 'reference'));
      setAssignments(modRows);
    });
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((item) => {
      const inDate = item.production_date >= filters.from && item.production_date <= filters.to;
      const inDept = item.department === activeDept;
      const inMachine = filters.machine === 'Tous' || item.machine_code === filters.machine;
      const inRef = filters.reference === 'Tous' || item.product_reference === filters.reference;
      const inOf = filters.workOrder === 'Tous' || item.work_order === filters.workOrder;
      return inDate && inDept && inMachine && inRef && inOf;
    });
  }, [entries, filters, activeDept]);

  const totals = useMemo(() => {
    const good = filtered.reduce((sum, row) => sum + toNumber(row.good_qty), 0);
    const scrap = filtered.reduce((sum, row) => sum + toNumber(row.scrap_qty), 0);
    const purge = filtered.reduce((sum, row) => sum + toNumber(row.purge_kg), 0);
    const machineHours = filtered.reduce((sum, row) => sum + toNumber(row.work_hours ?? row.machine_hours), 0);
    const modHours = filtered.reduce((sum, row) => sum + toNumber(row.mod_hours), 0);
    return { good, scrap, total: good + scrap, purge, machineHours, modHours, scrapRate: good + scrap ? (scrap / (good + scrap)) * 100 : 0 };
  }, [filtered]);

  const departmentData = useMemo(() => departments.map((dept) => {
    const rows = entries.filter((entry) => entry.department === dept.key);
    const production = rows.reduce((sum, row) => sum + toNumber(row.good_qty), 0);
    const scrap = rows.reduce((sum, row) => sum + toNumber(row.scrap_qty), 0);
    return { name: dept.key, production, scrap, rate: production + scrap ? Number(((scrap / (production + scrap)) * 100).toFixed(1)) : 0 };
  }), [entries]);

  const defectData = useMemo(() => {
    const map = new Map();
    filtered.forEach((row) => map.set(row.defect_type || 'Autre', (map.get(row.defect_type || 'Autre') || 0) + toNumber(row.scrap_qty)));
    const sorted = [...map.entries()].map(([name, defects]) => ({ name, defects })).sort((a, b) => b.defects - a.defects);
    const total = sorted.reduce((sum, row) => sum + row.defects, 0) || 1;
    let cumulative = 0;
    return sorted.map((row) => {
      cumulative += row.defects;
      return { ...row, cumulative: Number(((cumulative / total) * 100).toFixed(0)) };
    });
  }, [filtered]);

  const pieData = departmentData.map((row) => ({ name: row.name, value: row.scrap }));
  const machinesForDept = machines.filter((machine) => machine.department === form.department || !machine.department);
  const referencesForDept = references.filter((ref) => ref.family === form.department || !ref.family);
  const defectTypes = defectTypesByDepartment[form.department] || ['Autres'];

  const assignmentRows = useMemo(() => {
    const map = new Map();
    entries.forEach((row) => {
      if (!row.machine_code || !row.operator_names) return;
      const previous = map.get(row.machine_code);
      map.set(row.machine_code, {
        machine_code: row.machine_code,
        operator_names: row.operator_names,
        mod_count: previous ? Math.max(toNumber(previous.mod_count), toNumber(row.mod_count)) : toNumber(row.mod_count),
        mod_hours: (previous?.mod_hours || 0) + toNumber(row.mod_hours)
      });
    });
    return [...assignments, ...map.values()];
  }, [entries, assignments]);

  function selectDepartment(department) {
    setActiveDept(department);
    setForm({
      ...form,
      department,
      machine_code: '',
      product_reference: '',
      defect_type: defaultDefect(department)
    });
  }

  function handleMachineChange(machineCode) {
    const machine = machines.find((item) => item.code === machineCode);
    setForm({
      ...form,
      machine_code: machineCode,
      product_reference: machine?.reference || form.product_reference
    });
  }

  async function addProduction(event) {
    event.preventDefault();
    try {
      const row = {
        ...form,
        good_qty: toNumber(form.good_qty),
        scrap_qty: toNumber(form.scrap_qty),
        justified_scrap_qty: toNumber(form.justified_scrap_qty),
        purge_kg: toNumber(form.purge_kg),
        machine_hours: toNumber(form.work_hours),
        work_hours: toNumber(form.work_hours),
        mod_count: toNumber(form.mod_count),
        mod_hours: toNumber(form.mod_hours),
        operator_names: form.operator_names.trim()
      };
      const errors = validateProduction(row);
      if (errors.length) {
        setStatus(`A corriger avant sauvegarde: ${errors.join(', ')}`);
        return;
      }
      const saved = await insertRows('production_entries', [row]);
      setEntries((current) => [...saved, ...current]);
      setStatus(`Ligne validee et sauvegardee: ${row.department} / ${row.machine_code}`);
    } catch (error) {
      setStatus(`Erreur sauvegarde: ${error.message}`);
    }
  }

  async function deleteProduction(row) {
    const ok = window.confirm(`Supprimer cette saisie ?\n${row.production_date} - ${row.department} - ${row.machine_code}`);
    if (!ok) return;
    try {
      await deleteRow('production_entries', row);
      setEntries((current) => current.filter((item) => item !== row && item.id !== row.id));
      setStatus(`Saisie supprimee: ${row.department} / ${row.machine_code}`);
    } catch (error) {
      setStatus(`Erreur suppression: ${error.message}`);
    }
  }

  async function importExcel(event, kind) {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    if (kind === 'machines') {
      const parsed = rows.map((row, index) => {
        const code = pick(row, ['machine', 'code', 'poste', 'machineposte', 'refmachine', 'reference']) || `MCH-${index + 1}`;
        return {
          code: String(code).trim(),
          label: String(pick(row, ['designation', 'libelle', 'nom', 'label']) || code).trim(),
          department: String(pick(row, ['departement', 'atelier', 'service']) || activeDept).trim(),
          source_file: file.name
        };
      }).filter((row) => row.code);
      const saved = await insertRows('machines', parsed);
      setMachines((current) => [...saved, ...current]);
      setStatus(`${saved.length} machines importees depuis Excel`);
    } else {
      const parsed = rows.map((row, index) => {
        const reference = pick(row, ['reference', 'ref', 'code', 'refproduit', 'article']) || `REF-${index + 1}`;
        return {
          reference: String(reference).trim(),
          designation: String(pick(row, ['designation', 'libelle', 'description', 'nom']) || reference).trim(),
          family: String(pick(row, ['famille', 'family', 'categorie']) || 'Production').trim(),
          source_file: file.name
        };
      }).filter((row) => row.reference);
      const saved = await insertRows('product_references', parsed);
      setReferences((current) => [...saved, ...current]);
      setStatus(`${saved.length} references produit importees depuis Excel`);
    }
    event.target.value = '';
  }

  function resetDemo() {
    setEntries(seedEntries);
    setMachines(seedMachines);
    setReferences(seedReferences);
    setAssignments(seedAssignments);
    setStatus('Donnees videes: pret pour import Excel et saisie');
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div>
            <h1>Dashboard Qualite & Production</h1>
            <p>Suivi par departement: Injection, Soudure, Metallisation, Assemblage, Serigraphie</p>
          </div>
        </div>
        <div className="status-strip">
          <button className="history-top-button" type="button" onClick={() => setShowHistoryWindow(true)}><History size={18} />Historique</button>
          <CalendarDays size={24} />
          <div><strong>Mercredi 10 septembre 2025</strong><span>14:28</span></div>
          <div className="divider" />
          <div><strong>Qualite aujourd'hui</strong><span>Performance demain</span></div>
        </div>
      </header>

      <section className="filters">
        <label>Date debut<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
        <label>Date fin<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        <label>Machine / Poste<select value={filters.machine} onChange={(e) => setFilters({ ...filters, machine: e.target.value })}><option>Tous</option>{machines.map((machine) => <option key={machine.id || machine.code}>{machine.code}</option>)}</select></label>
        <label>Reference produit<select value={filters.reference} onChange={(e) => setFilters({ ...filters, reference: e.target.value })}><option>Tous</option>{references.map((ref) => <option key={ref.id || ref.reference}>{ref.reference}</option>)}</select></label>
        <label>OF / Bon<select value={filters.workOrder} onChange={(e) => setFilters({ ...filters, workOrder: e.target.value })}><option>Tous</option>{[...new Set(entries.map((row) => row.work_order).filter(Boolean))].map((of) => <option key={of}>{of}</option>)}</select></label>
        <button className="primary" type="button"><Search size={18} />Appliquer</button>
        <button type="button" onClick={resetDemo}><RefreshCcw size={18} />Reinitialiser</button>
      </section>

      <section className="dept-tabs">
        {departments.map(({ key, subtitle, icon: Icon }) => (
          <button className={activeDept === key ? 'active' : ''} type="button" key={key} onClick={() => selectDepartment(key)}>
            <Icon size={42} />
            <span><strong>{key}</strong><small>{subtitle}</small></span>
          </button>
        ))}
      </section>

      <Panel title="Feuille de saisie production" className="sheet-panel">
        <form className="sheet-form" onSubmit={addProduction}>
          <label>Date<input type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} /></label>
          <label>Departement<select value={form.department} onChange={(e) => selectDepartment(e.target.value)}>{departments.map((dept) => <option key={dept.key}>{dept.key}</option>)}</select></label>
          <label>Machine / Poste<select value={form.machine_code} onChange={(e) => handleMachineChange(e.target.value)}><option value="">Choisir machine</option>{machinesForDept.map((machine) => <option key={machine.id || machine.code} value={machine.code}>{machine.code} - {machine.label}</option>)}</select></label>
          <label>Reference machine<select value={form.product_reference} onChange={(e) => setForm({ ...form, product_reference: e.target.value })}><option value="">Choisir reference</option>{referencesForDept.map((ref) => <option key={ref.id || ref.reference} value={ref.reference}>{ref.reference}</option>)}</select></label>
          <label>OF / Bon<input placeholder="OF / Bon" value={form.work_order} onChange={(e) => setForm({ ...form, work_order: e.target.value })} /></label>
          <label>Qte bonne<input type="number" min="0" value={form.good_qty} onChange={(e) => setForm({ ...form, good_qty: e.target.value })} /></label>
          <label>Qte rebut<input type="number" min="0" value={form.scrap_qty} onChange={(e) => setForm({ ...form, scrap_qty: e.target.value })} /></label>
          <label>Rebut justifie<input type="number" min="0" value={form.justified_scrap_qty} onChange={(e) => setForm({ ...form, justified_scrap_qty: e.target.value })} /></label>
          <label>Purge kg<input type="number" min="0" step="0.1" value={form.purge_kg} onChange={(e) => setForm({ ...form, purge_kg: e.target.value })} /></label>
          <label>Pareto defaut<select value={form.defect_type} onChange={(e) => setForm({ ...form, defect_type: e.target.value })}>{defectTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Heure travail<input type="number" min="0" step="0.1" value={form.work_hours} onChange={(e) => setForm({ ...form, work_hours: e.target.value })} /></label>
          <label>MOD<input type="number" min="0" value={form.mod_count} onChange={(e) => setForm({ ...form, mod_count: e.target.value })} /></label>
          <label>Nom MOD<input placeholder="Noms operateurs" value={form.operator_names} onChange={(e) => setForm({ ...form, operator_names: e.target.value })} /></label>
          <label>Total heure MOD<input type="number" min="0" step="0.1" value={form.mod_hours} onChange={(e) => setForm({ ...form, mod_hours: e.target.value })} /></label>
          <button className="primary sheet-save" type="submit"><Save size={18} />Sauvegarder la ligne</button>
        </form>
        <div className="import-row">
          <span className={status.startsWith('A corriger') || status.startsWith('Erreur') ? 'save-status bad-status' : 'save-status'}>{status}</span>
        </div>
      </Panel>

      <section className="grid charts">
        <Panel title="Pareto des defauts" className="span4">
          <ResponsiveContainer height={250}>
            <ComposedChart data={defectData}>
              <CartesianGrid stroke="#dbe5f2" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="defects" fill="#1d7fe2" radius={[4, 4, 0, 0]} name="Nombre de defauts" />
              <Line yAxisId="right" dataKey="cumulative" stroke="#ff8124" strokeWidth={3} name="% cumule" />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Comparatif par departement" className="span4">
          <ResponsiveContainer height={250}>
            <ComposedChart data={departmentData}>
              <CartesianGrid stroke="#dbe5f2" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 12]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="production" fill="#1d7fe2" name="Production" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="scrap" fill="#e23d3d" name="Rebut" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" dataKey="rate" stroke="#ff8124" strokeWidth={0} dot={{ r: 5 }} name="Taux de rebut (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Repartition du rebut par departement" className="span4">
          <div className="donut-row">
            <ResponsiveContainer width="55%" height={250}>
              <PieChart>
                <Pie data={pieData} innerRadius={62} outerRadius={96} dataKey="value" paddingAngle={1}>
                  {pieData.map((_, index) => <Cell key={colors[index]} fill={colors[index]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend-list">
              {pieData.map((row, index) => (
                <div key={row.name}><i style={{ background: colors[index] }} />{row.name}<strong>{row.value.toLocaleString('fr-FR')}</strong></div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="workbench">
        <Panel title="Affectation MOD">
          <table>
            <thead><tr><th>Machine / Poste</th><th>Nom MOD / operateur(s)</th><th>Nb MOD</th><th>Total heure MOD</th></tr></thead>
            <tbody>
              {assignmentRows.map((row, index) => <tr key={row.id || `${row.machine_code}-${index}`}><td>{row.machine_code}</td><td>{row.operator_names}</td><td>{row.mod_count}</td><td>{toNumber(row.mod_hours).toLocaleString('fr-FR')}</td></tr>)}
              {!assignmentRows.length && <tr><td colSpan="4" className="empty-row">Aucune affectation MOD saisie.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </section>

      <Panel title="Detail de la production">
        <table>
          <thead><tr><th>Date</th><th>Departement</th><th>Machine / Poste</th><th>Reference machine</th><th>OF / Bon</th><th>Qte bonne</th><th>Qte rebut</th><th>Rebut justifie</th><th>Purge kg</th><th>Pareto defaut</th><th>Heure travail</th><th>MOD</th><th>Nom MOD</th><th>Total H MOD</th><th></th></tr></thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.id || index}>
                <td>{row.production_date}</td><td>{row.department}</td><td>{row.machine_code}</td><td>{row.product_reference}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString('fr-FR')}</td><td>{toNumber(row.scrap_qty).toLocaleString('fr-FR')}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString('fr-FR')}</td><td>{row.purge_kg}</td><td>{row.defect_type}</td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                <td><button className="icon-only danger-icon" type="button" onClick={() => deleteProduction(row)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="15" className="empty-row">Aucune donnee. Choisissez un departement puis ajoutez une ligne de production.</td></tr>}
          </tbody>
        </table>
      </Panel>

      {showHistoryWindow && (
        <div className="history-modal" role="dialog" aria-modal="true" aria-label="Fenetre historique des ajouts">
          <section className="history-window">
            <header className="history-window-head">
              <div>
                <h2>Historique complet des ajouts</h2>
                <p>{entries.length} ligne(s) enregistree(s)</p>
              </div>
              <button className="icon-only" type="button" onClick={() => setShowHistoryWindow(false)} aria-label="Fermer historique"><X size={18} /></button>
            </header>
            <div className="history-window-body">
              <table>
                <thead><tr><th>Date</th><th>Departement</th><th>Machine / Poste</th><th>Reference machine</th><th>OF / Bon</th><th>Qte bonne</th><th>Qte rebut</th><th>Rebut justifie</th><th>Purge kg</th><th>Pareto defaut</th><th>Heure travail</th><th>MOD</th><th>Nom MOD</th><th>Total H MOD</th><th>Action</th></tr></thead>
                <tbody>
                  {entries.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>{row.production_date}</td><td>{row.department}</td><td>{row.machine_code}</td><td>{row.product_reference}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString('fr-FR')}</td><td>{toNumber(row.scrap_qty).toLocaleString('fr-FR')}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString('fr-FR')}</td><td>{row.purge_kg}</td><td>{row.defect_type}</td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                      <td><button className="danger-button compact-danger" type="button" onClick={() => deleteProduction(row)}><Trash2 size={16} />Supprimer</button></td>
                    </tr>
                  ))}
                  {!entries.length && <tr><td colSpan="15" className="empty-row">Aucun historique pour le moment.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Panel({ title, className = '', children }) {
  return <section className={`panel ${className}`}><h2>{title}</h2>{children}</section>;
}

createRoot(document.getElementById('root')).render(<App />);
