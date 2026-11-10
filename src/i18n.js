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
Enregistrer|Save|حفظ|保存|Salva
Réclamations clients|Customer complaints|شكاوى العملاء|客户投诉|Reclami clienti
Calendrier et registre mensuel · tous clients et départements.|Monthly calendar and register · all customers and departments.|تقويم وسجل شهري · جميع العملاء والأقسام.|月度日历及记录 · 所有客户和部门。|Calendario e registro mensile · tutti i clienti e reparti.
Ajouter une réclamation|Add a complaint|إضافة شكوى|添加投诉|Aggiungi un reclamo
Réclamations ce mois|Complaints this month|شكاوى هذا الشهر|本月投诉|Reclami del mese
Jours concernés|Days affected|الأيام المعنية|涉及天数|Giorni interessati
Écart avec le mois précédent|Change from previous month|التغير عن الشهر السابق|与上月相比|Variazione dal mese precedente
Mois précédent : {count} réclamation(s).|Previous month: {count} complaint(s).|الشهر السابق: {count} شكوى.|上月：{count} 条投诉。|Mese precedente: {count} reclami.
Calendrier des réclamations|Complaints calendar|تقويم الشكاوى|投诉日历|Calendario reclami
Sélectionnez un jour pour consulter ses réclamations.|Select a day to view its complaints.|اختر يومًا لعرض شكاواه.|选择日期以查看当天的投诉。|Seleziona un giorno per consultare i reclami.
Jours du mois|Days of the month|أيام الشهر|本月日期|Giorni del mese
{count} réclamation(s)|{count} complaint(s)|{count} شكوى|{count} 条投诉|{count} reclami
Aucune réclamation|No complaints|لا شكاوى|无投诉|Nessun reclamo
Une réclamation|One complaint|شكوى واحدة|一条投诉|Un reclamo
Plusieurs réclamations|Several complaints|عدة شكاوى|多条投诉|Più reclami
Liste des réclamations|Complaints list|قائمة الشكاوى|投诉列表|Elenco reclami
{count} résultat(s)|{count} result(s)|{count} نتيجة|{count} 条结果|{count} risultati
Rechercher une réclamation|Search complaints|البحث عن شكوى|搜索投诉|Cerca un reclamo
Rechercher dans les réclamations…|Search complaints…|البحث في الشكاوى…|搜索投诉…|Cerca nei reclami…
Réclamation client|Customer complaint|شكوى عميل|客户投诉|Reclamo cliente
Supprimer la réclamation du {date}|Delete complaint dated {date}|حذف شكوى {date}|删除 {date} 的投诉|Elimina il reclamo del {date}
Aucune réclamation pour cette sélection.|No complaints match this selection.|لا توجد شكاوى لهذا التحديد.|当前筛选下无投诉。|Nessun reclamo per questa selezione.
Aucune réclamation enregistrée.|No complaints recorded.|لا توجد شكاوى مسجلة.|暂无已登记投诉。|Nessun reclamo registrato.
Nouvelle réclamation client|New customer complaint|شكوى عميل جديدة|新增客户投诉|Nuovo reclamo cliente
Date de réclamation|Complaint date|تاريخ الشكوى|投诉日期|Data reclamo
Décrivez la réclamation du client…|Describe the customer complaint…|صف شكوى العميل…|描述客户投诉…|Descrivi il reclamo del cliente…
Supprimer cette réclamation ?|Delete this complaint?|حذف هذه الشكوى؟|删除这条投诉？|Eliminare questo reclamo?
L’enregistrement des champs vides nécessite une mise à jour. Contactez votre administrateur.|Saving empty fields requires an update. Contact your administrator.|يتطلب حفظ الحقول الفارغة تحديثًا. اتصل بالمسؤول.|保存空字段需要更新。请联系管理员。|Il salvataggio dei campi vuoti richiede un aggiornamento. Contatta l’amministratore.
Tous les champs du rapport sont facultatifs. Vous pouvez enregistrer et compléter plus tard.|All report fields are optional. You can save and complete them later.|جميع حقول التقرير اختيارية. يمكنك الحفظ وإكمالها لاحقًا.|报告的所有字段均为选填。您可以保存后再补充。|Tutti i campi del rapporto sono facoltativi. Puoi salvare e completarli in seguito.
Service indisponible. Réessayez ou contactez votre administrateur.|Service unavailable. Try again or contact your administrator.|الخدمة غير متاحة. أعد المحاولة أو اتصل بالمسؤول.|服务不可用。请重试或联系管理员。|Servizio non disponibile. Riprova o contatta l’amministratore.
Les données sont conservées sur cet appareil. Exportez le bilan pour en garder une copie.|Data is saved on this device. Export the report to keep a copy.|البيانات محفوظة على هذا الجهاز. صدّر التقرير للاحتفاظ بنسخة.|数据保存在此设备上。导出报告以保留副本。|I dati sono salvati su questo dispositivo. Esporta il resoconto per conservarne una copia.
La clôture mensuelle est indisponible. Contactez votre administrateur.|Monthly closing is unavailable. Contact your administrator.|الإغلاق الشهري غير متاح. اتصل بالمسؤول.|月度结算不可用。请联系管理员。|La chiusura mensile non è disponibile. Contatta l’amministratore.
Impossible de vérifier les clôtures. Actualisez les données.|Unable to check month closures. Refresh the data.|تعذّر التحقق من الإغلاقات. حدّث البيانات.|无法检查月度结算。请刷新数据。|Impossibile verificare le chiusure. Aggiorna i dati.
Du premier au dernier jour du mois. Chaque point indique la présence d’une réclamation.|From the first to the last day of the month. Each point indicates a complaint.|من أول يوم إلى آخر يوم في الشهر. تشير كل نقطة إلى وجود شكوى.|从月初到月末。每个点表示当天有投诉。|Dal primo all’ultimo giorno del mese. Ogni punto indica la presenza di un reclamo.
Du 1er au dernier jour du mois. Chaque point : 1 le jour de la réclamation, 0 sinon. Double-cliquez sur une date pour ajouter une réclamation.|From the first to the last day of the month. Each point is 1 on a complaint day, otherwise 0. Double-click a date to add a complaint.|من أول الشهر إلى آخره. كل نقطة تساوي 1 في يوم الشكوى و0 خلاف ذلك. انقر مرتين على تاريخ لإضافة شكوى.|从月初到月末。投诉日为1，否则为0。双击日期可添加投诉。|Dal primo all’ultimo giorno del mese. Ogni punto vale 1 nel giorno del reclamo, altrimenti 0. Fai doppio clic su una data per aggiungere un reclamo.
Aucune donnée pour ces filtres.|No data for these filters.|لا توجد بيانات لهذه المرشحات.|当前筛选条件下无数据。|Nessun dato per questi filtri.
Contrôle enregistré.|Inspection saved.|تم حفظ الفحص.|检查已保存。|Controllo salvato.
Rapport enregistré.|Report saved.|تم حفظ التقرير.|报告已保存。|Rapporto salvato.
Les contrôles ont été transférés.|Inspections transferred.|تم نقل الفحوصات.|检查已转移。|Controlli trasferiti.
Ces contrôles sont conservés sur cet appareil.|These inspections are saved on this device.|هذه الفحوصات محفوظة على هذا الجهاز.|这些检查保存在此设备上。|Questi controlli sono salvati su questo dispositivo.
Consultez les rapports d’anomalie du mois.|View this month’s anomaly reports.|اطّلع على تقارير الحالات غير المطابقة لهذا الشهر.|查看本月异常报告。|Consulta i rapporti di anomalia del mese.
Sans rapport|No report|بدون تقرير|无报告|Senza rapporto
Heures de tri par client et par jour.|Sorting hours by client and day.|ساعات الفرز حسب العميل واليوم.|按客户和日期统计分拣工时。|Ore di cernita per cliente e giorno.
L’enregistrement des tris est indisponible.|Saving sorting operations is unavailable.|حفظ عمليات الفرز غير متاح.|无法保存分拣操作。|Il salvataggio delle operazioni di cernita non è disponibile.
Navigation principale|Main navigation|التنقل الرئيسي|主导航|Navigazione principale
Tableau de bord|Dashboard|لوحة المعلومات|仪表板|Dashboard
Rapports d’anomalie|Anomaly reports|تقارير الحالات غير المطابقة|异常报告|Rapporti di anomalia
Options du mode réunion|Meeting mode options|خيارات وضع الاجتماع|会议模式选项|Opzioni modalità riunione
Quitter la réunion|Exit meeting|الخروج من الاجتماع|退出会议|Esci dalla riunione
Retour aux rapports|Back to reports|العودة إلى التقارير|返回报告|Torna ai rapporti
Retrouvez les rapports enregistrés et les lots NOK à documenter.|Find saved reports and NOK lots awaiting documentation.|اعثر على التقارير المحفوظة والدفعات NOK التي تحتاج إلى توثيق.|查找已保存的报告和尚待记录的 NOK 批次。|Trova i rapporti salvati e i lotti NOK da documentare.
Enregistrés|Saved|محفوظة|已保存|Salvati
Enregistré|Saved|محفوظ|已保存|Salvato
À rédiger|To write|للإعداد|待编写|Da redigere
Rechercher|Search|بحث|搜索|Cerca
Client, lot, référence, défaut…|Client, lot, reference, defect…|عميل، دفعة، مرجع، عيب…|客户、批次、参考号、缺陷…|Cliente, lotto, riferimento, difetto…
Statut|Status|الحالة|状态|Stato
Consulter|View|عرض|查看|Visualizza
Rédiger|Write|إعداد|编写|Redigi
Aucun rapport ni lot NOK pour cette sélection.|No reports or NOK lots for this selection.|لا توجد تقارير أو دفعات NOK لهذا التحديد.|此筛选下无报告或 NOK 批次。|Nessun rapporto o lotto NOK per questa selezione.
Activer le mode réunion|Enable meeting mode|تفعيل وضع الاجتماع|启用会议模式|Attiva modalità riunione
Quitter le mode réunion|Exit meeting mode|الخروج من وضع الاجتماع|退出会议模式|Esci dalla modalità riunione
Présentez tout le site avec ses graphiques et tableaux.|Present the whole site with its charts and tables.|اعرض الموقع بالكامل بمخططاته وجداوله.|展示整个网站及其图表和表格。|Presenta tutto il sito con i suoi grafici e tabelle.
Tout le site en présentation · filtres et navigation disponibles.|Whole site in presentation mode · filters and navigation available.|الموقع بالكامل في وضع العرض · الفلاتر والتنقل متاحان.|全站演示模式 · 可使用筛选和导航。|Tutto il sito in presentazione · filtri e navigazione disponibili.
Mode réunion : les saisies sont désactivées.|Meeting mode: data entry is disabled.|وضع الاجتماع: إدخال البيانات معطّل.|会议模式：已禁用数据录入。|Modalità riunione: inserimento dati disattivato.
Le plein écran est indisponible. Le mode réunion reste actif.|Full screen is unavailable. Meeting mode remains active.|ملء الشاشة غير متاح. يبقى وضع الاجتماع نشطًا.|全屏不可用。会议模式仍然启用。|Schermo intero non disponibile. La modalità riunione resta attiva.
L’impression est indisponible dans ce navigateur.|Printing is unavailable in this browser.|الطباعة غير متاحة في هذا المتصفح.|此浏览器不支持打印。|Stampa non disponibile in questo browser.
Données de production indisponibles.|Production data unavailable.|بيانات الإنتاج غير متاحة.|生产数据不可用。|Dati di produzione non disponibili.
Mode réunion|Meeting mode|وضع الاجتماع|会议模式|Modalità riunione
Présenter, décider, suivre.|Present, decide, follow up.|اعرض وقرّر وتابع.|展示、决策、跟进。|Presentare, decidere, seguire.
Préparez les chiffres du mois et ouvrez une présentation adaptée au partage d’écran.|Prepare the monthly figures and open a presentation for screen sharing.|جهّز أرقام الشهر وافتح عرضًا مناسبًا لمشاركة الشاشة.|准备月度数据并打开适合屏幕共享的演示。|Prepara i dati del mese e apri una presentazione per la condivisione dello schermo.
Démarrer la présentation|Start presentation|بدء العرض|开始演示|Avvia presentazione
Revue qualité et production|Quality and production review|مراجعة الجودة والإنتاج|质量与生产评审|Riesame qualità e produzione
Synthèse|Overview|ملخص|概览|Sintesi
Production et défauts|Production and defects|الإنتاج والعيوب|生产与缺陷|Produzione e difetti
Tri par client|Sorting by customer|الفرز حسب العميل|按客户分拣|Cernita per cliente
Décisions et actions|Decisions and actions|القرارات والإجراءات|决策与行动|Decisioni e azioni
Tous les clients|All customers|جميع العملاء|所有客户|Tutti i clienti
Périmètre|Scope|النطاق|范围|Ambito
Ce périmètre est propre à la réunion.|This scope is specific to the meeting.|هذا النطاق خاص بالاجتماع.|此范围仅适用于会议。|Questo ambito è specifico della riunione.
Les chiffres sont figés à l’ouverture de la présentation.|Figures are frozen when the presentation opens.|تُثبّت الأرقام عند فتح العرض.|打开演示时固定数据。|I dati vengono fissati all’apertura della presentazione.
Attendez le chargement des données de production avant de démarrer.|Wait for production data to load before starting.|انتظر تحميل بيانات الإنتاج قبل البدء.|开始前请等待生产数据加载。|Attendi il caricamento dei dati di produzione prima di iniziare.
Titre de la réunion|Meeting title|عنوان الاجتماع|会议标题|Titolo della riunione
Participants|Participants|المشاركون|参会人员|Partecipanti
Décisions et points à suivre|Decisions and follow-up items|القرارات ونقاط المتابعة|决策与跟进事项|Decisioni e punti da seguire
Constats, décisions prises et points à vérifier à la prochaine réunion…|Findings, decisions made and points to check at the next meeting…|الملاحظات والقرارات المتخذة والنقاط المطلوب التحقق منها في الاجتماع القادم…|发现的问题、已做出的决策及下次会议需核实的事项…|Osservazioni, decisioni prese e punti da verificare alla prossima riunione…
Plan d’actions|Action plan|خطة العمل|行动计划|Piano d’azione
Ajouter une action|Add an action|إضافة إجراء|添加行动|Aggiungi un’azione
Responsable|Owner|المسؤول|负责人|Responsabile
Échéance|Due date|الموعد النهائي|截止日期|Scadenza
À faire|To do|للإنجاز|待办|Da fare
En cours|In progress|قيد التنفيذ|进行中|In corso
Terminé|Done|مكتمل|已完成|Completato
Retirer cette action|Remove this action|إزالة هذا الإجراء|移除此行动|Rimuovi questa azione
Attribuez un responsable et une échéance à chaque action.|Assign an owner and due date to each action.|حدّد مسؤولًا وموعدًا نهائيًا لكل إجراء.|为每项行动指定负责人和截止日期。|Assegna un responsabile e una scadenza a ogni azione.
Notes sauvegardées dans ce navigateur, pour ce mois.|Notes saved in this browser for this month.|حُفظت الملاحظات في هذا المتصفح لهذا الشهر.|本月备注已保存在此浏览器中。|Note salvate in questo browser per questo mese.
Sauvegarde locale indisponible. Téléchargez le compte rendu pour conserver vos notes.|Local saving is unavailable. Download the minutes to keep your notes.|الحفظ المحلي غير متاح. نزّل المحضر للاحتفاظ بملاحظاتك.|本地保存不可用。请下载会议纪要以保留备注。|Salvataggio locale non disponibile. Scarica il verbale per conservare le note.
Télécharger le compte rendu|Download meeting minutes|تنزيل محضر الاجتماع|下载会议纪要|Scarica il verbale
Imprimer / PDF|Print / PDF|طباعة / PDF|打印 / PDF|Stampa / PDF
Partagez cette présentation avec votre outil de réunion habituel.|Share this presentation using your usual meeting tool.|شارك هذا العرض باستخدام أداة الاجتماعات المعتادة.|使用您常用的会议工具共享此演示。|Condividi la presentazione con il tuo strumento abituale per le riunioni.
Données figées le|Data frozen on|البيانات مثبتة بتاريخ|数据固定时间|Dati fissati il
Bilan par département|Department summary|ملخص حسب القسم|部门汇总|Riepilogo per reparto
Objectif|Target|الهدف|目标|Obiettivo
Réclamations du mois — tous clients|Monthly complaints — all customers|شكاوى الشهر — جميع العملاء|本月投诉 — 所有客户|Reclami del mese — tutti i clienti
Les réclamations sont globales ; elles ne sont pas filtrées par client ou département.|Complaints are global; customer and department filters do not apply.|الشكاوى إجمالية؛ لا تُصفّى حسب العميل أو القسم.|投诉为全局数据，不按客户或部门筛选。|I reclami sono globali; i filtri cliente e reparto non si applicano.
Aucune donnée de production pour ce périmètre.|No production data for this scope.|لا توجد بيانات إنتاج لهذا النطاق.|此范围内无生产数据。|Nessun dato di produzione per questo ambito.
Évolution des rebuts|Scrap trend|تطور المرفوضات|废品趋势|Andamento degli scarti
Principaux défauts|Main defects|العيوب الرئيسية|主要缺陷|Difetti principali
Les six défauts les plus fréquents du périmètre sont présentés.|The six most frequent defects in this scope are shown.|تُعرض العيوب الستة الأكثر تكرارًا في هذا النطاق.|显示此范围内最常见的六种缺陷。|Sono mostrati i sei difetti più frequenti dell’ambito.
Aucun défaut renseigné pour ce périmètre.|No defects recorded for this scope.|لا توجد عيوب مسجلة لهذا النطاق.|此范围内未记录缺陷。|Nessun difetto registrato per questo ambito.
Données de tri indisponibles. Actualisez le tableau de bord avant de préparer la réunion.|Sorting data is unavailable. Refresh the dashboard before preparing the meeting.|بيانات الفرز غير متاحة. حدّث لوحة المتابعة قبل إعداد الاجتماع.|分拣数据不可用。准备会议前请刷新看板。|Dati di cernita non disponibili. Aggiorna la dashboard prima di preparare la riunione.
Données indisponibles|Data unavailable|البيانات غير متاحة|数据不可用|Dati non disponibili
Aucune décision renseignée pour le moment.|No decisions recorded yet.|لم تُسجّل قرارات بعد.|尚未记录决策。|Nessuna decisione registrata al momento.
Aucune action renseignée pour le moment.|No actions recorded yet.|لم تُسجّل إجراءات بعد.|尚未记录行动。|Nessuna azione registrata al momento.
Responsable à préciser|Owner to be assigned|يجب تحديد المسؤول|待指定负责人|Responsabile da definire
Échéance à préciser|Due date to be set|يجب تحديد الموعد|待确定截止日期|Scadenza da definire
Vues de la réunion|Meeting views|عروض الاجتماع|会议视图|Viste della riunione
Vue précédente|Previous view|العرض السابق|上一视图|Vista precedente
Vue suivante|Next view|العرض التالي|下一视图|Vista successiva
Plein écran|Full screen|ملء الشاشة|全屏|Schermo intero
Quitter le plein écran|Exit full screen|الخروج من ملء الشاشة|退出全屏|Esci da schermo intero
Fermer la présentation|Close presentation|إغلاق العرض|关闭演示|Chiudi presentazione
Le plein écran est indisponible. La présentation reste ouverte.|Full screen is unavailable. The presentation remains open.|ملء الشاشة غير متاح. يبقى العرض مفتوحًا.|全屏不可用。演示仍保持打开。|Schermo intero non disponibile. La presentazione resta aperta.
Compte rendu de réunion|Meeting minutes|محضر الاجتماع|会议纪要|Verbale della riunione
Le téléchargement a échoué. Vos notes restent affichées.|Download failed. Your notes remain visible.|فشل التنزيل. تبقى ملاحظاتك ظاهرة.|下载失败。备注仍然显示。|Download non riuscito. Le note restano visibili.
L’impression a échoué. Téléchargez le compte rendu pour conserver vos notes.|Printing failed. Download the minutes to keep your notes.|فشلت الطباعة. نزّل المحضر للاحتفاظ بملاحظاتك.|打印失败。请下载会议纪要以保留备注。|Stampa non riuscita. Scarica il verbale per conservare le note.
Heures de tri par jour|Daily sorting hours|ساعات الفرز اليومية|每日分拣工时|Ore di cernita giornaliere
Une ligne par opération de tri|One row per sorting operation|سطر لكل عملية فرز|每项分拣作业一行|Una riga per operazione di cernita
Ajouter un tri|Add sorting operation|إضافة عملية فرز|添加分拣作业|Aggiungi una cernita
Modifier le tri|Edit sorting operation|تعديل عملية الفرز|编辑分拣作业|Modifica la cernita
Plusieurs clients et plusieurs opérations peuvent être enregistrés le même jour.|Multiple customers and operations can be recorded on the same day.|يمكن تسجيل عدة عملاء وعمليات في اليوم نفسه.|同一天可记录多个客户和多项作业。|È possibile registrare più clienti e operazioni nello stesso giorno.
Tous les départements|All departments|جميع الأقسام|所有部门|Tutti i reparti
Client non renseigné|Customer not recorded|العميل غير مسجل|未记录客户|Cliente non indicato
Durée du tri (h)|Sorting duration (h)|مدة الفرز (ساعات)|分拣时长（小时）|Durata della cernita (h)
Heures-personnes|Person-hours|ساعات العمل البشرية|人时|Ore-persona
Heures-personnes = durée du tri × effectif.|Person-hours = sorting duration × staff count.|ساعات العمل البشرية = مدة الفرز × عدد العاملين.|人时 = 分拣时长 × 人数。|Ore-persona = durata della cernita × numero di addetti.
Opérations de tri|Sorting operations|عمليات الفرز|分拣作业|Operazioni di cernita
Cumul des heures|Cumulative hours|الساعات التراكمية|累计工时|Ore cumulative
Barres : heures par client. Courbe : cumul des heures du mois. Cliquez sur un jour pour voir ses opérations.|Bars: hours by customer. Line: cumulative monthly hours. Click a day to view its operations.|الأعمدة: الساعات لكل عميل. المنحنى: الساعات التراكمية للشهر. انقر على يوم لعرض عملياته.|柱形表示各客户工时，曲线表示本月累计工时。点击某天查看作业。|Barre: ore per cliente. Curva: ore cumulative del mese. Clicca su un giorno per vedere le operazioni.
Calcul partiel : {count} tri(s) sans effectif.|Partial calculation: {count} operation(s) without a staff count.|حساب جزئي: {count} عملية دون عدد عاملين.|部分计算：{count} 项作业未记录人数。|Calcolo parziale: {count} operazioni senza numero di addetti.
Aucun tri pour ces filtres sur ce mois.|No sorting operations match these filters this month.|لا توجد عمليات فرز تطابق هذه الفلاتر لهذا الشهر.|本月无符合筛选条件的分拣作业。|Nessuna cernita corrisponde ai filtri nel mese.
Jour à consulter|Day to view|اليوم المراد عرضه|查看日期|Giorno da consultare
Tout le mois|Entire month|الشهر بالكامل|整月|Tutto il mese
Facultatif|Optional|اختياري|可选|Facoltativo
Ancienne saisie : le client peut être renseigné sans modifier les quantités.|Legacy entry: a customer can be assigned without changing quantities.|سجل قديم: يمكن تحديد العميل دون تغيير الكميات.|旧记录：可填写客户而不更改数量。|Vecchia registrazione: è possibile indicare il cliente senza modificare le quantità.
Enregistrer et ajouter un autre tri|Save and add another operation|حفظ وإضافة عملية فرز أخرى|保存并添加另一项作业|Salva e aggiungi un’altra cernita
Tri enregistré. Vous pouvez ajouter une autre opération.|Sorting saved. You can add another operation.|تم حفظ الفرز. يمكنك إضافة عملية أخرى.|分拣已保存，可添加另一项作业。|Cernita salvata. Puoi aggiungere un’altra operazione.
Vérifiez les champs du tri.|Check the sorting fields.|تحقق من حقول الفرز.|请检查分拣字段。|Verifica i campi della cernita.
Configurez Supabase pour enregistrer les heures de tri en ligne.|Configure Supabase to save sorting hours online.|قم بإعداد Supabase لحفظ ساعات الفرز عبر الإنترنت.|请配置 Supabase 以在线保存分拣工时。|Configura Supabase per salvare online le ore di cernita.
Pour enregistrer plusieurs tris par jour et par client, exécutez supabase-sorting-operations.sql dans Supabase, puis actualisez.|To save multiple sorting operations per day and customer, run supabase-sorting-operations.sql in Supabase, then refresh.|لحفظ عدة عمليات فرز يوميًا ولكل عميل، نفّذ supabase-sorting-operations.sql في Supabase ثم حدّث.|要每天为各客户保存多项分拣作业，请在 Supabase 执行 supabase-sorting-operations.sql 后刷新。|Per salvare più cernite al giorno e per cliente, esegui supabase-sorting-operations.sql in Supabase e aggiorna.
Défaut constaté (facultatif)|Observed defect (optional)|العيب المسجل (اختياري)|发现的缺陷（可选）|Difetto riscontrato (facoltativo)
Pareto des défauts|Defect Pareto|مخطط باريتو للعيوب|缺陷帕累托图|Pareto dei difetti
Lots avec défaut|Lots with a defect|دفعات بها عيب|有缺陷记录的批次|Lotti con difetto
Nombre de lots|Number of lots|عدد الدفعات|批次数量|Numero di lotti
Cumul (%)|Cumulative (%)|النسبة التراكمية (%)|累计比例 (%)|Cumulata (%)
Voir les données du Pareto|View Pareto data|عرض بيانات باريتو|查看帕累托数据|Visualizza i dati del Pareto
Aucun défaut renseigné pour ce département sur ce mois.|No defects recorded for this department this month.|لا توجد عيوب مسجلة لهذا القسم في هذا الشهر.|此部门本月未记录缺陷。|Nessun difetto registrato per questo reparto nel mese.
Lots OK et NOK avec un défaut renseigné, classés par fréquence décroissante. Chaque lot compte une fois ; la courbe indique le pourcentage cumulé.|OK and NOK lots with a recorded defect, ranked by decreasing frequency. Each lot counts once; the line shows the cumulative percentage.|دفعات OK وNOK ذات عيب مسجل، مرتبة حسب التكرار تنازليًا. تُحسب كل دفعة مرة واحدة؛ يعرض المنحنى النسبة التراكمية.|按频次降序排列已记录缺陷的 OK 和 NOK 批次。每批计数一次；曲线表示累计百分比。|Lotti OK e NOK con difetto registrato, ordinati per frequenza decrescente. Ogni lotto conta una volta; la curva indica la percentuale cumulata.
Pour enregistrer un défaut sur un lot OK dans Supabase, exécutez supabase-lot-ok-defects.sql, puis réessayez.|To save a defect on an OK lot in Supabase, run supabase-lot-ok-defects.sql, then retry.|لحفظ عيب في دفعة OK في Supabase، نفّذ supabase-lot-ok-defects.sql ثم أعد المحاولة.|要在 Supabase 中为 OK 批次保存缺陷，请执行 supabase-lot-ok-defects.sql 后重试。|Per salvare un difetto su un lotto OK in Supabase, esegui supabase-lot-ok-defects.sql e riprova.
Rapport d’anomalie|Anomaly report|تقرير عدم المطابقة|异常报告|Rapporto di anomalia
Nouveau rapport|New report|تقرير جديد|新建报告|Nuovo rapporto
Retour aux contrôles|Back to inspections|العودة إلى الفحوص|返回检验|Torna ai controlli
Informations du lot|Lot information|معلومات الدفعة|批次信息|Informazioni lotto
La référence, l’OF, la date, le département et le client sont renseignés automatiquement depuis le lot.|The reference, work order, date, department and customer are filled automatically from the lot.|يتم ملء المرجع وأمر التصنيع والتاريخ والقسم والعميل تلقائيًا من الدفعة.|产品编号、工单、日期、部门和客户根据批次自动填写。|Riferimento, ordine, data, reparto e cliente sono compilati automaticamente dal lotto.
Décrivez la cause à l’origine de l’anomalie.|Describe the root cause of the anomaly.|صف السبب الجذري لعدم المطابقة.|请描述异常的根本原因。|Descrivi la causa all’origine dell’anomalia.
Décrivez les mesures prises immédiatement pour contenir l’anomalie.|Describe the measures taken immediately to contain the anomaly.|صف التدابير المتخذة فورًا لاحتواء عدم المطابقة.|请描述为控制异常而立即采取的措施。|Descrivi le misure immediate adottate per contenere l’anomalia.
Décrivez le résultat des mesures immédiates et comment il a été vérifié.|Describe the result of the immediate measures and how it was verified.|صف نتيجة التدابير الفورية وكيف تم التحقق منها.|请描述即时措施的结果及其验证方式。|Descrivi il risultato delle misure immediate e come è stato verificato.
Décrivez les actions prévues pour éviter que l’anomalie se reproduise.|Describe the actions planned to prevent the anomaly from recurring.|صف الإجراءات المخططة لمنع تكرار عدم المطابقة.|请描述为防止异常再次发生而计划采取的措施。|Descrivi le azioni previste per evitare che l’anomalia si ripeta.
Décrivez les résultats obtenus et les vérifications de l’efficacité.|Describe the results obtained and the checks of effectiveness.|صف النتائج المحققة والتحقق من الفعالية.|请描述取得的结果和有效性验证。|Descrivi i risultati ottenuti e le verifiche dell’efficacia.
Cause racine|Root cause|السبب الجذري|根本原因|Causa radice
Description de la cause racine|Root cause description|وصف السبب الجذري|根本原因说明|Descrizione della causa radice
Action immédiate|Immediate action|الإجراء الفوري|即时措施|Azione immediata
Description de l’action immédiate|Immediate action description|وصف الإجراء الفوري|即时措施说明|Descrizione dell’azione immediata
Efficacité de l’action immédiate|Immediate action effectiveness|فعالية الإجراء الفوري|即时措施有效性|Efficacia dell’azione immediata
Action corrective|Corrective action|الإجراء التصحيحي|纠正措施|Azione correttiva
Description de l’action corrective|Corrective action description|وصف الإجراء التصحيحي|纠正措施说明|Descrizione dell’azione correttiva
Efficacité de l’action corrective|Corrective action effectiveness|فعالية الإجراء التصحيحي|纠正措施有效性|Efficacia dell’azione correttiva
Actions|Actions|الإجراءات|操作|Azioni
Enregistrer le rapport|Save report|حفظ التقرير|保存报告|Salva rapporto
Enregistrer et télécharger le PDF|Save and download PDF|حفظ وتنزيل PDF|保存并下载 PDF|Salva e scarica PDF
Le rapport est enregistré avec le lot dans Supabase.|The report is saved with the lot in Supabase.|يُحفظ التقرير مع الدفعة في Supabase.|报告与批次一起保存在 Supabase。|Il rapporto è salvato con il lotto in Supabase.
Le rapport est conservé dans ce navigateur avec le lot.|The report is stored with the lot in this browser.|يُحفظ التقرير مع الدفعة في هذا المتصفح.|报告与批次一起保存在此浏览器。|Il rapporto è conservato con il lotto in questo browser.
Rapport enregistré dans Supabase.|Report saved in Supabase.|تم حفظ التقرير في Supabase.|报告已保存到 Supabase。|Rapporto salvato in Supabase.
Rapport enregistré dans ce navigateur.|Report saved in this browser.|تم حفظ التقرير في هذا المتصفح.|报告已保存在此浏览器。|Rapporto salvato in questo browser.
Rapport enregistré, mais le téléchargement a échoué. Réessayez.|Report saved, but download failed. Please retry.|تم حفظ التقرير لكن تعذر تنزيله. أعد المحاولة.|报告已保存，但下载失败。请重试。|Rapporto salvato, ma il download non è riuscito. Riprova.
Pour enregistrer les rapports dans Supabase, exécutez supabase-lot-anomaly-reports.sql, puis actualisez.|To save reports in Supabase, run supabase-lot-anomaly-reports.sql, then refresh.|لحفظ التقارير في Supabase، نفّذ supabase-lot-anomaly-reports.sql ثم حدّث.|要将报告保存到 Supabase，请执行 supabase-lot-anomaly-reports.sql，然后刷新。|Per salvare i rapporti in Supabase, esegui supabase-lot-anomaly-reports.sql, poi aggiorna.
Le contrôle a été modifié. Actualisez avant d’enregistrer le rapport.|The inspection changed. Refresh before saving the report.|تم تعديل الفحص. حدّث قبل حفظ التقرير.|检验已更改。请刷新后再保存报告。|Il controllo è stato modificato. Aggiorna prima di salvare il rapporto.
Complétez les cinq descriptions du rapport.|Complete all five report descriptions.|أكمل الأوصاف الخمسة للتقرير.|请填写报告的五项说明。|Completa le cinque descrizioni del rapporto.
Un nouveau rapport nécessite un lot NOK enregistré.|A new report requires a saved NOK lot.|يتطلب التقرير الجديد دفعة NOK محفوظة.|新报告需要一个已保存的 NOK 批次。|Un nuovo rapporto richiede un lotto NOK salvato.
Total des rebuts du jour|Total daily scrap|إجمالي المرفوضات اليومية|当日废品总量|Totale scarti giornalieri
Part du défaut dans les rebuts du jour|Defect share of daily scrap|نسبة العيب من المرفوضات اليومية|缺陷占当日废品比例|Quota del difetto negli scarti del giorno
Étiquettes : pourcentage de ce défaut dans les rebuts du jour.|Labels: this defect’s percentage of daily scrap.|التسميات: نسبة هذا العيب من المرفوضات اليومية.|标签：该缺陷占当日废品的百分比。|Etichette: percentuale di questo difetto negli scarti del giorno.
Part des rebuts totaux|Share of total scrap|النسبة من إجمالي المرفوضات|占总废品比例|Quota degli scarti totali
{defect} sur {total} rebuts|{defect} out of {total} scrapped parts|{defect} من أصل {total} قطعة مرفوضة|总计 {total} 件废品中的 {defect} 件|{defect} su {total} pezzi scartati
Chargement impossible|Loading failed|تعذر التحميل|加载失败|Caricamento non riuscito
Les données LOT locales sont illisibles.|Local LOT data cannot be read.|تعذر قراءة بيانات LOT المحلية.|无法读取本地 LOT 数据。|I dati LOT locali non sono leggibili.
Contrôle des lots|Lot inspection|مراقبة الدفعات|批次检验|Controllo lotti
Suivi des décisions et des quantités par département.|Track decisions and quantities by department.|متابعة القرارات والكميات حسب القسم.|按部门跟踪判定和数量。|Monitoraggio di decisioni e quantità per reparto.
Retour au tableau de bord|Back to dashboard|العودة إلى لوحة المتابعة|返回看板|Torna alla dashboard
Gestion des contrôles de lots|Lot inspection management|إدارة مراقبة الدفعات|批次检验管理|Gestione controlli lotti
Sauvegarde locale|Local storage|حفظ محلي|本地保存|Salvataggio locale
Transférer {count} contrôle(s) local(aux)|Transfer {count} local inspection(s)|نقل {count} فحص محلي|传输 {count} 条本地检验|Trasferisci {count} controlli locali
Les contrôles LOT sont conservés uniquement dans ce navigateur. Pour les partager, exécutez supabase-lot-inspections.sql dans Supabase, puis actualisez.|LOT inspections are stored only in this browser. To share them, run supabase-lot-inspections.sql in Supabase, then refresh.|تُحفظ فحوص الدفعات في هذا المتصفح فقط. لمشاركتها، نفّذ supabase-lot-inspections.sql في Supabase ثم حدّث.|LOT 检验仅保存在此浏览器。要共享，请在 Supabase 执行 supabase-lot-inspections.sql，然后刷新。|I controlli LOT sono salvati solo in questo browser. Per condividerli, esegui supabase-lot-inspections.sql in Supabase, poi aggiorna.
Nouveau contrôle|New inspection|فحص جديد|新建检验|Nuovo controllo
Modifier le contrôle|Edit inspection|تعديل الفحص|编辑检验|Modifica controllo
Numéro de lot|Lot number|رقم الدفعة|批号|Numero lotto
Quantité du lot|Lot quantity|كمية الدفعة|批次数量|Quantità lotto
Échantillonnage|Sample size|حجم العينة|抽样数量|Campionamento
Décision|Decision|القرار|判定|Decisione
Défaut|Defect|العيب|缺陷|Difetto
Défaut constaté|Observed defect|العيب المسجل|发现的缺陷|Difetto riscontrato
Nom du qualiticien|Quality inspector name|اسم مراقب الجودة|质检员姓名|Nome del controllore qualità
Choisir|Select|اختيار|选择|Seleziona
OK|OK|OK|OK|OK
NOK|NOK|NOK|NOK|NOK
Tri|Sorting|فرز|分拣|Cernita
Rebut|Scrap|إتلاف|报废|Scarto
Dérogation|Concession|قبول استثنائي|让步接收|Deroga
Modification|Editing|تعديل|编辑中|Modifica
Saisie|Entry|إدخال|录入|Inserimento
Modifier le lot {lot}|Edit lot {lot}|تعديل الدفعة {lot}|编辑批次 {lot}|Modifica lotto {lot}
Aucun lot contrôlé pour ce département sur ce mois.|No lots inspected for this department this month.|لا توجد دفعات مفحوصة لهذا القسم خلال هذا الشهر.|此部门本月尚无检验批次。|Nessun lotto controllato per questo reparto nel mese.
L’action et le défaut sont obligatoires uniquement pour une décision NOK.|Action and defect are required only for a NOK decision.|الإجراء والعيب مطلوبان فقط عند قرار NOK.|仅 NOK 判定需要填写措施和缺陷。|Azione e difetto sono obbligatori solo per una decisione NOK.
Enregistrer le contrôle|Save inspection|حفظ الفحص|保存检验|Salva controllo
Enregistrement…|Saving…|جارٍ الحفظ…|保存中…|Salvataggio…
Champs à vérifier|Fields to check|حقول يجب التحقق منها|请检查字段|Campi da verificare
Lots contrôlés|Inspected lots|الدفعات المفحوصة|已检批次|Lotti controllati
Bilan du jour|Daily summary|ملخص اليوم|当日汇总|Riepilogo giornaliero
Jour à analyser|Day to analyse|اليوم المراد تحليله|分析日期|Giorno da analizzare
Aujourd’hui|Today|اليوم|今天|Oggi
Nombre de lots|Number of lots|عدد الدفعات|批次数量|Numero di lotti
Quantités des lots|Lot quantities|كميات الدفعات|批次件数|Quantità dei lotti
Contrôlés|Inspected|المفحوصة|已检|Controllati
Acceptés|Accepted|المقبولة|已接受|Accettati
Rejetés|Rejected|المرفوضة|已拒收|Rifiutati
Aucun lot contrôlé pour ce département ce jour.|No lots inspected for this department on this day.|لا توجد دفعات مفحوصة لهذا القسم في هذا اليوم.|此部门当天没有检验批次。|Nessun lotto controllato per questo reparto in questo giorno.
Acceptés = OK ; rejetés = NOK. Les quantités portent sur les lots entiers, hors échantillonnage.|Accepted = OK; rejected = NOK. Quantities cover whole lots, excluding sample sizes.|المقبولة = OK؛ المرفوضة = NOK. تشمل الكميات الدفعات كاملة دون احتساب أحجام العينات.|接受 = OK；拒收 = NOK。数量按整批计算，不使用抽样数量。|Accettati = OK; rifiutati = NOK. Le quantità riguardano i lotti interi, senza usare il campionamento.
Évolution des quantités|Quantity trends|تطور الكميات|数量趋势|Andamento quantità
Évolution des blocages|Blocked quantity trend|تطور الكميات المحجوزة|冻结数量趋势|Andamento dei blocchi
Quantité bloquée du mois|Blocked quantity this month|الكمية المحجوزة خلال الشهر|本月冻结数量|Quantità bloccata del mese
Quantité des lots NOK par jour, du premier au dernier jour du mois. Les jours sans blocage sont affichés à zéro.|Daily NOK lot quantity from the first to the last day of the month. Days without blocked lots are shown as zero.|كمية دفعات NOK يوميًا من أول يوم إلى آخر يوم في الشهر. تُعرض الأيام دون حجز بقيمة صفر.|从月初到月末的每日 NOK 批次数量。没有冻结批次的日期显示为零。|Quantità giornaliera dei lotti NOK dal primo all’ultimo giorno del mese. I giorni senza blocchi sono visualizzati a zero.
Aucun lot bloqué pour ce département sur ce mois.|No blocked lots for this department this month.|لا توجد دفعات محجوزة لهذا القسم خلال هذا الشهر.|此部门本月没有冻结批次。|Nessun lotto bloccato per questo reparto nel mese.
Quantité contrôlée|Inspected quantity|الكمية المفحوصة|已检数量|Quantità controllata
Quantité conforme|Conforming quantity|الكمية المطابقة|合格数量|Quantità conforme
Quantité bloquée|Blocked quantity|الكمية المحجوزة|冻结数量|Quantità bloccata
Un lot OK est entièrement conforme ; un lot NOK est entièrement bloqué. L’échantillonnage est suivi séparément.|An OK lot is fully conforming; a NOK lot is fully blocked. Sample size is tracked separately.|دفعة OK مطابقة بالكامل؛ ودفعة NOK محجوزة بالكامل. يُتابَع حجم العينة بشكل منفصل.|OK 批次全部合格；NOK 批次全部冻结。抽样数量单独跟踪。|Un lotto OK è interamente conforme; un lotto NOK è interamente bloccato. Il campionamento è seguito separatamente.
La quantité du lot doit être un entier supérieur à zéro.|Lot quantity must be a positive whole number.|يجب أن تكون كمية الدفعة عددًا صحيحًا أكبر من صفر.|批次数量必须是正整数。|La quantità del lotto deve essere un intero positivo.
L’échantillonnage doit être compris entre 1 et la quantité du lot.|Sample size must be between 1 and the lot quantity.|يجب أن يكون حجم العينة بين 1 وكمية الدفعة.|抽样数量必须介于 1 和批次数量之间。|Il campionamento deve essere compreso tra 1 e la quantità del lotto.
Ce lot existe déjà pour cet OF et cette référence. Modifiez le contrôle existant.|This lot already exists for this work order and reference. Edit the existing inspection.|هذه الدفعة موجودة لهذا الأمر والمرجع. عدّل الفحص الموجود.|此工单和产品编号已有该批次，请编辑已有检验。|Il lotto esiste già per questo ordine e riferimento. Modifica il controllo esistente.
Contrôle enregistré dans Supabase.|Inspection saved in Supabase.|تم حفظ الفحص في Supabase.|检验已保存到 Supabase。|Controllo salvato in Supabase.
Contrôle enregistré dans ce navigateur.|Inspection saved in this browser.|تم حفظ الفحص في هذا المتصفح.|检验已保存在此浏览器。|Controllo salvato in questo browser.
Les contrôles locaux ont été transférés dans Supabase.|Local inspections were transferred to Supabase.|تم نقل الفحوص المحلية إلى Supabase.|本地检验已传输到 Supabase。|I controlli locali sono stati trasferiti in Supabase.
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
