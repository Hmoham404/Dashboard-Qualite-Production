import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  DefaultLegendContent,
  LabelList,
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
import { scrapTargetsByDepartment, scrapRateColors, scrapRateStatus, scrapRateGradientStops } from './scrapRate.js';
import { localDateKey, monthBounds, monthDates, rowsForMonth, entryDateForMonth, buildMonthSnapshot, isMonthClosed, assertLocalMonthsOpen, readAllRows } from './monthly.js';
import { buildMonthlyWorkbook } from './monthlyExport.js';
import { buildDefectEvolution } from './defectEvolution.js';
import DefectEvolutionDialog, { DefectBar } from './DefectEvolutionDialog.jsx';
import { extractArticleReference, extractClientName, extractQualityNote, buildQualityNote } from './qualityNote.js';
import { filterProductionByClient, productionClients } from './productionFilters.js';
import LotWorkspacePage from './LotWorkspacePage.jsx';

const defectColors = ['#287fff', '#ff8124', '#20a77a', '#a855f7', '#e23d3d', '#0891b2', '#d8a80e'];

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
  return localDateKey(date);
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
  return readAllRows(supabase, name);
}

function guardLocalRows(name, rows) {
  const dateKey = { production_entries: 'production_date', sorting_hours: 'sorting_date', customer_complaints: 'complaint_date', mod_assignments: 'shift_date' }[name];
  if (!dateKey) return;
  const existing = localRead(name, []);
  assertLocalMonthsOpen(localRead('monthly_closures', []), rows.flatMap((row) => [row[dateKey], existing.find((item) => item.id === row.id)?.[dateKey]]));
}

async function insertRows(name, rows) {
  if (!rows.length) return rows;
  if (!supabase) {
    guardLocalRows(name, rows);
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
    if (name === 'production_entries') delete clean.client_name;
    if (!clean.id) delete clean.id;
    return clean;
  });
  if (!supabase) {
    guardLocalRows(name, dbRows);
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
  guardLocalRows(name, [row]);
  const existing = localRead(name, []);
  localWrite(name, existing.filter((item) => item.id !== row.id));
}

function App() {
  const sheetPanelRef = useRef(null);
  const [showLotPage, setShowLotPage] = useState(() => window.location.hash === '#lot');
  useEffect(() => {
    const updatePage = () => setShowLotPage(window.location.hash === '#lot');
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);
  const [language, setLanguage] = useState(() => readLanguage());
  const t = useMemo(() => createTranslator(language), [language]);
  const locale = languages.find(({ code }) => code === language).locale;
  const formatDate = (value) => new Date(value + 'T12:00:00').toLocaleDateString(locale);
  const [today, setToday] = useState(() => localDateKey());
  const currentMonth = today.slice(0, 7);
  const [monthOverride, setMonthOverride] = useState(null);
  const selectedMonth = monthOverride || currentMonth;
  const selectedBounds = useMemo(() => monthBounds(selectedMonth), [selectedMonth]);
  const selectedDates = useMemo(() => monthDates(selectedMonth), [selectedMonth]);
  const monthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const defaultEntryDate = entryDateForMonth(selectedMonth, today);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [extraDataReady, setExtraDataReady] = useState({ complaints: false, sorting: false });
  const [reloadCount, setReloadCount] = useState(0);
  const [closures, setClosures] = useState([]);
  const [closureState, setClosureState] = useState('loading');
  const [closureError, setClosureError] = useState('');
  const [closingMonth, setClosingMonth] = useState(false);
  const [showCloseMonth, setShowCloseMonth] = useState(false);
  const [monthExportError, setMonthExportError] = useState('');
  const selectedClosure = closures.find((closure) => closure.month.slice(0, 7) === selectedMonth);
  const monthLocked = Boolean(selectedClosure) || closingMonth || dataLoading || Boolean(dataError) || ['loading', 'error'].includes(closureState);

  useEffect(() => {
    const refreshDay = () => setToday(localDateKey());
    const timer = window.setInterval(refreshDay, 30000);
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = showLotPage ? 'en' : language;
    document.documentElement.dir = !showLotPage && language === 'ar' ? 'rtl' : 'ltr';
    document.title = showLotPage ? 'LOT — Coming soon' : t('Dashboard Qualite & Production');
    try { localStorage.setItem(languageStorageKey, language); } catch { /* Storage may be disabled. */ }
  }, [language, t, showLotPage]);

  const [activeDept, setActiveDept] = useState('Injection');
  const [entries, setEntries] = useState([]);
  const [machines, setMachines] = useState(seedMachines);
  const [references, setReferences] = useState(seedReferences);
  const [assignments, setAssignments] = useState(seedAssignments);
  const [customerComplaints, setCustomerComplaints] = useState([]);
  const [sortingHours, setSortingHours] = useState([]);
  const [sortingModalDate, setSortingModalDate] = useState('');
  const [sortingDepartment, setSortingDepartment] = useState('Injection');
  const [sortingHoursValue, setSortingHoursValue] = useState('');
  const [sortingHeadcountValue, setSortingHeadcountValue] = useState('');
  const [sortingGoodQtyValue, setSortingGoodQtyValue] = useState('');
  const [sortingScrapQtyValue, setSortingScrapQtyValue] = useState('');
  const [sortingSaving, setSortingSaving] = useState(false);
  const [sortingError, setSortingError] = useState('');
  const [sortingChartDate, setSortingChartDate] = useState('');
  const [complaintChartDate, setComplaintChartDate] = useState('');
  const [complaintModalDate, setComplaintModalDate] = useState('');
  const [complaintDraft, setComplaintDraft] = useState('');
  const [complaintSaving, setComplaintSaving] = useState(false);
  const [complaintError, setComplaintError] = useState('');
  const [complaintDeleteCandidate, setComplaintDeleteCandidate] = useState(null);
  const [defectParetoMode, setDefectParetoMode] = useState('cumulative');
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [defectParetoDate, setDefectParetoDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return localDateKey(yesterday);
  });
  const [status, setStatus] = useState({ key: supabase ? 'Connecte a Supabase' : 'Mode local: ajoutez .env pour Supabase' });
  const [showHistoryWindow, setShowHistoryWindow] = useState(false);
  const [showAllIncomplete, setShowAllIncomplete] = useState(false);
  const [showAllProduction, setShowAllProduction] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [serviceMode, setServiceMode] = useState('production');
  const [filters, setFilters] = useState({ ...selectedBounds, machine: 'Tous', reference: 'Tous', workOrder: 'Tous', client: '' });
  useEffect(() => { setSelectedDefect(null); }, [activeDept, selectedMonth, filters.client]);
  const [form, setForm] = useState({
    id: '',
    production_date: defaultEntryDate,
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
    client_name: '',
    note: '',
    entry_status: 'Qualite a completer',
    missing_fields: []
  });

  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    setDataError('');
    Promise.all([
      loadTable('production_entries', seedEntries),
      loadTable('machines', seedMachines),
      loadTable('product_references', seedReferences),
      loadTable('mod_assignments', seedAssignments)
    ]).then(([production, machineRows, referenceRows, modRows]) => {
      if (cancelled) return;
      setEntries(production);
      setMachines(mergeUnique(machineRows, seedMachines, 'code'));
      setReferences(mergeUnique(referenceRows, seedReferences, 'reference'));
      setAssignments(modRows);
    }).catch((error) => {
      if (!cancelled) setDataError(error.message || 'Chargement impossible');
    }).finally(() => {
      if (!cancelled) setDataLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedMonth, reloadCount]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = supabase
          ? await readAllRows(supabase, 'monthly_closures', { columns: 'month,closed_at', orderBy: 'month', stableKey: 'month' })
          : localRead('monthly_closures', []);
        if (!cancelled) { setClosures(data); setClosureState('ready'); setClosureError(''); }
      } catch (error) {
        if (!cancelled) {
          setClosureState(['PGRST205', '42P01'].includes(error.code) ? 'missing' : 'error');
          setClosureError(error.message || 'Chargement impossible');
        }
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [selectedMonth, reloadCount]);

  useEffect(() => {
    setFilters({ ...monthBounds(selectedMonth), machine: 'Tous', reference: 'Tous', workOrder: 'Tous', client: '' });
    setForm(emptyForm());
    setDefectParetoDate((date) => date.startsWith(`${selectedMonth}-`) ? date : entryDateForMonth(selectedMonth, today));
    setComplaintChartDate('');
    setSortingChartDate('');
    setComplaintModalDate('');
    setSortingModalDate('');
    setDeleteCandidate(null);
    setComplaintDeleteCandidate(null);
    setShowAllIncomplete(false);
    setShowAllProduction(false);
    setShowCloseMonth(false);
    setMonthExportError('');
  }, [selectedMonth]);

  useEffect(() => {
    if (!supabase) { setExtraDataReady((state) => ({ ...state, complaints: true })); return; }
    let cancelled = false;
    setExtraDataReady((state) => ({ ...state, complaints: false }));
    readAllRows(supabase, 'customer_complaints', { orderBy: 'complaint_date' }).then((data) => {
      if (!cancelled) { setCustomerComplaints(data.map((row) => ({ id: row.id, date: row.complaint_date, details: row.details }))); setComplaintError(''); setExtraDataReady((state) => ({ ...state, complaints: true })); }
    }).catch((error) => {
      if (!cancelled) {
        const missingTable = ['PGRST205', '42P01'].includes(error.code);
        setComplaintError(missingTable
          ? 'Table customer_complaints absente : exécutez supabase-customer-complaints.sql dans le SQL Editor Supabase, puis rechargez.'
          : 'Connexion Supabase impossible pour les réclamations. Vérifiez les paramètres réseau et les règles d’accès.');
      }
    });
    return () => { cancelled = true; };
  }, [selectedMonth, reloadCount]);

  useEffect(() => {
    if (!supabase) { setExtraDataReady((state) => ({ ...state, sorting: true })); return; }
    let cancelled = false;
    setExtraDataReady((state) => ({ ...state, sorting: false }));
    readAllRows(supabase, 'sorting_hours', { orderBy: 'sorting_date' }).then((data) => {
      if (cancelled) return;
      setSortingHours((data || []).map((row) => ({
        id: row.id,
        date: row.sorting_date,
        department: row.department,
        hours: toNumber(row.hours),
        headcount: row.headcount ?? null,
        goodQty: toNumber(row.good_qty),
        scrapQty: toNumber(row.scrap_qty),
      })));
      setSortingError('');
      setExtraDataReady((state) => ({ ...state, sorting: true }));
    }).catch((error) => {
      if (!cancelled) setSortingError(error.message || 'Chargement impossible');
    });
    return () => { cancelled = true; };
  }, [selectedMonth, reloadCount]);

  const allMonthEntries = useMemo(() => rowsForMonth(entries, selectedMonth), [entries, selectedMonth]);
  const clientEntries = useMemo(() => filterProductionByClient(entries, filters.client), [entries, filters.client]);
  const monthEntries = useMemo(() => rowsForMonth(clientEntries, selectedMonth), [clientEntries, selectedMonth]);
  const clientOptions = useMemo(() => productionClients(allMonthEntries), [allMonthEntries]);
  const monthIncompleteCount = useMemo(() => allMonthEntries.filter((row) =>
    row.entry_status && row.entry_status !== 'Complete' || completionStatus(row).status !== 'Complete').length, [allMonthEntries]);
  const monthComplaints = useMemo(() => rowsForMonth(customerComplaints, selectedMonth, 'date'), [customerComplaints, selectedMonth]);
  const monthSortingHours = useMemo(() => rowsForMonth(sortingHours, selectedMonth, 'date'), [sortingHours, selectedMonth]);
  const archiveReady = !dataLoading && !dataError && extraDataReady.complaints && extraDataReady.sorting;

  const filtered = useMemo(() => {
    return monthEntries.filter((item) => {
      const inDate = item.production_date >= filters.from && item.production_date <= filters.to;
      const inDept = item.department === activeDept;
      const inMachine = filters.machine === 'Tous' || item.machine_code === filters.machine;
      const inRef = filters.reference === 'Tous' || item.product_reference === filters.reference;
      const inOf = filters.workOrder === 'Tous' || item.work_order === filters.workOrder;
      return inDate && inDept && inMachine && inRef && inOf;
    });
  }, [monthEntries, filters, activeDept]);
  const visibleProductionRows = useMemo(() => {
    const latestFirst = [...filtered].sort((a, b) => String(b.production_date || '').localeCompare(String(a.production_date || ''))
      || String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return showAllProduction ? latestFirst : latestFirst.slice(0, 3);
  }, [filtered, showAllProduction]);

  const departmentData = useMemo(() => {
    const dept = departments.find((item) => item.key === activeDept);
    if (!dept) return [];
    const rows = monthEntries.filter((entry) => entry.department === dept.key);
    const production = rows.reduce((sum, row) => sum + toNumber(row.good_qty), 0);
    const scrap = rows.reduce((sum, row) => sum + toNumber(row.scrap_qty), 0);
    const rate = production + scrap ? Number(((scrap / (production + scrap)) * 100).toFixed(1)) : 0;
    return [{ key: dept.key, name: t(dept.key), production, scrap, rate, targetRate: scrapTargetsByDepartment[dept.key] ?? 0 }];
  }, [monthEntries, activeDept, t]);

  const customerComplaintData = useMemo(() => {
    return selectedDates.map((date) => ({ date, complaints: monthComplaints.some((complaint) => complaint.date === date) ? 1 : 0 }));
  }, [monthComplaints, selectedDates]);

  const sortingHoursData = useMemo(() => {
    const rows = [];
    for (const date of selectedDates) {
      const row = { date };
      departments.forEach(({ key }) => {
        const departmentRows = monthSortingHours.filter((item) => item.date === date && item.department === key);
        row[key] = departmentRows.reduce((sum, item) => sum + toNumber(item.hours), 0);
        row[`${key}Headcount`] = departmentRows.length && departmentRows.every((item) => item.headcount != null)
          ? departmentRows.reduce((sum, item) => sum + item.headcount, 0)
          : null;
        row[`${key}GoodQty`] = departmentRows.reduce((sum, item) => sum + toNumber(item.goodQty), 0);
        row[`${key}ScrapQty`] = departmentRows.reduce((sum, item) => sum + toNumber(item.scrapQty), 0);
      });
      rows.push(row);
    }
    return rows;
  }, [monthSortingHours, selectedDates]);

  const departmentTargetTrend = useMemo(() => {
    const targetRate = scrapTargetsByDepartment[activeDept] ?? 0;
    const perDay = new Map();
    const departmentEntries = monthEntries.filter((entry) => entry.department === activeDept);
    departmentEntries.forEach((entry) => {
      const totals = perDay.get(entry.production_date) || { good: 0, scrap: 0 };
      totals.good += toNumber(entry.good_qty);
      totals.scrap += toNumber(entry.scrap_qty);
      perDay.set(entry.production_date, totals);
    });
    const rows = [];
    for (const date of selectedDates) {
      const totals = perDay.get(date);
      const hasProduction = Boolean(totals && totals.good + totals.scrap > 0);
      const rate = hasProduction
        ? Number(((totals.scrap / (totals.good + totals.scrap)) * 100).toFixed(2))
        : 0;
      rows.push({ date, rate, targetRate, hasProduction });
    }
    return rows;
  }, [monthEntries, activeDept, selectedDates]);
  const hasSelectedDepartmentProduction = departmentTargetTrend.some((row) => row.hasProduction);
  const targetRate = scrapTargetsByDepartment[activeDept] ?? 0;
  const rateStrokeStops = useMemo(() => scrapRateGradientStops(departmentTargetTrend.map((row) => row.rate), targetRate), [departmentTargetTrend, targetRate]);
  const rateStroke = rateStrokeStops.length
    ? 'url(#scrap-rate-stroke)'
    : scrapRateColors[scrapRateStatus(departmentTargetTrend[0]?.rate ?? 0, targetRate)];

  function openCustomerComplaintForm(date = complaintChartDate) {
    if (!date) return;
    try { assertMonthWritable(date); } catch (error) { setComplaintError(error.message); return; }
    setComplaintModalDate(date);
    setComplaintDraft('');
    setComplaintError('');
  }

  async function saveCustomerComplaint(event) {
    event.preventDefault();
    try { assertMonthWritable(complaintModalDate); } catch (error) { setComplaintError(error.message); return; }
    if (!supabase) {
      setComplaintError('Enregistrement en ligne indisponible : configurez Supabase pour enregistrer les réclamations.');
      return;
    }
    if (!complaintDraft.trim()) {
      setComplaintError('Saisissez le détail de la réclamation.');
      return;
    }
    setComplaintSaving(true);
    setComplaintError('');
    const { data, error } = await supabase.from('customer_complaints').insert({ complaint_date: complaintModalDate, details: complaintDraft.trim() }).select().single();
    setComplaintSaving(false);
    if (error) {
      const missingTable = ['PGRST205', '42P01'].includes(error.code);
      setComplaintError(missingTable
        ? 'Table customer_complaints absente : exécutez supabase-customer-complaints.sql dans le SQL Editor Supabase, puis rechargez.'
        : `Échec Supabase : ${error.message}`);
      return;
    }
    setCustomerComplaints((current) => [...current, { id: data.id, date: data.complaint_date, details: data.details }].sort((a, b) => a.date.localeCompare(b.date)));
    setComplaintModalDate('');
    setComplaintDraft('');
  }

  function openSortingHoursForm(date = sortingChartDate) {
    if (!date) return;
    if (!extraDataReady.sorting) { setSortingError(t('Attendez la fin du chargement ou actualisez les données.')); return; }
    try { assertMonthWritable(date); } catch (error) { setSortingError(error.message); return; }
    const existing = sortingHours.find((item) => item.date === date && item.department === activeDept);
    setSortingModalDate(date);
    setSortingDepartment(activeDept);
    setSortingHoursValue(existing ? String(existing.hours) : '');
    setSortingHeadcountValue(existing?.headcount != null ? String(existing.headcount) : '');
    setSortingGoodQtyValue(existing ? String(existing.goodQty) : '');
    setSortingScrapQtyValue(existing ? String(existing.scrapQty) : '');
    setSortingError('');
  }

  async function saveSortingHours(event) {
    event.preventDefault();
    try { assertMonthWritable(sortingModalDate); } catch (error) { setSortingError(error.message); return; }
    if (!supabase) {
      setSortingError('Configurez Supabase pour enregistrer les heures de tri en ligne.');
      return;
    }
    const headcount = Number(sortingHeadcountValue);
    if (sortingHeadcountValue.trim() === '' || !Number.isInteger(headcount) || headcount < 0 || headcount > 2147483647) {
      setSortingError(t('Saisissez un effectif entier positif ou nul.'));
      return;
    }
    setSortingSaving(true);
    setSortingError('');
    const { data, error } = await supabase.from('sorting_hours').upsert({
      sorting_date: sortingModalDate,
      department: sortingDepartment,
      hours: Number(String(sortingHoursValue).replace(',', '.')),
      headcount,
      good_qty: Number(sortingGoodQtyValue),
      scrap_qty: Number(sortingScrapQtyValue),
    }, { onConflict: 'sorting_date,department' }).select().single();
    setSortingSaving(false);
    if (error) {
      if (['42703', 'PGRST204'].includes(error.code) && String(error.message).includes('headcount')) {
        setSortingError(t('Le champ effectif est absent de la base. Exécutez supabase-sorting-headcount.sql dans Supabase, puis réessayez.'));
        return;
      }
      setSortingError(`Enregistrement impossible. Vérifiez la migration supabase-sorting-hours.sql dans le SQL Editor Supabase. Détail : ${error.message}`);
      return;
    }
    setSortingHours((current) => [
      ...current.filter((item) => !(item.date === data.sorting_date && item.department === data.department)),
      {
        id: data.id,
        date: data.sorting_date,
        department: data.department,
        hours: toNumber(data.hours),
        headcount: data.headcount ?? null,
        goodQty: toNumber(data.good_qty),
        scrapQty: toNumber(data.scrap_qty),
      },
    ]);
    setSortingModalDate('');
  }

  async function deleteCustomerComplaint(complaint) {
    try { assertMonthWritable(complaint.date); } catch (error) { setComplaintError(error.message); setComplaintDeleteCandidate(null); return; }
    const { error } = await supabase.from('customer_complaints').delete().eq('id', complaint.id);
    if (error) {
      setComplaintError('Suppression impossible. Vérifiez la règle de suppression Supabase.');
      setComplaintDeleteCandidate(null);
      return;
    }
    setCustomerComplaints((current) => current.filter((item) => item.id !== complaint.id));
    setComplaintDeleteCandidate(null);
  }

  const factoryEvaluationData = useMemo(() => {
    const now = new Date(`${selectedMonth === currentMonth ? today : selectedBounds.to}T12:00:00`);
    const scoreBucket = (bucket) => {
      const rows = clientEntries.filter((entry) => entry.department === activeDept && entry.production_date >= bucket.from && entry.production_date <= bucket.to);
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
  }, [clientEntries, activeDept, locale, selectedMonth, currentMonth, today, selectedBounds.to]);

  const defectPareto = useMemo(() => {
    const departmentRows = monthEntries.filter((row) => row.department === activeDept);
    const defectsByDate = new Map();
    const rejectedQuantity = (row) => {
      const recordedScrap = Math.max(0, toNumber(row.scrap_qty));
      const defectTotal = scrapDefectEntries(row).reduce((sum, [, quantity]) => sum + Math.max(0, quantity), 0);
      return recordedScrap || defectTotal;
    };

    if (defectParetoMode === 'j1') {
      const selectedDate = defectParetoDate;
      const rows = departmentRows.filter((row) => row.production_date === selectedDate);
      const details = new Map();
      rows.forEach((row) => scrapDefectEntries(row).forEach(([name, quantity]) => {
        if (quantity <= 0) return;
        const type = name || 'Autres';
        details.set(type, (details.get(type) || 0) + quantity);
      }));
      const data = [...details].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
      const total = data.reduce((sum, item) => sum + item.count, 0);
      return {
        date: selectedDate,
        total,
        hasEntries: rows.length > 0,
        data,
      };
    }

    departmentRows.forEach((row) => {
      defectsByDate.set(row.production_date, (defectsByDate.get(row.production_date) || 0) + rejectedQuantity(row));
    });
    const data = selectedDates.map((date) => ({ date, total: defectsByDate.get(date) || 0 }));
    return { data };
  }, [monthEntries, activeDept, defectParetoMode, defectParetoDate, selectedDates]);

  const machinesForDept = machines.filter((machine) => machine.department === form.department || !machine.department);
  const defectEvolution = useMemo(() => selectedDefect
    ? buildDefectEvolution(monthEntries, selectedDefect, scrapDefectEntries) : [], [monthEntries, selectedDefect]);

  function openDefectEvolution(type, trigger) {
    const index = defectPareto.data.findIndex((item) => item.type === type);
    if (index < 0) return;
    setSelectedDefect({ type, department: activeDept, month: selectedMonth, date: defectPareto.date, color: defectColors[index % defectColors.length], trigger });
  }
  const referencesForDept = references.filter((ref) => ref.family === form.department || !ref.family);
  const articleReferences = useMemo(() => {
    return [...new Set(monthEntries.map((row) => row.product_reference).filter(Boolean))].sort();
  }, [monthEntries]);
  const defectTypes = defectTypesByDepartment[form.department] || ['Autres'];
  const incompleteEntries = useMemo(() => monthEntries.filter((row) => {
    return row.entry_status && row.entry_status !== 'Complete' || completionStatus(row).status !== 'Complete';
  }).sort((a, b) => String(b.production_date || '').localeCompare(String(a.production_date || ''))
    || String(b.created_at || '').localeCompare(String(a.created_at || ''))), [monthEntries]);
  const visibleIncompleteEntries = showAllIncomplete ? incompleteEntries : incompleteEntries.slice(0, 3);

  const qualityQueue = useMemo(() => incompleteEntries.filter((row) => validateProduction(row).length === 0), [incompleteEntries]);

  const assignmentRows = useMemo(() => {
    const map = new Map();
    monthEntries.forEach((row) => {
      if (!row.machine_code || !row.operator_names) return;
      const previous = map.get(row.machine_code);
      map.set(row.machine_code, {
        machine_code: row.machine_code,
        operator_names: row.operator_names,
        mod_count: previous ? Math.max(toNumber(previous.mod_count), toNumber(row.mod_count)) : toNumber(row.mod_count),
        mod_hours: (previous?.mod_hours || 0) + toNumber(row.mod_hours)
      });
    });
    return [...(filters.client ? [] : rowsForMonth(assignments, selectedMonth, 'shift_date')), ...map.values()];
  }, [monthEntries, assignments, selectedMonth, filters.client]);

  function selectDepartment(department) {
    setActiveDept(department);
    setForm({
      ...form,
      department,
      machine_code: '',
      defect_type: defaultDefect(department)
    });
  }

  function assertMonthWritable(date, originalDate = date) {
    if (monthLocked || isMonthClosed(closures, originalDate) || isMonthClosed(closures, date)) {
      throw new Error(t(selectedClosure || isMonthClosed(closures, originalDate) || isMonthClosed(closures, date)
        ? 'Mois clôturé : les données sont en lecture seule.'
        : 'Attendez la fin du chargement ou actualisez les données.'));
    }
    if (!String(date).startsWith(`${selectedMonth}-`)) {
      throw new Error(t('La date doit appartenir au mois affiché.'));
    }
  }

  function emptyForm(overrides = {}) {
    return {
      id: '',
      production_date: defaultEntryDate,
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
      client_name: '',
      entry_status: 'Qualite a completer',
      missing_fields: [],
      ...overrides,
    };
  }

  function editProduction(row, targetService) {
    try { assertMonthWritable(row.production_date); } catch (error) { setStatus({ key: error.message, error: true }); return; }
    setActiveDept(row.department);
    setServiceMode(targetService || (validateProduction(row).length ? 'production' : 'quality'));
    setForm(emptyForm({
      ...row,
      work_hours: row.work_hours ?? row.machine_hours ?? 0,
      defect_breakdown: defectBreakdownForRow(row),
      article_reference: extractArticleReference(row.note),
      client_name: row.client_name || extractClientName(row.note),
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
      assertMonthWritable(form.production_date, entries.find((row) => row.id === form.id)?.production_date);
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
        note: entries.find((item) => item.id === row.id)?.note || buildQualityNote('', '', row.client_name),
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
      assertMonthWritable(form.production_date, entries.find((row) => row.id === form.id)?.production_date);
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
        buildQualityNote(row.article_reference, row.note, row.client_name),
        row.defect_breakdown.length ? `REPARTITION_DEFAUTS: ${JSON.stringify(row.defect_breakdown)}` : '',
        !form.id || isQualityOnlyEntry(entries.find((item) => item.id === form.id) || {}) ? qualityOnlyMarker : '',
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
      assertMonthWritable(form.production_date, entries.find((row) => row.id === form.id)?.production_date);
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
        note: buildQualityNote(row.article_reference, row.note, row.client_name),
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
      assertMonthWritable(row.production_date);
      await deleteRow('production_entries', row);
      setEntries((current) => current.filter((item) => item !== row && item.id !== row.id));
      setDeleteCandidate(null);
      setStatus({ key: 'Saisie supprimee: {department} / {machine}', department: row.department, machine: row.machine_code });
    } catch (error) {
      setStatus({ key: 'Erreur suppression: {error}', values: { error: error.message }, error: true });
    }
  }

  function currentMonthSnapshot() {
    return buildMonthSnapshot(selectedMonth, {
      production: entries,
      sorting: sortingHours.map(({ date, goodQty, scrapQty, ...row }) => ({ ...row, sorting_date: date, good_qty: goodQty, scrap_qty: scrapQty })),
      complaints: customerComplaints.map(({ date, ...row }) => ({ ...row, complaint_date: date })),
      assignments,
    });
  }

  function downloadMonthArchive(snapshot, closedAt = null) {
    XLSX.writeFile(buildMonthlyWorkbook(snapshot, { month: selectedMonth, closedAt, t }), `bilan_${selectedMonth}.xlsx`);
  }

  async function exportExcel() {
    setMonthExportError('');
    try {
      if (selectedClosure) {
        let archive;
        if (supabase) {
          const { data, error } = await supabase.from('monthly_closures').select('snapshot,closed_at').eq('month', selectedClosure.month).single();
          if (error) throw error;
          archive = data;
        } else {
          archive = localRead('monthly_closures', []).find((row) => row.month === selectedClosure.month);
        }
        if (!archive?.snapshot) throw new Error(t('Archive indisponible. Actualisez les données.'));
        downloadMonthArchive(archive.snapshot, archive.closed_at);
      } else {
        if (!archiveReady) throw new Error(t('Attendez la fin du chargement ou actualisez les données.'));
        downloadMonthArchive(currentMonthSnapshot());
      }
    } catch (error) {
      setMonthExportError(error.message);
    }
  }

  async function closeSelectedMonth() {
    setMonthExportError('');
    if (selectedMonth >= currentMonth || !archiveReady || closureState !== 'ready' || selectedClosure || closingMonth) return;
    setClosingMonth(true);
    let closed = false;
    try {
      let archive;
      if (supabase) {
        const { data, error } = await supabase.rpc('close_production_month', { p_month: selectedBounds.from });
        if (error) throw error;
        archive = Array.isArray(data) ? data[0] : data;
      } else {
        const existing = localRead('monthly_closures', []);
        archive = existing.find((row) => row.month === selectedBounds.from)
          || { month: selectedBounds.from, closed_at: new Date().toISOString(), snapshot: currentMonthSnapshot() };
        localWrite('monthly_closures', [...existing.filter((row) => row.month !== archive.month), archive]);
      }
      if (!archive?.snapshot) throw new Error(t('Archive indisponible. Actualisez les données.'));
      closed = true;
      setClosures((rows) => [...rows.filter((row) => row.month !== archive.month), { month: archive.month, closed_at: archive.closed_at }]);
      setShowCloseMonth(false);
      setReloadCount((count) => count + 1);
      downloadMonthArchive(archive.snapshot, archive.closed_at);
    } catch (error) {
      setMonthExportError(`${closed ? `${t('Mois clôturé. Vous pouvez réessayer l’export Excel.')} ` : ''}${error.message}`);
    } finally {
      setClosingMonth(false);
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

  function resetFilters() {
    setFilters({ ...selectedBounds, machine: 'Tous', reference: 'Tous', workOrder: 'Tous', client: '' });
  }

  return (
    <>
    <main className="shell" hidden={showLotPage}>
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

      <section className="month-toolbar" aria-label={t('Gestion mensuelle')}>
        <div className="month-choice">
          <label>{t('Mois affiché')}<input type="month" max={currentMonth} value={selectedMonth} disabled={closingMonth} onChange={(event) => {
            const month = event.target.value;
            if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month <= currentMonth) setMonthOverride(month === currentMonth ? null : month);
          }} /></label>
          <button type="button" disabled={closingMonth} onClick={() => setMonthOverride(null)}>{t('Mois actuel')}</button>
          <span className={selectedClosure ? 'month-state month-closed' : 'month-state'}>{t(selectedClosure ? 'Mois clôturé · lecture seule' : 'Mois ouvert')}</span>
        </div>
        <div className="month-actions">
          <a className="lot-button" href="#lot">{t('LOT')}</a>
          <button type="button" disabled={dataLoading || closingMonth} onClick={() => setReloadCount((count) => count + 1)}><RefreshCcw size={16} />{t('Actualiser')}</button>
          <button className="export-button" type="button" disabled={closingMonth || (!selectedClosure && !archiveReady)} onClick={() => exportExcel()}><FileDown size={16} />{t('Exporter le mois')}</button>
          <button className="primary" type="button" disabled={closingMonth || Boolean(selectedClosure) || selectedMonth >= currentMonth || !archiveReady || closureState !== 'ready'} onClick={() => { setMonthExportError(''); setShowCloseMonth(true); }}>{t('Clôturer le mois')}</button>
        </div>
        <p className="month-help">{t('Le mois courant s’ouvre automatiquement. Les mois précédents restent conservés.')}</p>
        {selectedClosure && <p className="month-help">{t('Clôturé le')}: {new Date(selectedClosure.closed_at).toLocaleString(locale)}</p>}
        {!supabase && <p className="month-help">{t('Mode local : les données et clôtures sont conservées dans ce navigateur. Exportez le bilan pour en garder une copie.')}</p>}
        {closureState === 'missing' && <p className="month-warning">{t('Clôture à activer : exécutez supabase-monthly-archives.sql dans Supabase.')}</p>}
        {closureState === 'error' && <p className="complaint-error" role="alert">{t('Impossible de vérifier les clôtures. Actualisez avant de modifier les données.')} {closureError}</p>}
        {dataLoading && <p className="month-help" role="status">{t('Chargement des données…')}</p>}
        {dataError && <p className="complaint-error" role="alert">{t('Chargement impossible. Aucune donnée de démonstration ne remplace vos données.')} {dataError}</p>}
        {monthExportError && <p className="complaint-error" role="alert">{monthExportError}</p>}
      </section>

      <section className="filters">
        <label>{t("Date debut")}<input type="date" min={selectedBounds.from} max={filters.to || selectedBounds.to} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
        <label>{t("Date fin")}<input type="date" min={filters.from || selectedBounds.from} max={selectedBounds.to} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        <label>{t("Machine / Poste")}<select value={filters.machine} onChange={(e) => setFilters({ ...filters, machine: e.target.value })}><option value="Tous">{t("Tous")}</option>{machines.map((machine) => <option key={machine.id || machine.code} value={machine.code}>{machine.code}</option>)}</select></label>
        <label>{t("Reference machine")}<select value={filters.reference} onChange={(e) => setFilters({ ...filters, reference: e.target.value })}><option value="Tous">{t("Tous")}</option>{articleReferences.map((ref) => <option key={ref} value={ref}>{ref}</option>)}</select></label>
        <label>{t("OF / Bon")}<select value={filters.workOrder} onChange={(e) => setFilters({ ...filters, workOrder: e.target.value })}><option value="Tous">{t("Tous")}</option>{[...new Set(monthEntries.map((row) => row.work_order).filter(Boolean))].map((of) => <option key={of} value={of}>{of}</option>)}</select></label>
        <label>{t('Client')}<select id="filter-client" value={filters.client} onChange={(e) => setFilters({ ...filters, client: e.target.value, machine: 'Tous', reference: 'Tous', workOrder: 'Tous' })}>
          <option value="">{t('Tous')}</option>{clientOptions.map((client) => <option key={client} value={client}>{client}</option>)}
        </select></label>
        <button type="button" onClick={resetFilters}><RefreshCcw size={18} />{t('Réinitialiser les filtres')}</button>
        {filters.client && <p className="filter-scope" role="status">{t('Client : {client} — production et qualité, tous départements.', { client: filters.client })} {t('L’export et la clôture couvrent le mois complet, tous clients confondus.')}</p>}
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
        {selectedClosure && <p className="month-help">{t('Mois clôturé : les données sont en lecture seule.')}</p>}
        <fieldset className="month-entry-fields" disabled={monthLocked}>
        {serviceMode === 'production' ? (
          <form className="sheet-form production-sheet" onSubmit={saveProductionService}>
            <label>{t("Date")}<input type="date" min={selectedBounds.from} max={selectedBounds.to} required value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} /></label>
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
            <div className="quality-fields quality-identification">
            <label>{t("Date")}<input type="date" min={selectedBounds.from} max={selectedBounds.to} required value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} /></label>
            <label>{t("Departement")}<select value={form.department} onChange={(e) => { const nextDefect = defaultDefect(e.target.value); setForm({ ...form, department: e.target.value, defect_type: nextDefect, defect_breakdown: [] }); }}>{departments.map((dept) => <option key={dept.key} value={dept.key}>{t(dept.key)}</option>)}</select></label>
            <label>{t("Machine / Poste")}<input placeholder={t("Machine / Poste")} value={form.machine_code || ''} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} /></label>
            <label>{t("Reference machine")}<input placeholder={t("Reference machine")} value={form.product_reference || ''} onChange={(e) => setForm({ ...form, product_reference: e.target.value })} /></label>
            <label>{t("OF / Bon")}<input placeholder={t("OF / Bon")} value={form.work_order || ''} onChange={(e) => setForm({ ...form, work_order: e.target.value })} /></label>
            <label>{t("Reference article")}<input placeholder={t("Reference article")} value={form.article_reference} onChange={(e) => setForm({ ...form, article_reference: e.target.value })} /></label>
            <label>{t('Client')}<input id="quality-client" placeholder={t('Nom du client')} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></label>
            </div>
            <div className="quality-fields quality-measurements">
            <label>{t("Qte bonne")}<input type="number" min="0" value={form.good_qty} onChange={(e) => setForm({ ...form, good_qty: e.target.value })} /></label>
            <label>{t("Qte rebut")}<input type="number" min="0" value={form.scrap_qty} onChange={(e) => setForm({ ...form, scrap_qty: e.target.value })} /></label>
            <label>{t("Rebut justifie")}<input type="number" min="0" value={form.justified_scrap_qty} onChange={(e) => setForm({ ...form, justified_scrap_qty: e.target.value })} /></label>
            <label>{t("Purge kg")}<input type="number" min="0" step="0.1" value={form.purge_kg} onChange={(e) => setForm({ ...form, purge_kg: e.target.value })} /></label>
            <label className="quality-note">{t("Note qualite")}<input placeholder={t("Observation controle")} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            </div>
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
            <div className="sheet-actions">
              <button className="primary" type="submit"><CheckCircle2 size={18} />{t("Valider controle qualite")}</button>
            </div>
          </form>
        )}
        </fieldset>
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
          <thead><tr><th>{t("Etat")}</th><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("Reference article")}</th><th>{t("OF / Bon")}</th><th>{t("Pareto defaut")}</th><th>{t("Champs manquants")}</th><th>{t("Action")}</th></tr></thead>
          <tbody>
            {visibleIncompleteEntries.map((row, index) => {
              const missing = Array.isArray(row.missing_fields) ? row.missing_fields : completionStatus(row).missingFields;
              return (
                <tr key={row.id || index}>
                  <td><span className="state-pill">{t(row.entry_status || 'A completer')}</span></td>
                  <td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code || '-'}</td><td>{row.product_reference || '-'}</td><td>{row.article_reference || extractArticleReference(row.note) || '-'}</td><td>{row.work_order || '-'}</td><td><DefectBreakdown row={row} t={t} locale={locale} /></td><td>{missing.map((field) => t(field)).join(locale === 'ar' ? '، ' : ', ')}</td>
                  <td>
                    <div className="row-actions">
                      <button className="compact-action" type="button" disabled={monthLocked} onClick={() => editProduction(row, 'production')}><Edit3 size={16} />{t("Prod")}</button>
                      <button className="compact-action" type="button" disabled={monthLocked} onClick={() => editProduction(row, 'quality')}><CheckCircle2 size={16} />{t("Qualite")}</button>
                      <button className="compact-action danger-button" type="button" disabled={monthLocked} onClick={() => setDeleteCandidate(row)}><Trash2 size={16} />{t("Supprimer")}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!incompleteEntries.length && <tr><td colSpan="10" className="empty-row">{t("Aucune saisie incomplete.")}</td></tr>}
          </tbody>
        </table>
        {incompleteEntries.length > 3 && <div className="incomplete-actions"><button type="button" onClick={() => setShowAllIncomplete((current) => !current)}>{showAllIncomplete ? t("Afficher les 3 dernieres") : t("Afficher tout")}</button></div>}
      </Panel>

      <section className="grid charts">
        <Panel title={`Taux de rebut et target — ${t(activeDept)} — ${monthLabel}`} className="span12 target-chart-panel">
          <p className="chart-instruction">Target du département : {scrapTargetsByDepartment[activeDept] ?? 0} %.</p>
          <div className="chart-filter-row">
            <label>{t("Departement")}
              <select value={activeDept} onChange={(event) => selectDepartment(event.target.value)}>
                {departments.map((department) => <option key={department.key} value={department.key}>{t(department.key)}</option>)}
              </select>
            </label>
          </div>
          {!hasSelectedDepartmentProduction && <p className="department-data-notice">Aucune quantité de production ou de rebut saisie pour {t(activeDept)} sur la période affichée. Le taux réel apparaît à 0 %. Choisissez le département correspondant aux lignes saisies.</p>}
          <ResponsiveContainer height={280}>
            <ComposedChart data={departmentTargetTrend} margin={{ top: 28, right: 32, bottom: 8, left: 12 }}>
              <defs>
                <linearGradient id="scrap-rate-stroke" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                  {rateStrokeStops.map((stop, index) => <stop key={index} offset={`${stop.offset}%`} stopColor={stop.color} />)}
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: 'short' })} />
              <YAxis yAxisId="rate" domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                labelFormatter={(value) => formatDate(value)}
                formatter={(value, name) => [`${value}%`, name]}
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{formatDate(label)}</strong>
                    {payload.map((item) => <div key={item.dataKey} style={{ color: item.dataKey === 'rate' ? scrapRateColors[scrapRateStatus(item.value, targetRate)] : item.color }}>{item.name}: {item.value}%</div>)}
                    {!payload[0]?.payload?.hasProduction && <small>Production non saisie : taux réel affiché à 0 %.</small>}
                  </div>
                ) : null}
              />
              <Legend content={() => <DefaultLegendContent payload={[
                { value: 'Target du département', type: 'plainline', color: '#f59e0b' },
                { value: 'Taux de rebut réel', type: 'plainline', color: '#526a86' },
              ]} />} />
              <Line yAxisId="rate" type="linear" dataKey="rate" name="Taux de rebut réel" stroke={rateStroke} strokeWidth={3} connectNulls={false} dot={<RateDot r={3} />} activeDot={<RateDot r={6} />} isAnimationActive={false}>
                <LabelList dataKey="rate" position="top" offset={10} fill="#062b60" fontSize={10} fontWeight={700} stroke="#fff" strokeWidth={3} paintOrder="stroke" formatter={(value) => `${Number(value).toLocaleString(locale, { maximumFractionDigits: 2 })} %`} />
              </Line>
              <Line yAxisId="rate" type="linear" dataKey="targetRate" name="Target du département" stroke="#f59e0b" strokeWidth={3} strokeDasharray="7 5" dot={false} activeDot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={`Réclamations clients — ${monthLabel}`} className="span12 complaint-chart-panel">
          {filters.client && <p className="chart-instruction">{t('Données globales : ces saisies ne sont pas rattachées à un client.')}</p>}
          <p className="chart-instruction">Du 1er au dernier jour du mois. Chaque point : 1 le jour de la réclamation, 0 sinon. Double-cliquez sur une date pour ajouter une réclamation.</p>
          <ResponsiveContainer height={260}>
            <ComposedChart data={customerComplaintData} onMouseMove={(state) => state?.activeLabel && setComplaintChartDate(state.activeLabel)} onDoubleClick={(state) => openCustomerComplaintForm(state?.activeLabel || complaintChartDate)}>
              <CartesianGrid stroke="#dbe5f2" vertical={false} />
              <XAxis dataKey="date" interval={0} minTickGap={0} tick={{ fontSize: 11 }} tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: '2-digit' })} />
              <YAxis allowDecimals={false} domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip labelFormatter={(value) => formatDate(value)} formatter={(value) => [value, 'Réclamation client']} />
              <Line type="linear" dataKey="complaints" name="Réclamation client" stroke="#e23d3d" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
            </ComposedChart>
          </ResponsiveContainer>
          {complaintError && <p className="complaint-error" role="alert">{complaintError}</p>}
          {!supabase && <p className="complaint-error">Supabase n’est pas configuré. Aucune réclamation ne sera enregistrée localement.</p>}
          <div className="complaints-table-wrap">
            <table className="complaints-table">
              <thead><tr><th>Date</th><th>Réclamation client</th><th>Action</th></tr></thead>
              <tbody>
                {monthComplaints.map((complaint) => <tr key={complaint.id}>
                  <td>{formatDate(complaint.date)}</td><td>{complaint.details}</td>
                  <td><button className="icon-only danger-icon" type="button" disabled={monthLocked} aria-label={`Supprimer la réclamation du ${formatDate(complaint.date)}`} onClick={() => setComplaintDeleteCandidate(complaint)}><Trash2 size={16} /></button></td>
                </tr>)}
                {!monthComplaints.length && <tr><td colSpan="3" className="empty-row">Aucune réclamation enregistrée.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={`Rebuts par jour — ${t(activeDept)} — ${monthLabel}`} className="span12 defect-evolution-panel">
          <div className="defect-pareto-controls">
            <label>{t("Departement")}
              <select value={activeDept} onChange={(event) => selectDepartment(event.target.value)}>
                {departments.map((department) => <option key={department.key} value={department.key}>{t(department.key)}</option>)}
              </select>
            </label>
            <label>Date à analyser
              <input type="date" value={defectParetoDate} max={monthBounds(currentMonth).to} disabled={closingMonth} onChange={(event) => {
                const date = event.target.value;
                const month = date.slice(0, 7);
                if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date) || month > currentMonth) return;
                setMonthOverride(month === currentMonth ? null : month);
                setDefectParetoDate(date);
                setDefectParetoMode('j1');
              }} />
            </label>
            <div className="defect-mode-toggle" role="group" aria-label="Période du Pareto">
              <button type="button" className={defectParetoMode === 'j1' ? 'active' : ''} onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const date = localDateKey(yesterday);
                setDefectParetoDate(date.startsWith(`${selectedMonth}-`) ? date : defaultEntryDate);
                setDefectParetoMode('j1');
              }}>J-1</button>
              <button type="button" className={defectParetoMode === 'cumulative' ? 'active' : ''} onClick={() => setDefectParetoMode('cumulative')}>Cumul</button>
            </div>
          </div>
          {defectParetoMode === 'j1' ? <>
            <p className="chart-instruction">Total des rebuts le {formatDate(defectPareto.date)} : {defectPareto.total.toLocaleString(locale)} — détail par type de défaut.</p>
            {!!defectPareto.data.length && <p className="defect-drilldown-hint">{t('Cliquez sur un défaut pour voir son évolution sur le mois.')}</p>}
            {!defectPareto.hasEntries && <p className="empty-history">Aucune saisie pour ce département à cette date.</p>}
            <ResponsiveContainer height={260}>
              <BarChart data={defectPareto.data} margin={{ top: 12, right: 18, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#dbe5f2" vertical={false} />
                <XAxis dataKey="type" interval={0} angle={-15} textAnchor="end" height={56} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} rebuts`, 'Défaut']} />
                <Bar dataKey="count" name="Rebuts par défaut" radius={[5, 5, 0, 0]} activeBar={false}
                  shape={(props) => <DefectBar {...props} onSelect={openDefectEvolution} label={t('Évolution du défaut : {defect}', { defect: t(props.payload.type) })} />}>
                  {defectPareto.data.map((item, index) => <Cell key={item.type} fill={defectColors[index % defectColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {!!defectPareto.data.length && <div className="defect-type-legend">
              {defectPareto.data.map((item, index) => <button type="button" key={item.type} onClick={(event) => openDefectEvolution(item.type, event.currentTarget)}
                aria-label={t('Évolution du défaut : {defect}', { defect: t(item.type) })}><i style={{ backgroundColor: defectColors[index % defectColors.length] }} />{t(item.type)}</button>)}
            </div>}
          </> : <>
            <p className="chart-instruction">Total réel des rebuts par jour pour {t(activeDept)}. Chaque barre correspond à une date.</p>
            <ResponsiveContainer height={320}>
              <BarChart data={defectPareto.data} margin={{ top: 12, right: 18, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#dbe5f2" vertical={false} />
                <XAxis dataKey="date" interval="preserveStartEnd" tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: 'short' })} />
                <YAxis allowDecimals={false} tickFormatter={(value) => Number(value).toLocaleString(locale)} />
                <Tooltip labelFormatter={(value) => formatDate(value)} formatter={(value) => [`${value} rebuts`, 'Total journalier']} />
                <Bar dataKey="total" name="Total des rebuts" fill="#f4b400" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>}
        </Panel>
        <Panel title={`Heures de tri par jour — ${monthLabel}`} className="span12 sorting-hours-panel">
          {filters.client && <p className="chart-instruction">{t('Données globales : ces saisies ne sont pas rattachées à un client.')}</p>}
          <p className="chart-instruction">Survolez une barre pour voir les heures, l’effectif, les quantités bonnes et les rebuts de chaque département. Double-cliquez sur une date pour modifier la saisie.</p>
          {sortingError && <p className="complaint-error" role="alert">{sortingError}</p>}
          {!supabase && <p className="complaint-error">Supabase n’est pas configuré. Les heures de tri ne seront pas enregistrées localement.</p>}
          <ResponsiveContainer height={320}>
            <BarChart data={sortingHoursData} margin={{ top: 12, right: 18, bottom: 8, left: 8 }} onMouseMove={(state) => state?.activeLabel && setSortingChartDate(state.activeLabel)} onDoubleClick={(state) => openSortingHoursForm(state?.activeLabel || sortingChartDate)}>
              <CartesianGrid stroke="#dbe5f2" vertical={false} />
              <XAxis dataKey="date" interval="preserveStartEnd" tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: '2-digit' })} />
              <YAxis allowDecimals tickFormatter={(value) => `${value} h`} />
              <Tooltip content={({ active, payload, label }) => {
                const row = payload?.[0]?.payload;
                if (!active || !row) return null;
                const visibleDepartments = departments.filter(({ key }) => toNumber(row[key]) || row[`${key}Headcount`] != null || toNumber(row[`${key}GoodQty`]) || toNumber(row[`${key}ScrapQty`]));
                return <div className="recharts-default-tooltip" style={{ direction: 'ltr', padding: '10px 12px', border: '1px solid #d3dfec', borderRadius: 6, background: '#fff', boxShadow: '0 4px 14px rgba(11, 54, 98, .12)' }}>
                  <p className="recharts-tooltip-label" style={{ margin: '0 0 8px', fontWeight: 700 }}>{formatDate(label)}</p>
                  {visibleDepartments.map(({ key }) => <div key={key} style={{ marginTop: 6 }}>
                    <strong>{t(key)}</strong>
                    <div>{t('Heures de tri')}: {toNumber(row[key]).toLocaleString(locale)} h</div>
                    <div>{t('Effectif')}: {row[`${key}Headcount`] == null ? t('Non renseigne') : row[`${key}Headcount`].toLocaleString(locale)}</div>
                    <div>{t('Qte bonne après tri')}: {toNumber(row[`${key}GoodQty`]).toLocaleString(locale)}</div>
                    <div>{t('Qte rebut après tri')}: {toNumber(row[`${key}ScrapQty`]).toLocaleString(locale)}</div>
                  </div>)}
                </div>;
              }} />
              <Legend formatter={(value) => t(value)} />
              {departments.map(({ key }, index) => <Bar key={key} dataKey={key} name={key} fill={['#287fff', '#ff8124', '#20a77a', '#a855f7', '#e23d3d'][index % 5]} radius={[3, 3, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
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

      <Panel title={t("Detail de la production")} className="production-detail-panel">
        <table>
          <thead><tr><th>{t("Etat")}</th><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("Reference article")}</th><th>{t("OF / Bon")}</th><th>{t("Qte bonne")}</th><th>{t("Qte rebut")}</th><th>{t("Rebut justifie")}</th><th>{t("Purge kg")}</th><th>{t("Pareto defaut")}</th><th>{t("Heure travail")}</th><th>{t("MOD")}</th><th>{t("Nom MOD")}</th><th>{t("Total H MOD")}</th><th></th></tr></thead>
          <tbody>
            {visibleProductionRows.map((row, index) => (
              <tr key={row.id || index}>
                <td><span className={row.entry_status === 'Complete' ? 'state-pill complete' : 'state-pill'}>{t(row.entry_status || 'Complete')}</span></td><td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code}</td><td>{row.product_reference}</td><td>{row.article_reference || extractArticleReference(row.note)}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString(locale)}</td><td>{toNumber(row.scrap_qty).toLocaleString(locale)}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString(locale)}</td><td>{row.purge_kg}</td><td><DefectBreakdown row={row} t={t} locale={locale} /></td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                <td><button aria-label={t("Completer")} className="icon-only" type="button" disabled={monthLocked} onClick={() => editProduction(row)}><Edit3 size={16} /></button><button aria-label={t("Supprimer")} className="icon-only danger-icon" type="button" disabled={monthLocked} onClick={() => setDeleteCandidate(row)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="17" className="empty-row">{t("Aucune donnee. Choisissez un departement puis ajoutez une ligne de production.")}</td></tr>}
          </tbody>
        </table>
        {filtered.length > 3 && <div className="incomplete-actions"><button type="button" onClick={() => setShowAllProduction((current) => !current)}>{showAllProduction ? t("Afficher les 3 dernieres") : t("Afficher tout")}</button></div>}
      </Panel>

      {selectedDefect && <DefectEvolutionDialog selection={selectedDefect} data={defectEvolution} monthLabel={monthLabel} locale={locale} t={t} onClose={() => setSelectedDefect(null)} />}

      {showHistoryWindow && (
        <div className="history-modal" role="dialog" aria-modal="true" aria-label={t("Fenetre historique des ajouts")}>
          <section className="history-window">
            <header className="history-window-head">
              <div>
                <h2>{t('Historique du mois')} — {monthLabel}</h2>
                <p>{t('{count} ligne(s) enregistree(s)', { count: monthEntries.length.toLocaleString(locale) })}</p>
              </div>
              <button className="icon-only" type="button" onClick={() => setShowHistoryWindow(false)} aria-label={t("Fermer historique")}><X size={18} /></button>
            </header>
            <div className="history-window-body">
              <table>
                <thead><tr><th>{t("Date")}</th><th>{t("Departement")}</th><th>{t("Machine / Poste")}</th><th>{t("Reference machine")}</th><th>{t("OF / Bon")}</th><th>{t("Qte bonne")}</th><th>{t("Qte rebut")}</th><th>{t("Rebut justifie")}</th><th>{t("Purge kg")}</th><th>{t("Pareto defaut")}</th><th>{t("Heure travail")}</th><th>{t("MOD")}</th><th>{t("Nom MOD")}</th><th>{t("Total H MOD")}</th><th>{t("Action")}</th></tr></thead>
                <tbody>
                  {monthEntries.map((row, index) => (
                    <tr key={row.id || index}>
                    <td>{formatDate(row.production_date)}</td><td>{t(row.department)}</td><td>{row.machine_code}</td><td>{row.product_reference}</td><td>{row.work_order}</td><td>{toNumber(row.good_qty).toLocaleString(locale)}</td><td>{toNumber(row.scrap_qty).toLocaleString(locale)}</td><td>{toNumber(row.justified_scrap_qty).toLocaleString(locale)}</td><td>{row.purge_kg}</td><td><DefectBreakdown row={row} t={t} locale={locale} /></td><td>{row.work_hours ?? row.machine_hours}</td><td>{row.mod_count}</td><td>{row.operator_names}</td><td>{row.mod_hours}</td>
                      <td><button className="danger-button compact-danger" type="button" disabled={monthLocked} onClick={() => setDeleteCandidate(row)}><Trash2 size={16} />{t("Supprimer")}</button></td>
                    </tr>
                  ))}
                  {!monthEntries.length && <tr><td colSpan="15" className="empty-row">{t("Aucun historique pour le moment.")}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {showCloseMonth && (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="close-month-title">
          <section className="confirm-window month-close-window">
            <header><CheckCircle2 size={22} /><h2 id="close-month-title">{t('Confirmer la clôture')} — {monthLabel}</h2></header>
            <p>{t('Une archive complète sera conservée et le bilan Excel sera téléchargé.')}</p>
            <dl className="month-summary">
              <div><dt>{t('Production')}</dt><dd>{allMonthEntries.length.toLocaleString(locale)}</dd></div>
              <div><dt>{t('Heures de tri')}</dt><dd>{monthSortingHours.length.toLocaleString(locale)}</dd></div>
              <div><dt>{t('Réclamations')}</dt><dd>{monthComplaints.length.toLocaleString(locale)}</dd></div>
            </dl>
            {!!monthIncompleteCount && <p className="month-warning">{t('{count} saisie(s) à compléter seront conservées dans l’archive.', { count: monthIncompleteCount })}</p>}
            <p>{t('Après validation, les ajouts, modifications et suppressions de ce mois seront bloqués pour tous les départements. La consultation et l’export resteront disponibles.')}</p>
            {monthExportError && <p className="complaint-error" role="alert">{monthExportError}</p>}
            <div className="confirm-actions">
              <button type="button" disabled={closingMonth} onClick={() => setShowCloseMonth(false)}>{t('Annuler')}</button>
              <button className="primary" type="button" disabled={closingMonth || !archiveReady || Boolean(selectedClosure) || selectedMonth >= currentMonth} onClick={closeSelectedMonth}>{t(closingMonth ? 'Clôture en cours…' : 'Exporter et clôturer')}</button>
            </div>
          </section>
        </div>
      )}

      {sortingModalDate && (
        <div className="complaint-modal" role="dialog" aria-modal="true" aria-labelledby="sorting-modal-title">
          <form className="complaint-window" onSubmit={saveSortingHours}>
            <header><h2 id="sorting-modal-title">Heures de tri</h2><button className="icon-only" type="button" onClick={() => setSortingModalDate('')} aria-label="Fermer"><X size={18} /></button></header>
            <label>Date<input type="date" min={selectedBounds.from} max={selectedBounds.to} value={sortingModalDate} onChange={(event) => {
              const date = event.target.value;
              setSortingModalDate(date);
              const existing = sortingHours.find((item) => item.date === date && item.department === sortingDepartment);
              setSortingHoursValue(existing ? String(existing.hours) : '');
              setSortingHeadcountValue(existing?.headcount != null ? String(existing.headcount) : '');
              setSortingGoodQtyValue(existing ? String(existing.goodQty) : '');
              setSortingScrapQtyValue(existing ? String(existing.scrapQty) : '');
            }} required /></label>
            <label>Département<select value={sortingDepartment} onChange={(event) => {
              const department = event.target.value;
              setSortingDepartment(department);
              const existing = sortingHours.find((item) => item.date === sortingModalDate && item.department === department);
              setSortingHoursValue(existing ? String(existing.hours) : '');
              setSortingHeadcountValue(existing?.headcount != null ? String(existing.headcount) : '');
              setSortingGoodQtyValue(existing ? String(existing.goodQty) : '');
              setSortingScrapQtyValue(existing ? String(existing.scrapQty) : '');
            }}>{departments.map((department) => <option key={department.key} value={department.key}>{t(department.key)}</option>)}</select></label>
            <label>Heures de tri<input type="number" min="0" step="0.1" value={sortingHoursValue} onChange={(event) => setSortingHoursValue(event.target.value)} placeholder="Ex. 2,5" required /></label>
            <label>{t('Effectif')}<input type="number" min="0" max="2147483647" step="1" value={sortingHeadcountValue} onChange={(event) => setSortingHeadcountValue(event.target.value)} placeholder="0" required /></label>
            <label>{t('Qte bonne après tri')}<input type="number" min="0" step="1" value={sortingGoodQtyValue} onChange={(event) => setSortingGoodQtyValue(event.target.value)} placeholder="0" required /></label>
            <label>{t('Qte rebut après tri')}<input type="number" min="0" step="1" value={sortingScrapQtyValue} onChange={(event) => setSortingScrapQtyValue(event.target.value)} placeholder="0" required /></label>
            {sortingError && <p className="complaint-error" role="alert">{sortingError}</p>}
            <div className="complaint-actions"><button type="button" onClick={() => setSortingModalDate('')}>Annuler</button><button className="primary" type="submit" disabled={monthLocked || sortingSaving || !supabase || sortingHoursValue === '' || sortingHeadcountValue === '' || sortingGoodQtyValue === '' || sortingScrapQtyValue === ''}>{sortingSaving ? 'Enregistrement…' : 'Enregistrer en ligne'}</button></div>
          </form>
        </div>
      )}

      {complaintModalDate && (
        <div className="complaint-modal" role="dialog" aria-modal="true" aria-labelledby="complaint-modal-title">
          <form className="complaint-window" onSubmit={saveCustomerComplaint}>
            <header><h2 id="complaint-modal-title">Nouvelle réclamation client</h2><button className="icon-only" type="button" onClick={() => setComplaintModalDate('')} aria-label="Fermer"><X size={18} /></button></header>
            <label>Date de réclamation<input type="date" min={selectedBounds.from} max={selectedBounds.to} value={complaintModalDate} onChange={(event) => setComplaintModalDate(event.target.value)} required /></label>
            <label>Détail<textarea value={complaintDraft} onChange={(event) => setComplaintDraft(event.target.value)} rows="4" placeholder="Décrivez la réclamation du client…" required autoFocus /></label>
            {complaintError && <p className="complaint-error" role="alert">{complaintError}</p>}
            <div className="complaint-actions"><button type="button" onClick={() => setComplaintModalDate('')}>Annuler</button><button className="primary" type="submit" disabled={monthLocked || complaintSaving || !supabase}>{complaintSaving ? 'Enregistrement…' : 'Enregistrer en ligne'}</button></div>
          </form>
        </div>
      )}

      {complaintDeleteCandidate && (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="complaint-delete-title">
          <section className="confirm-window">
            <header><Trash2 size={22} /><h2 id="complaint-delete-title">Supprimer cette réclamation ?</h2></header>
            <p>{formatDate(complaintDeleteCandidate.date)} — {complaintDeleteCandidate.details}</p>
            <div className="confirm-actions"><button type="button" onClick={() => setComplaintDeleteCandidate(null)}>Annuler</button><button className="danger-button" type="button" disabled={monthLocked} onClick={() => deleteCustomerComplaint(complaintDeleteCandidate)}>Supprimer</button></div>
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
              <button className="danger-button" type="button" disabled={monthLocked} onClick={() => confirmDeleteProduction(deleteCandidate)}>{t("OK supprimer")}</button>
            </div>
          </section>
        </div>
      )}
    </main>
    {showLotPage && <LotWorkspacePage />}
    </>
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
