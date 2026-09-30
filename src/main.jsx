import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  ReferenceLine,
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
  Search,
  Wrench,
  Settings,
  Trash2,
  Users,
  X,
  Edit3,
  AlertCircle,
  CheckCircle2,
  FileDown,
  PlusCircle,
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

const scrapTargetsByDepartment = {
  Injection: 2,
  Soudure: 0.5,
  Metallisation: 7,
  Assemblage: 0.2,
  Serigraphie: 0.2,
};
const scrapRateColors = {
  over: '#e23d3d',
  equal: '#d8a80e',
  under: '#1e9d5b',
};
const qualityOnlyMarker = 'SAISIE_QUALITE_SEULE: oui';
const paperInjectionRows = [
  ['2026-09-09', '202608.085', 6160, 16],
  ['2026-09-10', '202608.085', 6150, 78],
  ['2026-09-11', '202608.085', 7044, 71],
  ['2026-09-14', '202608.085', 8090, 17],
  ['2026-09-15', '202608.085', 9046, 39],
  ['2026-09-16', '202609.099', 8453, 62],
  ['2026-09-17', '202609.099', 10181, 59],
  ['2026-09-18', '202609.099', 4028, 134],
  ['2026-09-19', '202609.099', 3875, 75],
  ['2026-09-21', '202609.099', 8397, 35],
  ['2026-09-22', '202609.099', 10083, 45],
  ['2026-09-23', '202609.099', 10106, 106],
  ['2026-09-24', '202609.099', 10133, 115],
];

const seedEntries = paperInjectionRows.map(([production_date, work_order, good_qty, scrap_qty], index) => ({
  id: `paper-injection-d2301-${index + 1}`,
  production_date,
  department: 'Injection',
  machine_code: 'D230.1',
  product_reference: 'D230.1',
  work_order,
  good_qty,
  scrap_qty,
  justified_scrap_qty: 0,
  purge_kg: 0,
  defect_type: 'Autres',
  machine_hours: 0,
  work_hours: 0,
  mod_count: 0,
  mod_hours: 0,
  operator_names: '',
  note: buildQualityNote('D230.1', 'Saisie initiale depuis photo cahier injection D230.1'),
  entry_status: 'A completer',
  missing_fields: ['Total heure MOD'],
}));
const seedMachines = [
  { code: 'D230.1', label: 'Injection D230.1', department: 'Injection', reference: 'D230.1', source_file: 'Photo cahier qualite' },
  ...initialMachines
];
const seedReferences = [
  { reference: 'D230.1', designation: 'Injection D230.1', family: 'Injection', source_file: 'Photo cahier qualite' },
  ...initialReferences
];
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

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function extractArticleReference(note = '') {
  return String(note).match(/REF_ARTICLE:\s*(.*)/)?.[1]?.split('\n')[0]?.trim() || '';
}

function extractQualityNote(note = '') {
  return String(note)
    .replace(/^REF_ARTICLE:.*$/m, '')
    .replace(/^SAISIE_QUALITE_SEULE:.*$/m, '')
    .replace(/^NOTE_QUALITE:\s*/m, '')
    .replace(/^REPARTITION_DEFAUTS:.*$/m, '')
    .trim();
}

function extractDefectBreakdown(note = '', defectType = '', scrapQty = '') {
  const match = String(note).match(/^REPARTITION_DEFAUTS:\s*(.*)$/m);
  if (match) {
    try {
      const breakdown = JSON.parse(match[1]);
      if (Array.isArray(breakdown) && breakdown.length) return breakdown;
    } catch { /* Older or malformed note: use the legacy single defect. */ }
  }
  return [{ type: defectType || 'Autres', qty: scrapQty }];
}

function defectBreakdownForRow(row) {
  if (Array.isArray(row.defect_breakdown) && row.defect_breakdown.length) return row.defect_breakdown;
  return extractDefectBreakdown(row.note, row.defect_type, row.scrap_qty);
}

function breakdownTotal(breakdown = []) {
  return breakdown.reduce((sum, item) => sum + toNumber(item.qty), 0);
}

function scrapDefectEntries(row) {
  const breakdown = defectBreakdownForRow(row);
  const hasQuantities = breakdown.some((item) => toNumber(item.qty) > 0);
  return hasQuantities
    ? breakdown.filter((item) => toNumber(item.qty) > 0).map((item) => [item.type, toNumber(item.qty)])
    : [[row.defect_type || 'Autres', toNumber(row.scrap_qty)]];
}

function buildQualityNote(articleReference, qualityNote) {
  return [
    articleReference?.trim() ? `REF_ARTICLE: ${articleReference.trim()}` : '',
    qualityNote?.trim() ? `NOTE_QUALITE: ${qualityNote.trim()}` : '',
  ].filter(Boolean).join('\n');
}

function scrapRateStatus(rate, targetRate) {
  if (Math.abs(rate - targetRate) < 0.05) return 'equal';
  return rate > targetRate ? 'over' : 'under';
}

function RateDot({ cx, cy, payload, r = 6 }) {
  if (cx == null || cy == null) return null;
  const status = scrapRateStatus(toNumber(payload?.rate), toNumber(payload?.targetRate));
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={scrapRateColors[status]}
      stroke="#fff"
      strokeWidth="2"
    />
  );
}

function RateTargetLabel({ x, y, payload }) {
  if (x == null || y == null || !payload) return null;
  return (
    <text x={x} y={y - 18} textAnchor="middle" className="rate-target-label">
      <tspan x={x}>{payload.rate}%</tspan>
      <tspan x={x} dy="13">{`T ${payload.targetRate}%`}</tspan>
    </text>
  );
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
  if (!row.product_reference?.trim()) errors.push('Reference machine');
  if (!row.work_order?.trim()) errors.push('OF / Bon');
  if (toNumber(row.good_qty) <= 0) errors.push('Qte bonne');
  if (toNumber(row.mod_count) > 0 && !row.operator_names?.trim()) errors.push('Nom MOD');
  if (toNumber(row.mod_count) > 0 && toNumber(row.mod_hours) <= 0) errors.push('Total heure MOD');
  return errors;
}

function validateQuality(row) {
  const errors = [];
  if (!(row.article_reference || extractArticleReference(row.note)).trim()) errors.push('Reference article');
  const breakdown = row.defect_breakdown || defectBreakdownForRow(row);
  const activeBreakdown = breakdown.filter((item) => item.type && toNumber(item.qty) > 0);
  if (toNumber(row.scrap_qty) > 0 && !activeBreakdown.length) errors.push('Pareto defaut');
  if (activeBreakdown.length && breakdownTotal(activeBreakdown) !== toNumber(row.scrap_qty)) errors.push('Total defauts = qte rebut');
  if (toNumber(row.justified_scrap_qty) > toNumber(row.scrap_qty)) errors.push('rebut justifie <= qte rebut');
  return errors;
}

function isQualityOnlyEntry(row) {
  return String(row.note || '').includes(qualityOnlyMarker);
}

function completionStatus(row) {
  const productionMissing = isQualityOnlyEntry(row) ? [] : validateProduction(row);
  const missingFields = [...productionMissing, ...validateQuality(row)];
  return {
    status: missingFields.length ? 'A completer' : 'Complete',
    missingFields,
  };
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

function cleanDbRow(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
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

async function saveRows(name, rows) {
  if (!rows.length) return rows;
  const dbRows = rows.map((row) => {
    const clean = cleanDbRow(row);
    if (!clean.id) delete clean.id;
    return clean;
  });
  if (!supabase) {
    const existing = localRead(name, []);
    const key = name === 'machines' ? 'code' : name === 'product_references' ? 'reference' : null;
    const savedRows = dbRows.map((row) => ({ ...row, id: row.id || `local-${Date.now()}-${Math.random().toString(36).slice(2)}` }));
    const next = [
      ...savedRows,
      ...existing.filter((item) => {
        if (savedRows.some((row) => row.id && item.id === row.id)) return false;
        return key ? !savedRows.some((row) => row[key] === item[key]) : true;
      })
    ];
    localWrite(name, next);
    return savedRows;
  }
  if (name === 'production_entries') {
    const existingRows = dbRows.filter((row) => row.id);
    const newRows = dbRows.filter((row) => !row.id);
    const saved = [];
    const saveEntryBatch = async (batch, isUpdate) => {
      if (!batch.length) return [];
      const request = isUpdate
        ? supabase.from(name).upsert(batch, { onConflict: 'id' })
        : supabase.from(name).insert(batch);
      const result = await request.select();
      const missingBreakdownColumn = result.error
        && ['42703', 'PGRST204'].includes(result.error.code)
        && String(result.error.message).includes('defect_breakdown');
      if (!missingBreakdownColumn) {
        if (result.error) throw result.error;
        return result.data || [];
      }
      // Older databases can still persist the same breakdown in the note field.
      const compatibleBatch = batch.map(({ defect_breakdown, ...row }) => row);
      const retry = isUpdate
        ? await supabase.from(name).upsert(compatibleBatch, { onConflict: 'id' }).select()
        : await supabase.from(name).insert(compatibleBatch).select();
      if (retry.error) throw retry.error;
      return retry.data || [];
    };
    if (newRows.length) {
      saved.push(...await saveEntryBatch(newRows, false));
    }
    if (existingRows.length) {
      saved.push(...await saveEntryBatch(existingRows, true));
    }
    return saved;
  }
  const conflict = name === 'machines' ? 'code' : name === 'product_references' ? 'reference' : 'id';
  const { data, error } = await supabase.from(name).upsert(dbRows, { onConflict: conflict }).select();
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
  const sheetPanelRef = useRef(null);
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
  const [showAllIncomplete, setShowAllIncomplete] = useState(false);
  const [showAllProduction, setShowAllProduction] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [serviceMode, setServiceMode] = useState('production');
  const [filters, setFilters] = useState({ ...currentDateRange(), machine: 'Tous', reference: 'Tous', workOrder: 'Tous' });
  const [form, setForm] = useState({
    id: '',
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
    defect_breakdown: [],
    article_reference: '',
    note: '',
    entry_status: 'Qualite a completer',
    missing_fields: []
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
  const visibleProductionRows = useMemo(() => {
    const latestFirst = [...filtered].sort((a, b) => String(b.production_date || '').localeCompare(String(a.production_date || ''))
      || String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return showAllProduction ? latestFirst : latestFirst.slice(0, 3);
  }, [filtered, showAllProduction]);

  const departmentData = useMemo(() => departments.map((dept) => {
    const rows = entries.filter((entry) => entry.department === dept.key);
    const production = rows.reduce((sum, row) => sum + toNumber(row.good_qty), 0);
    const scrap = rows.reduce((sum, row) => sum + toNumber(row.scrap_qty), 0);
    const rate = production + scrap ? Number(((scrap / (production + scrap)) * 100).toFixed(1)) : 0;
    return { key: dept.key, name: t(dept.key), production, scrap, rate, targetRate: scrapTargetsByDepartment[dept.key] ?? 0 };
  }), [entries, t]);

  const factoryEvaluationData = useMemo(() => {
    const now = new Date();
    const scoreBucket = (bucket) => {
      const rows = entries.filter((entry) => entry.production_date >= bucket.from && entry.production_date <= bucket.to);
      const good = rows.reduce((sum, row) => sum + toNumber(row.good_qty), 0);
      const scrap = rows.reduce((sum, row) => sum + toNumber(row.scrap_qty), 0);
      const total = good + scrap;
      return { ...bucket, good, total, value: total ? Number(((good / total) * 100).toFixed(1)) : null };
    };
    const buckets = [];
    for (let offset = 2; offset >= 0; offset -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
      buckets.push(scoreBucket({ axisKey: `month-${offset}`, label: month.toLocaleDateString(locale, { month: 'short' }), section: 'quarter', from: isoDate(month), to: isoDate(isCurrentMonth ? now : monthEnd) }));
    }
    buckets.push({ axisKey: 'sep-month', label: '', value: null, separator: true });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let cursor = startOfWeek(monthStart);
    let week = 1;
    while (cursor <= now) {
      const weekEnd = addDays(cursor, 6);
      buckets.push(scoreBucket({ axisKey: `week-${week}`, label: `S${week}`, section: 'month', from: isoDate(cursor < monthStart ? monthStart : cursor), to: isoDate(weekEnd > now ? now : weekEnd) }));
      cursor = addDays(cursor, 7);
      week += 1;
    }
    buckets.push({ axisKey: 'sep-week', label: '', value: null, separator: true });
    const weekStart = startOfWeek(now);
    const currentWeekDay = (now.getDay() + 6) % 7;
    for (let index = 0; index <= currentWeekDay; index += 1) {
      const day = addDays(weekStart, index);
      buckets.push(scoreBucket({ axisKey: `day-${index}`, label: day.toLocaleDateString(locale, { weekday: 'short' }), section: 'week', from: isoDate(day), to: isoDate(day) }));
    }
    return buckets;
  }, [entries, locale]);

  const defectEvolution = useMemo(() => {
    const byDate = new Map();
    const typeSet = new Set();
    filtered.forEach((row) => {
      if (!row.production_date) return;
      const day = byDate.get(row.production_date) || { production_date: row.production_date };
      scrapDefectEntries(row).forEach(([name, quantity]) => {
        const type = name || 'Autres';
        typeSet.add(type);
        day[type] = (day[type] || 0) + quantity;
      });
      byDate.set(row.production_date, day);
    });
    return {
      data: [...byDate.values()].sort((a, b) => a.production_date.localeCompare(b.production_date)),
      types: [...typeSet].sort((a, b) => a.localeCompare(b)),
    };
  }, [filtered]);

  const machinesForDept = machines.filter((machine) => machine.department === form.department || !machine.department);
  const referencesForDept = references.filter((ref) => ref.family === form.department || !ref.family);
  const articleReferences = useMemo(() => {
    return [...new Set(entries.map((row) => row.product_reference).filter(Boolean))].sort();
  }, [entries]);
  const defectTypes = defectTypesByDepartment[form.department] || ['Autres'];
  const incompleteEntries = useMemo(() => entries.filter((row) => {
    const productionMissing = validateProduction(row);
    const qualityMissing = validateQuality(row);
    const computedStatus = row.entry_status || (productionMissing.length || qualityMissing.length ? 'A completer' : 'Complete');
    return computedStatus !== 'Complete' || productionMissing.length > 0 || qualityMissing.length > 0;
  }).sort((a, b) => String(b.production_date || '').localeCompare(String(a.production_date || ''))
    || String(b.created_at || '').localeCompare(String(a.created_at || ''))), [entries]);
  const visibleIncompleteEntries = showAllIncomplete ? incompleteEntries : incompleteEntries.slice(0, 3);

  const qualityQueue = useMemo(() => incompleteEntries.filter((row) => validateProduction(row).length === 0), [incompleteEntries]);

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
      defect_type: defaultDefect(department)
    });
  }

  function emptyForm(overrides = {}) {
    return {
      id: '',
      production_date: new Date().toISOString().slice(0, 10),
      department: activeDept,
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
      defect_type: defaultDefect(activeDept),
      defect_breakdown: [],
      note: '',
      article_reference: '',
      entry_status: 'Qualite a completer',
      missing_fields: [],
      ...overrides,
    };
  }

  function editProduction(row, targetService) {
    setActiveDept(row.department);
    setServiceMode(targetService || (validateProduction(row).length ? 'production' : 'quality'));
    setForm(emptyForm({
      ...row,
      work_hours: row.work_hours ?? row.machine_hours ?? 0,
      defect_breakdown: defectBreakdownForRow(row),
      article_reference: extractArticleReference(row.note),
      note: extractQualityNote(row.note),
      entry_status: row.entry_status || 'Qualite a completer',
      missing_fields: row.missing_fields || completionStatus(row).missingFields,
    }));
    setStatus({ key: 'Ligne chargee pour completion: {department} / {machine}', department: row.department, machine: row.machine_code || t('Non renseigne') });
    window.requestAnimationFrame(() => sheetPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function startQualityEntry() {
    setServiceMode('quality');
    setForm(emptyForm({
      department: activeDept,
      defect_type: defaultDefect(activeDept),
      entry_status: 'A completer',
      missing_fields: [],
    }));
    setStatus({ key: 'Nouvelle ligne qualite: saisir les donnees disponibles' });
  }

  function handleMachineChange(machineCode) {
    setForm({
      ...form,
      machine_code: machineCode
    });
  }

  async function saveProductionService(event) {
    event.preventDefault();
    try {
      const row = {
        ...form,
        id: form.id || undefined,
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
      const productionMissing = validateProduction(row);
      if (productionMissing.length) {
        setStatus({ key: 'A corriger avant sauvegarde: {fields}', fields: productionMissing, error: true });
        return;
      }
      const payload = {
        ...row,
        article_reference: undefined,
        note: '',
        entry_status: 'Qualite a completer',
        missing_fields: ['Controle qualite'],
      };
      delete payload.article_reference;
      const saved = await saveRows('production_entries', [payload]);
      setEntries((current) => [...saved, ...current.filter((item) => item.id !== saved[0]?.id)]);
      setForm(emptyForm({ department: row.department, defect_type: defaultDefect(row.department) }));
      setServiceMode('quality');
      setStatus({ key: 'Ligne envoyee au service qualite: {department} / {machine}', department: row.department, machine: row.machine_code });
    } catch (error) {
      setStatus({ key: 'Erreur sauvegarde: {error}', values: { error: error.message }, error: true });
    }
  }

  async function saveQualityService(event) {
    event.preventDefault();
    if (!supabase) {
      setStatus({ key: 'Supabase non configure: controle qualite non sauvegarde', error: true });
      return;
    }
    try {
      const row = {
        ...form,
        id: form.id || undefined,
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
      row.defect_breakdown = (form.defect_breakdown || []).filter((item) => item.type && toNumber(item.qty) > 0);
      const qualityMissing = validateQuality(row);
      if (qualityMissing.length) {
        setStatus({ key: 'A corriger avant sauvegarde: {fields}', fields: qualityMissing, error: true });
        return;
      }
      const note = [
        buildQualityNote(row.article_reference, row.note),
        row.defect_breakdown.length ? `REPARTITION_DEFAUTS: ${JSON.stringify(row.defect_breakdown)}` : '',
        form.id ? '' : qualityOnlyMarker,
      ].filter(Boolean).join('\n');
      const completion = completionStatus({ ...row, note });
      const payload = {
        ...row,
        article_reference: undefined,
        defect_type: row.defect_breakdown[0]?.type || row.defect_type,
        note,
        entry_status: completion.status,
        missing_fields: completion.missingFields,
      };
      delete payload.article_reference;
      const saved = await saveRows('production_entries', [payload]);
      setEntries((current) => [...saved, ...current.filter((item) => item.id !== saved[0]?.id)]);
      setForm(emptyForm({ department: row.department, defect_type: defaultDefect(row.department) }));
      setStatus({ key: 'Controle qualite sauvegarde: {department} / {machine}', department: row.department, machine: row.machine_code });
    } catch (error) {
      setStatus({ key: 'Erreur sauvegarde: {error}', values: { error: error.message }, error: true });
    }
  }

  async function addProduction(event, forceComplete = false) {
    event.preventDefault();
    try {
      const row = {
        ...form,
        id: form.id || undefined,
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
      const completion = completionStatus(row);
      if (forceComplete && completion.missingFields.length) {
        setStatus({ key: 'A corriger avant sauvegarde: {fields}', fields: completion.missingFields, error: true });
        return;
      }
      const payload = {
        ...row,
        article_reference: undefined,
        note: buildQualityNote(row.article_reference, row.note),
        entry_status: completion.status,
        missing_fields: completion.missingFields,
      };
      delete payload.article_reference;
      const saved = await saveRows('production_entries', [payload]);
      setEntries((current) => [...saved, ...current.filter((item) => item.id !== saved[0]?.id)]);
      setForm(emptyForm({ department: row.department, defect_type: defaultDefect(row.department) }));
      setStatus(completion.status === 'Complete'
        ? { key: 'Ligne complete sauvegardee: {department} / {machine}', department: row.department, machine: row.machine_code }
        : { key: 'Ligne a completer sauvegardee: {fields}', fields: completion.missingFields });
    } catch (error) {
      setStatus({ key: 'Erreur sauvegarde: {error}', values: { error: error.message }, error: true });
    }
  }

  async function confirmDeleteProduction(row) {
    try {
      await deleteRow('production_entries', row);
      setEntries((current) => current.filter((item) => item !== row && item.id !== row.id));
      setDeleteCandidate(null);
      setStatus({ key: 'Saisie supprimee: {department} / {machine}', department: row.department, machine: row.machine_code });
    } catch (error) {
      setStatus({ key: 'Erreur suppression: {error}', values: { error: error.message }, error: true });
    }
  }

  function exportExcel() {
    if (!entries.length) {
      setStatus({ key: 'Aucune donnee a exporter', error: true });
      return;
    }
    const rows = entries.map((row) => {
      const missing = Array.isArray(row.missing_fields) ? row.missing_fields : completionStatus(row).missingFields;
      return {
        [t("Etat")]: t(row.entry_status || 'Complete'),
        [t("Date")]: formatDate(row.production_date),
        [t("Departement")]: t(row.department),
        [t("Machine / Poste")]: row.machine_code || '',
        [t("Reference machine")]: row.product_reference || '',
        [t("Reference article")]: extractArticleReference(row.note),
        [t("OF / Bon")]: row.work_order || '',
        [t("Qte bonne")]: toNumber(row.good_qty),
        [t("Qte rebut")]: toNumber(row.scrap_qty),
        [t("Rebut justifie")]: toNumber(row.justified_scrap_qty),
        [t("Purge kg")]: toNumber(row.purge_kg),
        [t("Pareto defaut")]: row.defect_type ? t(row.defect_type) : '',
        [t("Heure travail")]: toNumber(row.work_hours ?? row.machine_hours),
        [t("MOD")]: toNumber(row.mod_count),
        [t("Nom MOD")]: row.operator_names || '',
        [t("Total H MOD")]: toNumber(row.mod_hours),
        [t("Champs manquants")]: missing.map((field) => t(field)).join(', '),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0]).map((header) => ({ wch: Math.max(14, Math.min(28, header.length + 4)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("Production").slice(0, 31));
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `production_tous_departements_${today}.xlsx`);
    setStatus({ key: '{count} ligne(s) exportee(s) vers Excel', count: rows.length });
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
          <img className="brand-logo" src="/quality-logo.svg" alt={t("Qualite")} />
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
        <label>{t("Reference machine")}<select value={filters.reference} onChange={(e) => setFilters({ ...filters, reference: e.target.value })}><option value="Tous">{t("Tous")}</option>{articleReferences.map((ref) => <option key={ref} value={ref}>{ref}</option>)}</select></label>
        <label>{t("OF / Bon")}<select value={filters.workOrder} onChange={(e) => setFilters({ ...filters, workOrder: e.target.value })}><option value="Tous">{t("Tous")}</option>{[...new Set(entries.map((row) => row.work_order).filter(Boolean))].map((of) => <option key={of} value={of}>{of}</option>)}</select></label>
        <button className="primary" type="button"><Search size={18} />{t("Appliquer")}</button>
        <button className="export-button" type="button" onClick={exportExcel}><FileDown size={18} />{t("Exporter Excel")}</button>
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

      <section className="service-switch" aria-label={t("Service de saisie")}>
        <button className={serviceMode === 'production' ? 'active' : ''} type="button" onClick={() => setServiceMode('production')}><Factory size={18} />{t("Service production")}</button>
        <button className={serviceMode === 'quality' ? 'active' : ''} type="button" onClick={() => setServiceMode('quality')}><CheckCircle2 size={18} />{t("Service qualite")}</button>
      </section>

      <Panel ref={sheetPanelRef} title={serviceMode === 'production' ? t("Saisie service production") : t("Saisie service qualite")} className="sheet-panel">
        {serviceMode === 'production' ? (
          <form className="sheet-form production-sheet" onSubmit={saveProductionService}>
            <label>{t("Date")}<input type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} /></label>
            <label>{t("Departement")}<select value={form.department} onChange={(e) => selectDepartment(e.target.value)}>{departments.map((dept) => <option key={dept.key} value={dept.key}>{t(dept.key)}</option>)}</select></label>
            <label>{t("Machine / Poste")}<select value={form.machine_code} onChange={(e) => handleMachineChange(e.target.value)}><option value="">{t("Choisir machine")}</option>{machinesForDept.map((machine) => <option key={machine.id || machine.code} value={machine.code}>{machine.code} - {t(machine.label)}</option>)}</select></label>
            <label>{t("Reference machine")}<select value={form.product_reference} onChange={(e) => setForm({ ...form, product_reference: e.target.value })}><option value="">{t("Choisir reference")}</option>{referencesForDept.map((ref) => <option key={ref.id || ref.reference} value={ref.reference}>{t(ref.reference)}</option>)}</select></label>
            <label>{t("OF / Bon")}<input placeholder={t("OF / Bon")} value={form.work_order} onChange={(e) => setForm({ ...form, work_order: e.target.value })} /></label>
            <label>{t("Qte bonne")}<input type="number" min="0" value={form.good_qty} onChange={(e) => setForm({ ...form, good_qty: e.target.value })} /></label>
            <label>{t("Heure travail")}<input type="number" min="0" step="0.1" value={form.work_hours} onChange={(e) => setForm({ ...form, work_hours: e.target.value })} /></label>
            <label>{t("MOD")}<input type="number" min="0" value={form.mod_count} onChange={(e) => setForm({ ...form, mod_count: e.target.value })} /></label>
            <label>{t("Nom MOD")}<input placeholder={t("Noms operateurs")} value={form.operator_names} onChange={(e) => setForm({ ...form, operator_names: e.target.value })} /></label>
            <label>{t("Total heure MOD")}<input type="number" min="0" step="0.1" value={form.mod_hours} onChange={(e) => setForm({ ...form, mod_hours: e.target.value })} /></label>
            <div className="sheet-actions">
              <button className="primary" type="submit"><Factory size={18} />{t("Envoyer au service qualite")}</button>
            </div>
          </form>
        ) : (
          <form className="sheet-form quality-sheet" onSubmit={saveQualityService}>
            <div className="quality-pick">
              <label>{t("Ligne production")}<select value={form.id} onChange={(e) => {
                const row = qualityQueue.find((item) => item.id === e.target.value);
                if (row) editProduction(row);
              }}><option value="">{t("Choisir ligne production")}</option>{qualityQueue.map((row) => <option key={row.id} value={row.id}>{formatDate(row.production_date)} - {t(row.department)} - {row.machine_code} - {row.work_order}</option>)}</select></label>
              <button type="button" onClick={startQualityEntry}><PlusCircle size={18} />{t("Nouvelle ligne qualite")}</button>
            </div>
            <label>{t("Date")}<input type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} /></label>
            <label>{t("Departement")}<select value={form.department} onChange={(e) => { const nextDefect = defaultDefect(e.target.value); setForm({ ...form, department: e.target.value, defect_type: nextDefect, defect_breakdown: [] }); }}>{departments.map((dept) => <option key={dept.key} value={dept.key}>{t(dept.key)}</option>)}</select></label>
            <label>{t("Machine / Poste")}<input placeholder={t("Machine / Poste")} value={form.machine_code || ''} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} /></label>
            <label>{t("Reference machine")}<input placeholder={t("Reference machine")} value={form.product_reference || ''} onChange={(e) => setForm({ ...form, product_reference: e.target.value })} /></label>
            <label>{t("OF / Bon")}<input placeholder={t("OF / Bon")} value={form.work_order || ''} onChange={(e) => setForm({ ...form, work_order: e.target.value })} /></label>
            <label>{t("Reference article")}<input placeholder={t("Reference article")} value={form.article_reference} onChange={(e) => setForm({ ...form, article_reference: e.target.value })} /></label>
            <label>{t("Qte bonne")}<input type="number" min="0" value={form.good_qty} onChange={(e) => setForm({ ...form, good_qty: e.target.value })} /></label>
            <label>{t("Qte rebut")}<input type="number" min="0" value={form.scrap_qty} onChange={(e) => setForm({ ...form, scrap_qty: e.target.value })} /></label>
            <label>{t("Rebut justifie")}<input type="number" min="0" value={form.justified_scrap_qty} onChange={(e) => setForm({ ...form, justified_scrap_qty: e.target.value })} /></label>
            <label>{t("Purge kg")}<input type="number" min="0" step="0.1" value={form.purge_kg} onChange={(e) => setForm({ ...form, purge_kg: e.target.value })} /></label>
            <div className="defect-breakdown">
              <strong>{t("Repartition defauts")}</strong>
              {(form.defect_breakdown || []).map((item, index) => <div className="defect-breakdown-row" key={index}>
                <input aria-label={`${t("Pareto defaut")} ${index + 1}`} list={`defect-suggestions-${form.department}`} value={item.type} placeholder={t("Saisir ou choisir defaut")} onChange={(e) => setForm({ ...form, defect_breakdown: form.defect_breakdown.map((entry, rowIndex) => rowIndex === index ? { ...entry, type: e.target.value } : entry) })} />
                <input aria-label={`${t("Quantite defaut")} ${index + 1}`} type="number" min="0" step="1" placeholder={t("Quantite defaut")} value={item.qty} onChange={(e) => setForm({ ...form, defect_breakdown: form.defect_breakdown.map((entry, rowIndex) => rowIndex === index ? { ...entry, qty: e.target.value } : entry) })} />
                {form.defect_breakdown.length > 1 && <button type="button" aria-label={t("Supprimer defaut")} onClick={() => setForm({ ...form, defect_breakdown: form.defect_breakdown.filter((_, rowIndex) => rowIndex !== index) })}><X size={16} /></button>}
              </div>)}
              <datalist id={`defect-suggestions-${form.department}`}>
                {defectTypes.map((type) => <option key={type} value={type} />)}
              </datalist>
              <div className="defect-breakdown-footer"><button type="button" onClick={() => setForm({ ...form, defect_breakdown: [...(form.defect_breakdown || []), { type: '', qty: '' }] })}><PlusCircle size={16} />{t("Ajouter un defaut")}</button><span>{t("Total defauts")}: {breakdownTotal(form.defect_breakdown)} / {toNumber(form.scrap_qty)}</span></div>
              {form.defect_breakdown?.some((item) => toNumber(item.qty) > 0) && breakdownTotal(form.defect_breakdown) !== toNumber(form.scrap_qty) && <small className="defect-breakdown-error">{t("Total defauts doit correspondre a qte rebut")}</small>}
            </div>
            <label>{t("Note qualite")}<input placeholder={t("Observation controle")} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <div className="sheet-actions">
              <button className="primary" type="submit"><CheckCircle2 size={18} />{t("Valider controle qualite")}</button>
            </div>
          </form>
        )}
        <div className="import-row">
          <span role="status" aria-live="polite" className={status.error ? 'save-status bad-status' : 'save-status'}>{t(status.key, {
            ...status.values,
            department: t(status.department),
            machine: status.machine,
            count: status.count?.toLocaleString(locale),
            fields: status.fields?.map((field) => t(field)).join(locale === 'ar' ? '، ' : ', '),
          })}
            {status.error && status.fields?.length > 0 && <ul className="save-error-fields">{status.fields.map((field) => <li key={field}>{t(field)}</li>)}</ul>}
            {status.error && status.values?.error && <div className="save-error-detail">{status.values.error}</div>}
          </span>
        </div>
      </Panel>

      <Panel title={t("Saisies a completer")} className="incomplete-panel">
        <table>
          <thead><tr><th>{t("Etat")}</th><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("OF / Bon")}</th><th>{t("Pareto defaut")}</th><th>{t("Champs manquants")}</th><th>{t("Action")}</th></tr></thead>
          <tbody>
            {visibleIncompleteEntries.map((row, index) => {
              const missing = Array.isArray(row.missing_fields) ? row.missing_fields : completionStatus(row).missingFields;
              return (
                <tr key={row.id || index}>
                  <td><span className="state-pill">{t(row.entry_status || 'A completer')}</span></td>
                  <td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code || '-'}</td><td>{row.product_reference || '-'}</td><td>{row.work_order || '-'}</td><td><DefectBreakdown row={row} t={t} locale={locale} /></td><td>{missing.map((field) => t(field)).join(locale === 'ar' ? '، ' : ', ')}</td>
                  <td>
                    <div className="row-actions">
                      <button className="compact-action" type="button" onClick={() => editProduction(row, 'production')}><Edit3 size={16} />{t("Prod")}</button>
                      <button className="compact-action" type="button" onClick={() => editProduction(row, 'quality')}><CheckCircle2 size={16} />{t("Qualite")}</button>
                      <button className="compact-action danger-button" type="button" onClick={() => setDeleteCandidate(row)}><Trash2 size={16} />{t("Supprimer")}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!incompleteEntries.length && <tr><td colSpan="9" className="empty-row">{t("Aucune saisie incomplete.")}</td></tr>}
          </tbody>
        </table>
        {incompleteEntries.length > 3 && <div className="incomplete-actions"><button type="button" onClick={() => setShowAllIncomplete((current) => !current)}>{showAllIncomplete ? t("Afficher les 3 dernieres") : t("Afficher tout")}</button></div>}
      </Panel>

      <section className="grid charts">
        <Panel title={t("Évaluation usine")} className="span6 factory-eval-panel">
          <ResponsiveContainer height={280}>
            <ComposedChart data={factoryEvaluationData} margin={{ top: 24, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#dbe5f2" vertical={false} />
              <XAxis dataKey="axisKey" tickFormatter={(_, index) => factoryEvaluationData[index]?.label || ''} interval={0} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value, name) => [`${value}%`, t(name)]} />
              <ReferenceLine x="sep-month" stroke="#7fb0ff" strokeDasharray="5 5" />
              <ReferenceLine x="sep-week" stroke="#7fb0ff" strokeDasharray="5 5" />
              <Area type="monotone" dataKey="value" stroke="none" fill="#8cbcff" fillOpacity={0.28} connectNulls name={t("Évaluation usine")} />
              <Line type="monotone" dataKey="value" stroke="#287fff" strokeWidth={4} dot={{ r: 5, strokeWidth: 3, fill: '#fff', stroke: '#287fff' }} activeDot={{ r: 7 }} connectNulls name={t("Évaluation usine")} label={({ x, y, value }) => value == null ? null : <text x={x} y={y - 12} textAnchor="middle" className="chart-value-label">{Math.round(value)}%</text>} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="factory-period-labels">
            <strong>{t("3 derniers mois")}</strong>
            <strong>{t("Mois actuel")}</strong>
            <strong>{t("Semaine actuelle")}</strong>
          </div>
        </Panel>
        <Panel title={t("Evolution des defauts")} className="span6 defect-evolution-panel">
          <ResponsiveContainer height={320}>
            <ComposedChart data={defectEvolution.data} margin={{ top: 16, right: 24, bottom: 18, left: 8 }}>
              <CartesianGrid stroke="#dbe5f2" vertical={false} />
              <XAxis dataKey="production_date" tick={{ fontSize: 12 }} tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(value) => formatDate(value)} formatter={(value, name) => [value, t(name)]} />
              <Legend formatter={(value) => t(value)} />
              {defectEvolution.types.map((type, index) => <Line key={type} type="monotone" dataKey={type} name={type} stroke={['#287fff', '#ff8124', '#20a77a', '#a855f7', '#e23d3d', '#0891b2', '#d8a80e'][index % 7]} strokeWidth={2.5} connectNulls dot={{ r: 3 }} activeDot={{ r: 6 }} />)}
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={t("Comparatif par departement")} className="span12">
          <ResponsiveContainer height={320}>
            <ComposedChart data={departmentData}>
              <CartesianGrid stroke="#dbe5f2" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 12]} />
              <Tooltip />
              <Legend />
              <Line yAxisId="right" type="monotone" dataKey="targetRate" stroke="#f59e0b" strokeWidth={3} strokeDasharray="7 6" dot={false} activeDot={false} name={t("Target rebut (%)")} />
              <Line yAxisId="right" dataKey="rate" stroke="#667a94" strokeWidth={3} dot={<RateDot />} activeDot={<RateDot r={8} />} label={<RateTargetLabel />} name={t("Q/R (%)")} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="rate-status-legend">
            <span><i className="rate-under" />{t("Sous target")}</span>
            <span><i className="rate-equal" />{t("Au target")}</span>
            <span><i className="rate-over" />{t("Depasse target")}</span>
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
          <thead><tr><th>{t("Etat")}</th><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("OF / Bon")}</th><th>{t("Qte bonne")}</th><th>{t("Qte rebut")}</th><th>{t("Rebut justifie")}</th><th>{t("Purge kg")}</th><th>{t("Pareto defaut")}</th><th>{t("Heure travail")}</th><th>{t("MOD")}</th><th>{t("Nom MOD")}</th><th>{t("Total H MOD")}</th><th></th></tr></thead>
          <tbody>
            {visibleProductionRows.map((row, index) => (
              <tr key={row.id || index}>
                <td><span className={row.entry_status === 'Complete' ? 'state-pill complete' : 'state-pill'}>{t(row.entry_status || 'Complete')}</span></td><td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code}</td><td>{row.product_reference}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString(locale)}</td><td>{toNumber(row.scrap_qty).toLocaleString(locale)}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString(locale)}</td><td>{row.purge_kg}</td><td><DefectBreakdown row={row} t={t} locale={locale} /></td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                <td><button aria-label={t("Completer")} className="icon-only" type="button" onClick={() => editProduction(row)}><Edit3 size={16} /></button><button aria-label={t("Supprimer")} className="icon-only danger-icon" type="button" onClick={() => setDeleteCandidate(row)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="16" className="empty-row">{t("Aucune donnee. Choisissez un departement puis ajoutez une ligne de production.")}</td></tr>}
          </tbody>
        </table>
        {filtered.length > 3 && <div className="incomplete-actions"><button type="button" onClick={() => setShowAllProduction((current) => !current)}>{showAllProduction ? t("Afficher les 3 dernieres") : t("Afficher tout")}</button></div>}
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
                    <td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code}</td><td>{row.product_reference}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString(locale)}</td><td>{toNumber(row.scrap_qty).toLocaleString(locale)}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString(locale)}</td><td>{row.purge_kg}</td><td><DefectBreakdown row={row} t={t} locale={locale} /></td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                      <td><button className="danger-button compact-danger" type="button" onClick={() => setDeleteCandidate(row)}><Trash2 size={16} />{t("Supprimer")}</button></td>
                    </tr>
                  ))}
                  {!entries.length && <tr><td colSpan="15" className="empty-row">{t("Aucun historique pour le moment.")}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {deleteCandidate && (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-label={t("Supprimer cette saisie ?")}>
          <section className="confirm-window">
            <header>
              <Trash2 size={22} />
              <h2>{t("Supprimer cette saisie ?")}</h2>
            </header>
            <p>{formatDate(deleteCandidate.production_date)} - {t(deleteCandidate.department)} - {deleteCandidate.machine_code}</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setDeleteCandidate(null)}>{t("Annuler")}</button>
              <button className="danger-button" type="button" onClick={() => confirmDeleteProduction(deleteCandidate)}>{t("OK supprimer")}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function DefectBreakdown({ row, t, locale }) {
  const totals = new Map();
  scrapDefectEntries(row).forEach(([type, quantity]) => {
    const name = type || 'Autres';
    totals.set(name, (totals.get(name) || 0) + quantity);
  });
  return <div className="table-defect-list">{[...totals].map(([type, quantity]) => (
    <span className="table-defect-item" key={type}><strong>{t(type)}</strong><small>{quantity.toLocaleString(locale)}</small></span>
  ))}</div>;
}

const Panel = React.forwardRef(function Panel({ title, className = '', children }, ref) {
  return <section ref={ref} className={`panel ${className}`}><h2>{title}</h2>{children}</section>;
});

createRoot(document.getElementById('root')).render(<App />);
