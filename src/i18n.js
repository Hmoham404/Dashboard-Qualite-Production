export const languages = [
  { code: 'fr', locale: 'fr-FR', label: 'Français' },
  { code: 'en', locale: 'en-GB', label: 'English' },
  { code: 'ar', locale: 'ar', label: 'العربية' },
  { code: 'zh', locale: 'zh-CN', label: '中文' },
  { code: 'it', locale: 'it-IT', label: 'Italiano' },
];

export const languageStorageKey = 'quality-dashboard-language';

export function readLanguage(storage) {
  try {
    const saved = (storage ?? window.localStorage).getItem(languageStorageKey);
    return languages.some(({ code }) => code === saved) ? saved : 'fr';
  } catch {
    return 'fr';
  }
}

// French source keys keep stored department/defect identifiers independent of display language.
// Columns: French | English | Arabic | Simplified Chinese | Italian.
const rows = `
LOT|LOT|LOT|LOT|LOT
Client : {client} — production et qualité, tous départements.|Customer: {client} — production and quality, all departments.|العميل: {client} — الإنتاج والجودة في جميع الأقسام.|客户：{client} — 所有部门的生产和质量。|Cliente: {client} — produzione e qualità, tutti i reparti.
L’export et la clôture couvrent le mois complet, tous clients confondus.|Export and closing cover the full month for all customers.|يشمل التصدير والإقفال الشهر الكامل لجميع العملاء.|导出和结账涵盖所有客户的完整月份。|Esportazione e chiusura coprono il mese completo per tutti i clienti.
Données globales : ces saisies ne sont pas rattachées à un client.|Global data: these entries are not linked to a customer.|بيانات عامة: هذه التسجيلات غير مرتبطة بعميل.|全局数据：这些记录未关联客户。|Dati globali: queste registrazioni non sono associate a un cliente.
Client|Customer|العميل|客户|Cliente
Nom du client|Customer name|اسم العميل|客户名称|Nome del cliente
Fermer|Close|إغلاق|关闭|Chiudi
Évolution du défaut|Defect trend|تطور العيب|缺陷趋势|Andamento del difetto
Évolution du défaut : {defect}|Defect trend: {defect}|تطور العيب: {defect}|缺陷趋势：{defect}|Andamento del difetto: {defect}
Cliquez sur un défaut pour voir son évolution sur le mois.|Click a defect to view its trend over the month.|انقر على عيب لعرض تطوره خلال الشهر.|点击缺陷查看其月度变化。|Clicca su un difetto per vederne l’andamento nel mese.
Quantité de ce défaut par jour dans le département sélectionné, sur le mois affiché.|Daily quantity of this defect in the selected department for the displayed month.|الكمية اليومية لهذا العيب في القسم المحدد خلال الشهر المعروض.|所选部门在显示月份中该缺陷的每日数量。|Quantità giornaliera di questo difetto nel reparto selezionato per il mese visualizzato.
Total du mois|Monthly total|إجمالي الشهر|月度总计|Totale del mese
Maximum journalier|Daily peak|أعلى كمية يومية|单日峰值|Massimo giornaliero
Jours avec ce défaut|Days with this defect|أيام ظهور هذا العيب|出现此缺陷的天数|Giorni con questo difetto
Les jours sans saisie ou sans ce défaut sont affichés à zéro.|Days without entries or without this defect are shown as zero.|تُعرض الأيام دون تسجيل أو دون هذا العيب بقيمة صفر.|无记录或无此缺陷的日期显示为零。|I giorni senza registrazioni o senza questo difetto sono visualizzati a zero.
Gestion mensuelle|Monthly management|الإدارة الشهرية|月度管理|Gestione mensile
Mois affiché|Displayed month|الشهر المعروض|显示月份|Mese visualizzato
Mois ouvert|Open month|شهر مفتوح|月份开放|Mese aperto
Mois clôturé · lecture seule|Closed month · read only|شهر مقفل · للقراءة فقط|月份已结账 · 只读|Mese chiuso · sola lettura
Actualiser|Refresh|تحديث|刷新|Aggiorna
Exporter le mois|Export month|تصدير الشهر|导出月份|Esporta mese
Clôturer le mois|Close month|إقفال الشهر|月度结账|Chiudi mese
Le mois courant s’ouvre automatiquement. Les mois précédents restent conservés.|The current month opens automatically. Previous months are retained.|يفتح الشهر الحالي تلقائيًا. تبقى الأشهر السابقة محفوظة.|自动打开当前月份，保留以往月份的数据。|Il mese corrente si apre automaticamente. I mesi precedenti restano conservati.
Clôturé le|Closed on|تاريخ الإقفال|结账时间|Chiuso il
Mode local : les données et clôtures sont conservées dans ce navigateur. Exportez le bilan pour en garder une copie.|Local mode: data and closures are kept in this browser. Export the report to keep a copy.|الوضع المحلي: تُحفظ البيانات والإقفالات في هذا المتصفح. صدّر التقرير للاحتفاظ بنسخة.|本地模式：数据和结账记录保存在此浏览器中。请导出报表以保留副本。|Modalità locale: dati e chiusure sono conservati in questo browser. Esporta il bilancio per conservarne una copia.
Clôture à activer : exécutez supabase-monthly-archives.sql dans Supabase.|To enable month closing, run supabase-monthly-archives.sql in Supabase.|لتفعيل الإقفال، نفّذ supabase-monthly-archives.sql في Supabase.|要启用月度结账，请在 Supabase 中执行 supabase-monthly-archives.sql。|Per attivare la chiusura, esegui supabase-monthly-archives.sql in Supabase.
Impossible de vérifier les clôtures. Actualisez avant de modifier les données.|Cannot check month closures. Refresh before editing data.|تعذر التحقق من الإقفالات. حدّث البيانات قبل تعديلها.|无法检查结账状态。请刷新后再修改数据。|Impossibile verificare le chiusure. Aggiorna prima di modificare i dati.
Chargement des données…|Loading data…|جارٍ تحميل البيانات…|正在加载数据…|Caricamento dei dati…
Chargement impossible. Aucune donnée de démonstration ne remplace vos données.|Loading failed. Your data is not replaced with demo data.|تعذر التحميل. لن تُستبدل بياناتك ببيانات تجريبية.|加载失败。不会用演示数据替换您的数据。|Caricamento non riuscito. I dati non vengono sostituiti con dati dimostrativi.
Réinitialiser les filtres|Reset filters|إعادة تعيين المرشحات|重置筛选|Reimposta filtri
Mois clôturé : les données sont en lecture seule.|Month closed: data is read only.|الشهر مقفل: البيانات للقراءة فقط.|月份已结账：数据只读。|Mese chiuso: i dati sono in sola lettura.
Attendez la fin du chargement ou actualisez les données.|Wait for loading to finish or refresh the data.|انتظر اكتمال التحميل أو حدّث البيانات.|请等待加载完成或刷新数据。|Attendi il caricamento o aggiorna i dati.
La date doit appartenir au mois affiché.|The date must be within the displayed month.|يجب أن يكون التاريخ ضمن الشهر المعروض.|日期必须属于显示的月份。|La data deve appartenere al mese visualizzato.
Archive indisponible. Actualisez les données.|Archive unavailable. Refresh the data.|الأرشيف غير متاح. حدّث البيانات.|归档不可用。请刷新数据。|Archivio non disponibile. Aggiorna i dati.
Mois clôturé. Vous pouvez réessayer l’export Excel.|Month closed. You can retry the Excel export.|تم إقفال الشهر. يمكنك إعادة محاولة التصدير إلى Excel.|月份已结账。您可以重试导出 Excel。|Mese chiuso. Puoi riprovare l’esportazione Excel.
Historique du mois|Monthly history|سجل الشهر|月度历史|Storico del mese
Confirmer la clôture|Confirm month closing|تأكيد الإقفال|确认月度结账|Conferma chiusura
Une archive complète sera conservée et le bilan Excel sera téléchargé.|A complete archive will be retained and the Excel report will be downloaded.|سيُحفظ أرشيف كامل وسيتم تنزيل تقرير Excel.|将保留完整归档并下载 Excel 报表。|Verrà conservato un archivio completo e scaricato il bilancio Excel.
Réclamations|Complaints|الشكاوى|投诉|Reclami
{count} saisie(s) à compléter seront conservées dans l’archive.|{count} incomplete entries will be retained in the archive.|سيُحفظ {count} سجل غير مكتمل في الأرشيف.|归档将保留 {count} 条未完成记录。|{count} registrazioni incomplete saranno conservate nell’archivio.
Après validation, les ajouts, modifications et suppressions de ce mois seront bloqués pour tous les départements. La consultation et l’export resteront disponibles.|After confirmation, additions, edits and deletions for this month will be blocked for all departments. Viewing and exporting will remain available.|بعد التأكيد، سيُمنع الإضافة والتعديل والحذف لهذا الشهر في جميع الأقسام. تبقى المشاهدة والتصدير متاحين.|确认后，所有部门都无法新增、修改或删除该月份的数据。仍可查看和导出。|Dopo la conferma, aggiunte, modifiche ed eliminazioni del mese saranno bloccate per tutti i reparti. Consultazione ed esportazione resteranno disponibili.
Clôture en cours…|Closing month…|جارٍ إقفال الشهر…|正在进行月度结账…|Chiusura in corso…
Exporter et clôturer|Export and close|تصدير وإقفال|导出并结账|Esporta e chiudi
Bilan mensuel|Monthly report|التقرير الشهري|月度报表|Bilancio mensile
Identifiant|Identifier|المعرّف|标识|Identificativo
Heures machine|Machine hours|ساعات الآلة|机器工时|Ore macchina
Défauts détaillés|Defect breakdown|تفاصيل العيوب|缺陷明细|Dettaglio difetti
Date de validation|Validation date|تاريخ الاعتماد|验证日期|Data di convalida
Date de création|Created on|تاريخ الإنشاء|创建日期|Data di creazione
Détail|Details|التفاصيل|详情|Dettaglio
Effectif|Headcount|عدد العاملين|人数|Numero di addetti
Saisissez un effectif entier positif ou nul.|Enter a whole, non-negative headcount.|أدخل عددًا صحيحًا غير سالب للعاملين.|请输入非负整数人数。|Inserisci un numero intero non negativo di addetti.
Le champ effectif est absent de la base. Exécutez supabase-sorting-headcount.sql dans Supabase, puis réessayez.|The headcount field is missing from the database. Run supabase-sorting-headcount.sql in Supabase, then try again.|حقل عدد العاملين غير موجود في قاعدة البيانات. نفّذ supabase-sorting-headcount.sql في Supabase، ثم أعد المحاولة.|数据库中缺少人数字段。请在 Supabase 中执行 supabase-sorting-headcount.sql，然后重试。|Il campo del numero di addetti manca nel database. Esegui supabase-sorting-headcount.sql in Supabase, poi riprova.
Annuler|Cancel|Cancel|Cancel|Annulla
OK supprimer|OK, delete|OK, delete|OK, delete|OK, elimina
Reference article|Article reference|Article reference|Article reference|Riferimento articolo
Target rebut|Scrap target|Scrap target|Scrap target|Target scarti
Target rebut (%)|Scrap target (%)|Scrap target (%)|Scrap target (%)|Target scarti (%)
Q/R (%)|Q/R (%)|Q/R (%)|Q/R (%)|Q/R (%)
Evaluation usine|Factory evaluation|Factory evaluation|Factory evaluation|Valutazione stabilimento
Évaluation usine|Factory evaluation|تقييم المصنع|工厂评估|Valutazione stabilimento
Vue d ensemble|Overview|نظرة عامة|概览|Panoramica
Production totale|Total production|إجمالي الإنتاج|总产量|Produzione totale
Taux rebut|Scrap rate|معدل المرفوضات|废品率|Tasso di scarto
pieces|pièces|قطعة|件|pezzi
heures|hours|ساعات|小时|ore
3 derniers mois|Last 3 months|Last 3 months|Last 3 months|Ultimi 3 mesi
Mois actuel|Current month|Current month|Current month|Mese attuale
Semaine actuelle|Current week|Current week|Current week|Settimana attuale
Semaine|Week|Week|Week|Settimana
Sous target|Under target|Under target|Under target|Sotto target
Au target|At target|At target|At target|Al target
Depasse target|Above target|Above target|Above target|Sopra target
Ligne envoyee au service qualite: {department} / {machine}|Entry sent to quality service: {department} / {machine}|Entry sent to quality service: {department} / {machine}|Entry sent to quality service: {department} / {machine}|Riga inviata al servizio qualita: {department} / {machine}
Selectionnez une ligne production a controler|Select a production entry to inspect|Select a production entry to inspect|Select a production entry to inspect|Seleziona una riga produzione da controllare
Controle qualite sauvegarde: {department} / {machine}|Quality inspection saved: {department} / {machine}|Quality inspection saved: {department} / {machine}|Quality inspection saved: {department} / {machine}|Controllo qualita salvato: {department} / {machine}
Traduction|Translation|الترجمة|翻译|Traduzione
Langue|Language|اللغة|语言|Lingua
Dashboard Qualite & Production|Quality & Production Dashboard|لوحة متابعة الجودة والإنتاج|质量与生产看板|Dashboard qualità e produzione
Suivi par departement: Injection, Soudure, Metallisation, Assemblage, Serigraphie|Department tracking: Injection, Welding, Metallization, Assembly, Screen printing|متابعة الأقسام: الحقن، اللحام، الطلاء المعدني، التجميع، الطباعة بالشاشة|部门跟踪：注塑、焊接、金属化、装配、丝网印刷|Monitoraggio reparti: iniezione, saldatura, metallizzazione, assemblaggio, serigrafia
Historique|History|السجل|历史记录|Cronologia
Qualite aujourd'hui|Quality today|الجودة اليوم|今日质量|Qualità oggi
Performance demain|Performance tomorrow|الأداء غداً|明日绩效|Prestazioni domani
Date debut|Start date|تاريخ البداية|开始日期|Data iniziale
Date fin|End date|تاريخ النهاية|结束日期|Data finale
Machine / Poste|Machine / Station|الآلة / المحطة|机器 / 工位|Macchina / Postazione
Reference produit|Product reference|مرجع المنتج|产品编号|Riferimento prodotto
OF / Bon|Work order|أمر العمل|工单|Ordine di lavoro
Tous|All|الكل|全部|Tutti
Appliquer|Apply|تطبيق|应用|Applica
Exporter Excel|Export Excel|Export Excel|Export Excel|Esporta Excel
Reinitialiser|Reset|إعادة تعيين|重置|Reimposta
Injection|Injection molding|الحقن|注塑|Iniezione
Metallisation|Metallization|الطلاء المعدني|金属化|Metallizzazione
Assemblage|Assembly|التجميع|装配|Assemblaggio
Serigraphie|Screen printing|الطباعة بالشاشة|丝网印刷|Serigrafia
Soudure|Welding|اللحام|焊接|Saldatura
Moulage plastique|Plastic molding|قولبة البلاستيك|塑料成型|Stampaggio plastica
Depot sous vide|Vacuum deposition|الترسيب بالتفريغ|真空镀膜|Deposizione sotto vuoto
Montage & controle|Assembly & inspection|التجميع والفحص|装配与检验|Montaggio e controllo
Marquage & impression|Marking & printing|الوسم والطباعة|标记与印刷|Marcatura e stampa
Soudure & finition|Welding & finishing|اللحام والتشطيب|焊接与精加工|Saldatura e finitura
Feuille de saisie production|Production entry sheet|نموذج إدخال الإنتاج|生产录入表|Scheda inserimento produzione
Date|Date|التاريخ|日期|Data
Departement|Department|القسم|部门|Reparto
Choisir machine|Choose a machine|اختر آلة|选择机器|Scegli macchina
Reference machine|Machine reference|مرجع الآلة|机器编号|Riferimento macchina
Choisir reference|Choose a reference|اختر مرجعاً|选择编号|Scegli riferimento
Qte bonne|Good quantity|الكمية السليمة|合格数量|Quantità conforme
Qte rebut|Scrap quantity|كمية المرفوضات|废品数量|Quantità scarti
Heures de tri|Sorting hours|ساعات الفرز|分拣工时|Ore di selezione
Qte bonne après tri|Good quantity after sorting|الكمية الجيدة بعد الفرز|分拣后合格数量|Quantità conforme dopo la selezione
Qte rebut après tri|Scrap quantity after sorting|كمية المرفوضات بعد الفرز|分拣后废品数量|Quantità scarti dopo la selezione
Rebut justifie|Justified scrap|المرفوضات المبررة|已说明原因的废品|Scarti giustificati
Purge kg|Purge (kg)|التطهير (كغ)|清机料（千克）|Spurgo (kg)
Pareto defaut|Defect category|نوع العيب|缺陷类型|Tipo di difetto
Supabase non configure: controle qualite non sauvegarde|Supabase is not configured: quality inspection was not saved|لم يتم إعداد Supabase: لم يتم حفظ فحص الجودة|未配置 Supabase：质量检查未保存|Supabase non configurato: controllo qualità non salvato
Repartition defauts|Defect breakdown|توزيع العيوب|缺陷分类|Ripartizione difetti
Saisir ou choisir defaut|Type or choose a defect|اكتب العيب أو اختره|输入或选择缺陷|Digita o scegli il difetto
Afficher tout|Show all|عرض الكل|显示全部|Mostra tutto
Afficher les 3 dernieres|Show the 3 latest|عرض آخر 3|显示最新3条|Mostra le ultime 3
Quantite defaut|Defect quantity|كمية العيب|缺陷数量|Quantità difetto
Ajouter un defaut|Add a defect|إضافة عيب|添加缺陷|Aggiungi difetto
Supprimer defaut|Remove defect|حذف العيب|删除缺陷|Rimuovi difetto
Total defauts|Defect total|إجمالي العيوب|缺陷总数|Totale difetti
Total defauts = qte rebut|Defect total must equal scrap quantity|يجب أن يساوي إجمالي العيوب كمية المرفوضات|缺陷总数必须等于废品数量|Il totale difetti deve corrispondere agli scarti
Total defauts doit correspondre a qte rebut|Defect total must match scrap quantity|يجب أن يطابق إجمالي العيوب كمية المرفوضات|缺陷总数必须与废品数量一致|Il totale difetti deve corrispondere alla quantità di scarti
Heure travail|Working hours|ساعات العمل|工时|Ore di lavoro
MOD|Direct labor|العمالة المباشرة|直接人工|Manodopera diretta
Nom MOD|Operator names|أسماء العمال|操作员姓名|Nomi operatori
Noms operateurs|Operator names|أسماء العمال|操作员姓名|Nomi operatori
Total heure MOD|Total labor hours|إجمالي ساعات العمالة|总人工工时|Ore totali manodopera
Total H MOD|Total labor hours|إجمالي ساعات العمالة|总人工工时|Ore totali manodopera
Sauvegarder la ligne|Save entry|حفظ السطر|保存记录|Salva riga
Etat saisie|Entry state|Entry state|Entry state|Stato inserimento
Nouvelle ligne|New entry|New entry|New entry|Nuova riga
Nouvelle ligne qualite|New quality entry|New quality entry|New quality entry|Nuova riga qualita
Nouvelle ligne qualite: saisir les donnees disponibles|New quality entry: enter available data|New quality entry: enter available data|New quality entry: enter available data|Nuova riga qualita: inserisci i dati disponibili
Modification|Editing|Editing|Editing|Modifica
Modifier|Edit|Edit|Edit|Modifica
Prod|Prod|Prod|Prod|Prod
Qualite|Quality|Quality|Quality|Qualita
Service de saisie|Entry service|Entry service|Entry service|Servizio di inserimento
Service production|Production service|Production service|Production service|Servizio produzione
Service qualite|Quality service|Quality service|Quality service|Servizio qualita
Saisie service production|Production service entry|Production service entry|Production service entry|Inserimento servizio produzione
Saisie service qualite|Quality service entry|Quality service entry|Quality service entry|Inserimento servizio qualita
Envoyer au service qualite|Send to quality service|Send to quality service|Send to quality service|Invia al servizio qualita
Ligne production|Production entry|Production entry|Production entry|Riga produzione
Choisir ligne production|Choose production entry|Choose production entry|Choose production entry|Scegli riga produzione
Note qualite|Quality note|Quality note|Quality note|Nota qualita
Observation controle|Inspection note|Inspection note|Inspection note|Osservazione controllo
Valider controle qualite|Validate quality inspection|Validate quality inspection|Validate quality inspection|Valida controllo qualita
Controle qualite|Quality inspection|Quality inspection|Quality inspection|Controllo qualita
Qualite a completer|Quality to complete|Quality to complete|Quality to complete|Qualita da completare
Sauvegarder incomplet|Save incomplete|Save incomplete|Save incomplete|Salva incompleto
Valider complet|Validate complete|Validate complete|Validate complete|Valida completo
Saisies a completer|Entries to complete|Entries to complete|Entries to complete|Inserimenti da completare
Etat|State|State|State|Stato
Champs manquants|Missing fields|Missing fields|Missing fields|Campi mancanti
Completer|Complete|Complete|Complete|Completa
Aucune saisie incomplete.|No incomplete entries.|No incomplete entries.|No incomplete entries.|Nessun inserimento incompleto.
A completer|To complete|To complete|To complete|Da completare
Complete|Complete|Complete|Complete|Completo
Brouillon|Draft|Draft|Draft|Bozza
Non renseigne|Not filled|Not filled|Not filled|Non compilato
Pareto des defauts|Defect Pareto chart|مخطط باريتو للعيوب|缺陷帕累托图|Pareto dei difetti
Evaluation par defauts|Defect evaluation|تقييم العيوب|缺陷评估|Valutazione dei difetti
Evolution des defauts|Defect trends|تطور العيوب|缺陷变化趋势|Andamento dei difetti
Nombre de defauts|Number of defects|عدد العيوب|缺陷数量|Numero di difetti
% cumule|Cumulative %|النسبة التراكمية ٪|累计百分比|% cumulata
Comparatif par departement|Department comparison|مقارنة الأقسام|部门对比|Confronto reparti
Production|Production|الإنتاج|生产|Produzione
Rebut|Scrap|المرفوضات|废品|Scarti
Taux de rebut (%)|Scrap rate (%)|نسبة المرفوضات (٪)|废品率（%）|Tasso scarti (%)
Repartition du rebut par departement|Scrap distribution by department|توزيع المرفوضات حسب القسم|各部门废品分布|Distribuzione scarti per reparto
Affectation MOD|Labor assignments|توزيع العمالة|人员分配|Assegnazione manodopera
Nom MOD / operateur(s)|Operator name(s)|أسماء العمال|操作员姓名|Nomi operatori
Nb MOD|Operator count|عدد العمال|操作员人数|Numero operatori
Aucune affectation MOD saisie.|No labor assignments yet.|لم يتم إدخال أي توزيع للعمالة.|尚无人员分配记录。|Nessuna assegnazione inserita.
Detail de la production|Production details|تفاصيل الإنتاج|生产明细|Dettaglio produzione
Aucune donnee. Choisissez un departement puis ajoutez une ligne de production.|No data. Choose a department, then add a production entry.|لا توجد بيانات. اختر قسماً ثم أضف سجل إنتاج.|暂无数据。请选择部门，然后添加生产记录。|Nessun dato. Scegli un reparto e aggiungi una riga di produzione.
Fenetre historique des ajouts|Production history window|نافذة سجل الإدخالات|录入历史窗口|Finestra cronologia inserimenti
Historique complet des ajouts|Complete entry history|السجل الكامل للإدخالات|全部录入历史|Cronologia completa inserimenti
Fermer historique|Close history|إغلاق السجل|关闭历史记录|Chiudi cronologia
Action|Action|الإجراء|操作|Azione
Supprimer|Delete|حذف|删除|Elimina
Aucun historique pour le moment.|No history yet.|لا يوجد سجل حتى الآن.|暂无历史记录。|Nessuna cronologia disponibile.
Connecte a Supabase|Connected to Supabase|متصل بـ Supabase|已连接 Supabase|Connesso a Supabase
Mode local: ajoutez .env pour Supabase|Local mode: add .env to connect Supabase|الوضع المحلي: أضف .env للاتصال بـ Supabase|本地模式：添加 .env 以连接 Supabase|Modalità locale: aggiungi .env per Supabase
Donnees videes: pret pour import Excel et saisie|Data cleared: ready for Excel import and entry|تم إفراغ البيانات: جاهز للاستيراد من Excel والإدخال|数据已清空：可导入 Excel 或录入|Dati svuotati: pronto per importazione Excel e inserimento
A corriger avant sauvegarde: {fields}|Fix before saving: {fields}|يرجى التصحيح قبل الحفظ: {fields}|保存前请修正：{fields}|Correggi prima di salvare: {fields}
Ligne validee et sauvegardee: {department} / {machine}|Entry validated and saved: {department} / {machine}|تم التحقق والحفظ: {department} / {machine}|记录已验证并保存：{department} / {machine}|Riga validata e salvata: {department} / {machine}
Ligne complete sauvegardee: {department} / {machine}|Complete entry saved: {department} / {machine}|Complete entry saved: {department} / {machine}|Complete entry saved: {department} / {machine}|Riga completa salvata: {department} / {machine}
Ligne a completer sauvegardee: {fields}|Incomplete entry saved: {fields}|Incomplete entry saved: {fields}|Incomplete entry saved: {fields}|Riga da completare salvata: {fields}
Ligne chargee pour completion: {department} / {machine}|Entry loaded for completion: {department} / {machine}|Entry loaded for completion: {department} / {machine}|Entry loaded for completion: {department} / {machine}|Riga caricata per completamento: {department} / {machine}
Erreur sauvegarde: {error}|Save error: {error}|خطأ في الحفظ: {error}|保存错误：{error}|Errore di salvataggio: {error}
Supprimer cette saisie ?|Delete this entry?|هل تريد حذف هذا السجل؟|删除此记录？|Eliminare questa riga?
Saisie supprimee: {department} / {machine}|Entry deleted: {department} / {machine}|تم حذف السجل: {department} / {machine}|记录已删除：{department} / {machine}|Riga eliminata: {department} / {machine}
Erreur suppression: {error}|Delete error: {error}|خطأ في الحذف: {error}|删除错误：{error}|Errore di eliminazione: {error}
{count} machines importees depuis Excel|{count} machines imported from Excel|تم استيراد {count} آلة من Excel|已从 Excel 导入 {count} 台机器|{count} macchine importate da Excel
{count} references produit importees depuis Excel|{count} product references imported from Excel|تم استيراد {count} مرجع منتج من Excel|已从 Excel 导入 {count} 个产品编号|{count} riferimenti prodotto importati da Excel
{count} ligne(s) enregistree(s)|Saved entries: {count}|السجلات المحفوظة: {count}|已保存记录：{count}|Righe salvate: {count}
{count} ligne(s) exportee(s) vers Excel|{count} row(s) exported to Excel|{count} row(s) exported to Excel|{count} row(s) exported to Excel|{count} righe esportate in Excel
Aucune donnee a exporter|No data to export|No data to export|No data to export|Nessun dato da esportare
qte bonne ou qte rebut|good quantity or scrap quantity|الكمية السليمة أو كمية المرفوضات|合格数量或废品数量|quantità conforme o scarti
rebut justifie <= qte rebut|justified scrap ≤ scrap quantity|المرفوضات المبررة ≤ كمية المرفوضات|已说明原因的废品 ≤ 废品数量|scarti giustificati ≤ quantità scarti
Ecart|Gap|فجوة|间隙|Scostamento
Fissure|Crack|تشقّق|裂纹|Fessura
Cassure miroir|Broken mirror|كسر المرآة|镜面破裂|Rottura specchio
Trace de colle|Glue mark|أثر الغراء|胶痕|Traccia di colla
Manque pin|Missing pin|دبوس مفقود|缺少插针|Perno mancante
Autres|Other|أخرى|其他|Altri
Autre|Other|أخرى|其他|Altro
Impression decalee|Misaligned print|طباعة غير محاذية|印刷偏位|Stampa disallineata
Variation de couleur|Color variation|تفاوت اللون|色差|Variazione di colore
Impression incomplete|Incomplete print|طباعة غير مكتملة|印刷不完整|Stampa incompleta
Manque de nettete|Lack of sharpness|نقص الوضوح|清晰度不足|Scarsa nitidezza
Contour deforme|Distorted outline|محيط مشوّه|轮廓变形|Contorno deformato
Particule|Particle|جسيم|颗粒|Particella
Rayure|Scratch|خدش|划痕|Graffio
Trace d huile|Oil mark|أثر زيت|油痕|Traccia di olio
Tache blanche|White stain|بقعة بيضاء|白斑|Macchia bianca
Tache noir|Black stain|بقعة سوداء|黑斑|Macchia nera
Bavure|Flash / burr|زوائد|飞边|Bava
Retassure|Sink mark|انكماش سطحي|缩痕|Ritiro
Zone non metallisee|Unmetallized area|منطقة غير مطلية بالمعدن|未镀区域|Zona non metallizzata
Couleur non conforme|Nonconforming color|لون غير مطابق|颜色不符|Colore non conforme
Cassure|Breakage|كسر|断裂|Rottura
Trace de sonotrode|Sonotrode mark|أثر رأس اللحام|焊头痕迹|Traccia del sonotrodo
Piqure|Pitting|تنقّر|麻点|Vaiolatura
Brulure|Burn mark|أثر حرق|烧痕|Bruciatura
Sur soudure|Overwelding|لحام زائد|过度焊接|Saldatura eccessiva
Deformation|Deformation|تشوّه|变形|Deformazione
Effet diesel|Diesel effect|تأثير الديزل|柴油效应|Effetto diesel
Peau d orange|Orange peel|قشرة البرتقال|橘皮纹|Buccia d’arancia
Ligne de soudure|Weld line|خط اللحام|熔接线|Linea di saldatura
Manque matiere|Short shot|نقص المادة|缺料|Mancanza di materiale
Arrachement|Tearing|تمزّق|撕裂|Strappo
Givrage|Frosting|تغبّش|雾化|Opacizzazione
Trace d ejecteur|Ejector mark|أثر القاذف|顶针痕|Traccia estrattore
Machine insertion aimant|Magnet insertion machine|آلة إدخال المغناطيس|磁铁插入机|Macchina inserimento magneti
Machine d assemblage Automatique|Automatic assembly machine|آلة تجميع آلية|自动装配机|Macchina di assemblaggio automatico
Unite exterieur climatiseur|Outdoor air conditioning unit|الوحدة الخارجية للمكيف|空调室外机|Unità esterna climatizzatore
Unite interieur climatiseur|Indoor air conditioning unit|الوحدة الداخلية للمكيف|空调室内机|Unità interna climatizzatore
Machine thermo-couleuse|Hot melt dispensing machine|آلة صب حراري|热熔浇注机|Macchina dosatrice a caldo
Compresseur|Compressor|ضاغط|压缩机|Compressore
Filmeuse palette|Pallet wrapping machine|آلة تغليف المنصات|托盘缠绕机|Avvolgipallet
Machine a tirer des pins|Pin pulling machine|آلة سحب الدبابيس|拔针机|Macchina estrazione perni
Couleuse a clous en plastique|Plastic nail casting machine|آلة صب المسامير البلاستيكية|塑料钉浇注机|Macchina colata chiodi in plastica
Table vibrante de simulation de transport|Transport simulation vibration table|طاولة اهتزاز لمحاكاة النقل|运输模拟振动台|Tavola vibrante per simulazione trasporto
Chambre de lumiere|Light chamber|حجرة إضاءة|光照箱|Camera luminosa
Testeur D'habration|Abrasion tester|جهاز اختبار التآكل|耐磨测试仪|Tester di abrasione
Bain marie|Water bath|حمام مائي|水浴槽|Bagno termostatico
Chambre d'essai de vieillissement|Aging test chamber|حجرة اختبار التقادم|老化试验箱|Camera di invecchiamento
Chambre d'essai environnementale|Environmental test chamber|حجرة اختبار بيئي|环境试验箱|Camera climatica
Machine a coller du ruben adhestif double face|Double-sided tape applicator|آلة لصق الشريط مزدوج الوجه|双面胶贴合机|Applicatore nastro biadesivo
Table controle qualite taille grande|Large quality inspection table|طاولة كبيرة لفحص الجودة|大型质检台|Tavolo grande controllo qualità
Presse petite modele|Small press|مكبس صغير|小型压力机|Pressa piccola
Presse moyen modele|Medium press|مكبس متوسط|中型压力机|Pressa media
Boite antistatique bleu|Blue antistatic box|صندوق أزرق مضاد للكهرباء الساكنة|蓝色防静电箱|Scatola antistatica blu
Machine de ligne d'assemblage de compactage de poudre|Powder compaction assembly line machine|آلة خط تجميع كبس المسحوق|粉末压实装配线设备|Macchina linea compattazione polveri
Tour de craquage|Cracking tower|برج تكسير|裂解塔|Torre di cracking
Secheur d'air|Air dryer|مجفف هواء|空气干燥机|Essiccatore d’aria
Secheur d'air comprime|Compressed air dryer|مجفف هواء مضغوط|压缩空气干燥机|Essiccatore aria compressa
Reservoir air|Air tank|خزان هواء|储气罐|Serbatoio d’aria
Reservoir d'air 1.0/0.8|Air tank 1.0/0.8|خزان هواء 1.0/0.8|储气罐 1.0/0.8|Serbatoio d’aria 1.0/0.8
Tour de refoidissement|Cooling tower|برج تبريد|冷却塔|Torre di raffreddamento
Chariot elivateur|Forklift|رافعة شوكية|叉车|Carrello elevatore
Transpalette electrique|Electric pallet truck|عربة منصات كهربائية|电动搬运车|Transpallet elettrico
Transpalette|Pallet truck|عربة منصات|托盘搬运车|Transpallet
Chaine 3M|3 m line|خط 3 م|3米生产线|Linea 3 m
Chaine 12M|12 m line|خط 12 م|12米生产线|Linea 12 m
Chaine 6M|6 m line|خط 6 م|6米生产线|Linea 6 m
Ventilateur electostatique|Antistatic fan|مروحة مضادة للكهرباء الساكنة|防静电风扇|Ventilatore antistatico
Convoyeur automatique chaine metallisation|Automatic metallization line conveyor|ناقل آلي لخط الطلاء المعدني|金属化线自动输送机|Trasportatore automatico linea metallizzazione
Convoyeur automatique chaine peinture|Automatic paint line conveyor|ناقل آلي لخط الطلاء|喷漆线自动输送机|Trasportatore automatico linea verniciatura
ROBOT DE DECHARGEMENT|Unloading robot|روبوت تفريغ|下料机器人|Robot di scarico
ROBOT CHARGEMENT|Loading robot|روبوت تحميل|上料机器人|Robot di carico
ARMOIRE ELECTRIQUE ( SALLE METALLISATION )|Electrical cabinet (metallization room)|خزانة كهربائية (غرفة الطلاء المعدني)|电气柜（金属化车间）|Quadro elettrico (sala metallizzazione)
ARMOIRE ELECTRIQUE ( SALLE PEINTURE )|Electrical cabinet (paint room)|خزانة كهربائية (غرفة الطلاء)|电气柜（喷漆车间）|Quadro elettrico (sala verniciatura)
Grand four|Large oven|فرن كبير|大型烘箱|Forno grande
VACCUM a deux portes ( 4 CHAMBRES )|Two-door vacuum unit (4 chambers)|وحدة تفريغ ببابين (4 حجرات)|双门真空设备（4腔室）|Unità sottovuoto a due porte (4 camere)
Machine du coupe automatique ruban|Automatic tape cutting machine|آلة قطع الشريط آلياً|自动切带机|Taglierina automatica nastro
FOUR IR|Infrared oven|فرن أشعة تحت الحمراء|红外烘箱|Forno a infrarossi
Four Air GRAND MODELE|Large air oven|فرن هواء كبير|大型热风烘箱|Forno ad aria grande
Four Air PETIT MODELE|Small air oven|فرن هواء صغير|小型热风烘箱|Forno ad aria piccolo
Grand four chaine|Large conveyor oven|فرن ناقل كبير|大型输送式烘箱|Forno a nastro grande
FOUR UV|UV oven|فرن أشعة فوق بنفسجية|紫外固化炉|Forno UV
Machine marquage a chaud|Hot stamping machine|آلة وسم حراري|烫印机|Macchina stampa a caldo
Armoire produit chimie|Chemical storage cabinet|خزانة مواد كيميائية|化学品储存柜|Armadio prodotti chimici
Table de tirage|Pulling table|طاولة سحب|拉伸台|Tavolo di tiraggio
Machine petit coupe film usinage a chaud|Small hot film cutting machine|آلة صغيرة لقطع الفيلم حرارياً|小型热切膜机|Taglierina piccola a caldo per film
Machine de developpement &sechage des cadres|Screen developing and drying machine|آلة تحميض وتجفيف الإطارات|网框显影烘干机|Macchina sviluppo e asciugatura telai
Boite d Impression UV pour ecran serigraphie|UV exposure box for screen printing|صندوق تعريض بالأشعة فوق البنفسجية للطباعة بالشاشة|丝网印刷紫外曝光箱|Unità esposizione UV per serigrafia
Machine serigraphie|Screen printing machine|آلة طباعة بالشاشة|丝网印刷机|Macchina serigrafica
Machine de soudage par utrasons|Ultrasonic welding machine|آلة لحام بالموجات فوق الصوتية|超声波焊接机|Saldatrice a ultrasuoni
`.trim().split('\n').map((row) => row.split('|'));

export const messages = Object.fromEntries(languages.map(({ code }) => [code, {}]));
for (const [fr, en, ar, zh, it] of rows) {
  for (const [code, value] of Object.entries({ fr, en, ar, zh, it })) {
    messages[code][fr] = value;
  }
}

export function createTranslator(language) {
  return (key, values = {}) => {
    const template = messages[language]?.[key] ?? key;
    return String(template ?? '').replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  };
}
