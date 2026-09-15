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
import LanguageSwitcher from './LanguageSwitcher.jsx';
import LiveClock from './LiveClock.jsx';
import { languages, languageStorageKey, readLanguage, createTranslator } from './i18n.js';

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
  if (!row.department) errors.push('Departement');
  if (!row.machine_code) errors.push('Machine / Poste');
  if (!row.product_reference) errors.push('Reference machine');
  if (!row.work_order?.trim()) errors.push('OF / Bon');
  if (!row.defect_type) errors.push('Pareto defaut');
  if (toNumber(row.good_qty) <= 0 && toNumber(row.scrap_qty) <= 0) errors.push('qte bonne ou qte rebut');
  if (toNumber(row.justified_scrap_qty) > toNumber(row.scrap_qty)) errors.push('rebut justifie <= qte rebut');
  if (toNumber(row.mod_count) > 0 && !row.operator_names?.trim()) errors.push('Nom MOD');
  if (toNumber(row.mod_count) > 0 && toNumber(row.mod_hours) <= 0) errors.push('Total heure MOD');
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
  const [language, setLanguage] = useState(() => readLanguage());
  const t = useMemo(() => createTranslator(language), [language]);
  const locale = languages.find(({ code }) => code === language).locale;
  const formatDate = (value) => new Date(value + 'T12:00:00').toLocaleDateString(locale);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = t('Dashboard Qualite & Production');
    try { localStorage.setItem(languageStorageKey, language); } catch { /* Storage may be disabled. */ }
  }, [language, t]);

  const [activeDept, setActiveDept] = useState('Injection');
  const [entries, setEntries] = useState(seedEntries);
  const [machines, setMachines] = useState(seedMachines);
  const [references, setReferences] = useState(seedReferences);
  const [assignments, setAssignments] = useState(seedAssignments);
  const [status, setStatus] = useState({ key: supabase ? 'Connecte a Supabase' : 'Mode local: ajoutez .env pour Supabase' });
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
    return { name: t(dept.key), production, scrap, rate: production + scrap ? Number(((scrap / (production + scrap)) * 100).toFixed(1)) : 0 };
  }), [entries, t]);

  const defectData = useMemo(() => {
    const map = new Map();
    filtered.forEach((row) => map.set(row.defect_type || 'Autre', (map.get(row.defect_type || 'Autre') || 0) + toNumber(row.scrap_qty)));
    const sorted = [...map.entries()].map(([name, defects]) => ({ name, defects })).sort((a, b) => b.defects - a.defects);
    const total = sorted.reduce((sum, row) => sum + row.defects, 0) || 1;
    let cumulative = 0;
    return sorted.map((row) => {
      cumulative += row.defects;
      return { ...row, name: t(row.name), cumulative: Number(((cumulative / total) * 100).toFixed(0)) };
    });
  }, [filtered, t]);

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
        setStatus({ key: 'A corriger avant sauvegarde: {fields}', fields: errors, error: true });
        return;
      }
      const saved = await insertRows('production_entries', [row]);
      setEntries((current) => [...saved, ...current]);
      setStatus({ key: 'Ligne validee et sauvegardee: {department} / {machine}', department: row.department, machine: row.machine_code });
    } catch (error) {
      setStatus({ key: 'Erreur sauvegarde: {error}', values: { error: error.message }, error: true });
    }
  }

  async function deleteProduction(row) {
    const ok = window.confirm(`${t('Supprimer cette saisie ?')}\n${formatDate(row.production_date)} - ${t(row.department)} - ${row.machine_code}`);
    if (!ok) return;
    try {
      await deleteRow('production_entries', row);
      setEntries((current) => current.filter((item) => item !== row && item.id !== row.id));
      setStatus({ key: 'Saisie supprimee: {department} / {machine}', department: row.department, machine: row.machine_code });
    } catch (error) {
      setStatus({ key: 'Erreur suppression: {error}', values: { error: error.message }, error: true });
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
      setStatus({ key: '{count} machines importees depuis Excel', count: saved.length });
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
      setStatus({ key: '{count} references produit importees depuis Excel', count: saved.length });
    }
    event.target.value = '';
  }

  function resetDemo() {
    setEntries(seedEntries);
    setMachines(seedMachines);
    setReferences(seedReferences);
    setAssignments(seedAssignments);
    setStatus({ key: 'Donnees videes: pret pour import Excel et saisie' });
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div>
            <h1>{t("Dashboard Qualite & Production")}</h1>
            <p>{t("Suivi par departement: Injection, Soudure, Metallisation, Assemblage, Serigraphie")}</p>
          </div>
        </div>
        <div className="status-strip">
          <LanguageSwitcher language={language} onChange={setLanguage} t={t} />
          <button className="history-top-button" type="button" onClick={() => setShowHistoryWindow(true)}><History size={18} />{t("Historique")}</button>
          <LiveClock locale={locale} />
          <div className="divider" />
          <div><strong>{t("Qualite aujourd'hui")}</strong><span>{t("Performance demain")}</span></div>
        </div>
      </header>

      <section className="filters">
        <label>{t("Date debut")}<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
        <label>{t("Date fin")}<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        <label>{t("Machine / Poste")}<select value={filters.machine} onChange={(e) => setFilters({ ...filters, machine: e.target.value })}><option value="Tous">{t("Tous")}</option>{machines.map((machine) => <option key={machine.id || machine.code} value={machine.code}>{machine.code}</option>)}</select></label>
        <label>{t("Reference produit")}<select value={filters.reference} onChange={(e) => setFilters({ ...filters, reference: e.target.value })}><option value="Tous">{t("Tous")}</option>{references.map((ref) => <option key={ref.id || ref.reference} value={ref.reference}>{t(ref.reference)}</option>)}</select></label>
        <label>{t("OF / Bon")}<select value={filters.workOrder} onChange={(e) => setFilters({ ...filters, workOrder: e.target.value })}><option value="Tous">{t("Tous")}</option>{[...new Set(entries.map((row) => row.work_order).filter(Boolean))].map((of) => <option key={of} value={of}>{of}</option>)}</select></label>
        <button className="primary" type="button"><Search size={18} />{t("Appliquer")}</button>
        <button type="button" onClick={resetDemo}><RefreshCcw size={18} />{t("Reinitialiser")}</button>
      </section>

      <section className="dept-tabs">
        {departments.map(({ key, subtitle, icon: Icon }) => (
          <button className={activeDept === key ? 'active' : ''} type="button" key={key} onClick={() => selectDepartment(key)}>
            <Icon size={42} />
            <span><strong>{t(key)}</strong><small>{t(subtitle)}</small></span>
          </button>
        ))}
      </section>

      <Panel title={t("Feuille de saisie production")} className="sheet-panel">
        <form className="sheet-form" onSubmit={addProduction}>
          <label>{t("Date")}<input type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} /></label>
          <label>{t("Departement")}<select value={form.department} onChange={(e) => selectDepartment(e.target.value)}>{departments.map((dept) => <option key={dept.key} value={dept.key}>{t(dept.key)}</option>)}</select></label>
          <label>{t("Machine / Poste")}<select value={form.machine_code} onChange={(e) => handleMachineChange(e.target.value)}><option value="">{t("Choisir machine")}</option>{machinesForDept.map((machine) => <option key={machine.id || machine.code} value={machine.code}>{machine.code} - {t(machine.label)}</option>)}</select></label>
          <label>{t("Reference machine")}<select value={form.product_reference} onChange={(e) => setForm({ ...form, product_reference: e.target.value })}><option value="">{t("Choisir reference")}</option>{referencesForDept.map((ref) => <option key={ref.id || ref.reference} value={ref.reference}>{t(ref.reference)}</option>)}</select></label>
          <label>{t("OF / Bon")}<input placeholder={t("OF / Bon")} value={form.work_order} onChange={(e) => setForm({ ...form, work_order: e.target.value })} /></label>
          <label>{t("Qte bonne")}<input type="number" min="0" value={form.good_qty} onChange={(e) => setForm({ ...form, good_qty: e.target.value })} /></label>
          <label>{t("Qte rebut")}<input type="number" min="0" value={form.scrap_qty} onChange={(e) => setForm({ ...form, scrap_qty: e.target.value })} /></label>
          <label>{t("Rebut justifie")}<input type="number" min="0" value={form.justified_scrap_qty} onChange={(e) => setForm({ ...form, justified_scrap_qty: e.target.value })} /></label>
          <label>{t("Purge kg")}<input type="number" min="0" step="0.1" value={form.purge_kg} onChange={(e) => setForm({ ...form, purge_kg: e.target.value })} /></label>
          <label>{t("Pareto defaut")}<select value={form.defect_type} onChange={(e) => setForm({ ...form, defect_type: e.target.value })}>{defectTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label>
          <label>{t("Heure travail")}<input type="number" min="0" step="0.1" value={form.work_hours} onChange={(e) => setForm({ ...form, work_hours: e.target.value })} /></label>
          <label>{t("MOD")}<input type="number" min="0" value={form.mod_count} onChange={(e) => setForm({ ...form, mod_count: e.target.value })} /></label>
          <label>{t("Nom MOD")}<input placeholder={t("Noms operateurs")} value={form.operator_names} onChange={(e) => setForm({ ...form, operator_names: e.target.value })} /></label>
          <label>{t("Total heure MOD")}<input type="number" min="0" step="0.1" value={form.mod_hours} onChange={(e) => setForm({ ...form, mod_hours: e.target.value })} /></label>
          <button className="primary sheet-save" type="submit"><Save size={18} />{t("Sauvegarder la ligne")}</button>
        </form>
        <div className="import-row">
          <span role="status" aria-live="polite" className={status.error ? 'save-status bad-status' : 'save-status'}>{t(status.key, {
            ...status.values,
            department: t(status.department),
            machine: status.machine,
            count: status.count?.toLocaleString(locale),
            fields: status.fields?.map((field) => t(field)).join(locale === 'ar' ? '، ' : ', '),
          })}</span>
        </div>
      </Panel>

      <section className="grid charts">
        <Panel title={t("Pareto des defauts")} className="span4">
          <ResponsiveContainer height={250}>
            <ComposedChart data={defectData}>
              <CartesianGrid stroke="#dbe5f2" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="defects" fill="#1d7fe2" radius={[4, 4, 0, 0]} name={t("Nombre de defauts")} />
              <Line yAxisId="right" dataKey="cumulative" stroke="#ff8124" strokeWidth={3} name={t("% cumule")} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={t("Comparatif par departement")} className="span4">
          <ResponsiveContainer height={250}>
            <ComposedChart data={departmentData}>
              <CartesianGrid stroke="#dbe5f2" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 12]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="production" fill="#1d7fe2" name={t("Production")} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="scrap" fill="#e23d3d" name={t("Rebut")} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" dataKey="rate" stroke="#ff8124" strokeWidth={0} dot={{ r: 5 }} name={t("Taux de rebut (%)")} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={t("Repartition du rebut par departement")} className="span4">
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
                <div key={row.name}><i style={{ background: colors[index] }} />{row.name}<strong>{row.value.toLocaleString(locale)}</strong></div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="workbench">
        <Panel title={t("Affectation MOD")}>
          <table>
            <thead><tr><th>{t("Machine / Poste")}</th><th>{t("Nom MOD / operateur(s)")}</th><th>{t("Nb MOD")}</th><th>{t("Total heure MOD")}</th></tr></thead>
            <tbody>
              {assignmentRows.map((row, index) => <tr key={row.id || `${row.machine_code}-${index}`}><td>{row.machine_code}</td><td>{row.operator_names}</td><td>{row.mod_count}</td><td>{toNumber(row.mod_hours).toLocaleString(locale)}</td></tr>)}
              {!assignmentRows.length && <tr><td colSpan="4" className="empty-row">{t("Aucune affectation MOD saisie.")}</td></tr>}
            </tbody>
          </table>
        </Panel>
      </section>

      <Panel title={t("Detail de la production")}>
        <table>
          <thead><tr><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("OF / Bon")}</th><th>{t("Qte bonne")}</th><th>{t("Qte rebut")}</th><th>{t("Rebut justifie")}</th><th>{t("Purge kg")}</th><th>{t("Pareto defaut")}</th><th>{t("Heure travail")}</th><th>{t("MOD")}</th><th>{t("Nom MOD")}</th><th>{t("Total H MOD")}</th><th></th></tr></thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.id || index}>
                <td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code}</td><td>{t(row.product_reference)}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString(locale)}</td><td>{toNumber(row.scrap_qty).toLocaleString(locale)}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString(locale)}</td><td>{row.purge_kg}</td><td>{t(row.defect_type)}</td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                <td><button aria-label={t("Supprimer")} className="icon-only danger-icon" type="button" onClick={() => deleteProduction(row)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="15" className="empty-row">{t("Aucune donnee. Choisissez un departement puis ajoutez une ligne de production.")}</td></tr>}
          </tbody>
        </table>
      </Panel>

      {showHistoryWindow && (
        <div className="history-modal" role="dialog" aria-modal="true" aria-label={t("Fenetre historique des ajouts")}>
          <section className="history-window">
            <header className="history-window-head">
              <div>
                <h2>{t("Historique complet des ajouts")}</h2>
                <p>{t('{count} ligne(s) enregistree(s)', { count: entries.length.toLocaleString(locale) })}</p>
              </div>
              <button className="icon-only" type="button" onClick={() => setShowHistoryWindow(false)} aria-label={t("Fermer historique")}><X size={18} /></button>
            </header>
            <div className="history-window-body">
              <table>
                <thead><tr><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("OF / Bon")}</th><th>{t("Qte bonne")}</th><th>{t("Qte rebut")}</th><th>{t("Rebut justifie")}</th><th>{t("Purge kg")}</th><th>{t("Pareto defaut")}</th><th>{t("Heure travail")}</th><th>{t("MOD")}</th><th>{t("Nom MOD")}</th><th>{t("Total H MOD")}</th><th>{t("Action")}</th></tr></thead>
                <tbody>
                  {entries.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code}</td><td>{t(row.product_reference)}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString(locale)}</td><td>{toNumber(row.scrap_qty).toLocaleString(locale)}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString(locale)}</td><td>{row.purge_kg}</td><td>{t(row.defect_type)}</td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                      <td><button className="danger-button compact-danger" type="button" onClick={() => deleteProduction(row)}><Trash2 size={16} />{t("Supprimer")}</button></td>
                    </tr>
                  ))}
                  {!entries.length && <tr><td colSpan="15" className="empty-row">{t("Aucun historique pour le moment.")}</td></tr>}
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
