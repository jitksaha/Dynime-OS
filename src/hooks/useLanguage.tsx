import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Language = "en" | "bn" | "es" | "fr" | "ar" | "hi" | "pt" | "zh" | "ja" | "de";

export const LANGUAGES: { code: Language; label: string; nativeLabel: string; dir?: "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
];

type TranslationEntry = Record<Language, string>;

interface Translations {
  [key: string]: TranslationEntry;
}

// Helper to build an entry concisely
function t10(en: string, bn: string, es: string, fr: string, de: string, pt: string, hi: string, ar: string, zh: string, ja: string): TranslationEntry {
  return { en, bn, es, fr, de, pt, hi, ar, zh, ja };
}

const translations: Translations = {
  // Navbar & Layout
  "dashboard": t10("Dashboard","ড্যাশবোর্ড","Panel","Tableau de bord","Dashboard","Painel","डैशबोर्ड","لوحة التحكم","仪表盘","ダッシュボード"),
  "notifications": t10("Notifications","বিজ্ঞপ্তি","Notificaciones","Notifications","Benachrichtigungen","Notificações","सूचनाएं","الإشعارات","通知","通知"),
  "settings": t10("Settings","সেটিংস","Configuración","Paramètres","Einstellungen","Configurações","सेटिंग्स","الإعدادات","设置","設定"),
  "search": t10("Search","অনুসন্ধান","Buscar","Rechercher","Suchen","Pesquisar","खोजें","بحث","搜索","検索"),
  "profile": t10("Profile","প্রোফাইল","Perfil","Profil","Profil","Perfil","प्रोफ़ाइल","الملف الشخصي","个人资料","プロフィール"),
  "sign_out": t10("Sign Out","সাইন আউট","Cerrar sesión","Déconnexion","Abmelden","Sair","साइन आउट","تسجيل الخروج","退出","サインアウト"),
  "my_profile": t10("My Profile","আমার প্রোফাইল","Mi perfil","Mon profil","Mein Profil","Meu perfil","मेरा प्रोफ़ाइल","ملفي الشخصي","我的资料","マイプロフィール"),
  "account_settings": t10("Account Settings","অ্যাকাউন্ট সেটিংস","Configuración de cuenta","Paramètres du compte","Kontoeinstellungen","Configurações da conta","खाता सेटिंग्स","إعدادات الحساب","账户设置","アカウント設定"),
  "my_subscription": t10("My Subscription","আমার সাবস্ক্রিপশন","Mi suscripción","Mon abonnement","Mein Abonnement","Minha assinatura","मेरी सदस्यता","اشتراكي","我的订阅","マイサブスクリプション"),
  "manage_account": t10("Manage your account","আপনার অ্যাকাউন্ট পরিচালনা করুন","Gestionar su cuenta","Gérer votre compte","Konto verwalten","Gerenciar sua conta","अपना खाता प्रबंधित करें","إدارة حسابك","管理您的账户","アカウントを管理"),

  // Sidebar modules
  "hrms": t10("HRM","এইচআরএম","RRHH","GRH","HRM","RH","एचआरएम","الموارد البشرية","人力资源","人事管理"),
  "crm": t10("CRM","সিআরএম","CRM","CRM","CRM","CRM","सीआरएम","إدارة العملاء","客户管理","CRM"),
  "marketing": t10("Marketing","মার্কেটিং","Marketing","Marketing","Marketing","Marketing","मार्केटिंग","التسويق","营销","マーケティング"),
  "workflows": t10("Workflows","ওয়ার্কফ্লো","Flujos de trabajo","Flux de travail","Workflows","Fluxos de trabalho","वर्कफ़्लो","سير العمل","工作流","ワークフロー"),
  "accounting": t10("Accounting","হিসাবরক্ষণ","Contabilidad","Comptabilité","Buchhaltung","Contabilidade","लेखांकन","المحاسبة","会计","会計"),
  "helpdesk": t10("Helpdesk","হেল্পডেস্ক","Mesa de ayuda","Support","Helpdesk","Suporte","हेल्पडेस्क","مكتب المساعدة","服务台","ヘルプデスク"),
  "projects": t10("Projects","প্রকল্প","Proyectos","Projets","Projekte","Projetos","प्रोजेक्ट","المشاريع","项目","プロジェクト"),
  "documents": t10("Documents","ডকুমেন্টস","Documentos","Documents","Dokumente","Documentos","दस्तावेज़","المستندات","文档","ドキュメント"),
  "reports": t10("Reports","রিপোর্ট","Informes","Rapports","Berichte","Relatórios","रिपोर्ट","التقارير","报告","レポート"),
  "subscription": t10("Subscription","সাবস্ক্রিপশন","Suscripción","Abonnement","Abonnement","Assinatura","सदस्यता","الاشتراك","订阅","サブスクリプション"),
  "employees": t10("Employees","কর্মচারী","Empleados","Employés","Mitarbeiter","Funcionários","कर्मचारी","الموظفون","员工","従業員"),
  "attendance": t10("Attendance","উপস্থিতি","Asistencia","Présence","Anwesenheit","Presença","उपस्थिति","الحضور","考勤","出勤"),
  "leave": t10("Leave","ছুটি","Licencia","Congé","Urlaub","Licença","छुट्टी","الإجازة","请假","休暇"),
  "payroll": t10("Payroll","পে-রোল","Nómina","Paie","Gehaltsabrechnung","Folha de pagamento","पेरोल","الرواتب","工资单","給与"),
  "recruitment": t10("Recruitment","নিয়োগ","Reclutamiento","Recrutement","Rekrutierung","Recrutamento","भर्ती","التوظيف","招聘","採用"),
  "performance": t10("Performance","পারফরম্যান্স","Rendimiento","Performance","Leistung","Desempenho","प्रदर्शन","الأداء","绩效","パフォーマンス"),
  "campaigns": t10("Campaigns","ক্যাম্পেইন","Campañas","Campagnes","Kampagnen","Campanhas","अभियान","الحملات","活动","キャンペーン"),
  "templates": t10("Templates","টেমপ্লেট","Plantillas","Modèles","Vorlagen","Modelos","टेम्पलेट","القوالب","模板","テンプレート"),
  "analytics": t10("Analytics","বিশ্লেষণ","Analítica","Analytique","Analytik","Análise","विश्लेषण","التحليلات","分析","アナリティクス"),
  "invoices": t10("Invoices","চালান","Facturas","Factures","Rechnungen","Faturas","चालान","الفواتير","发票","請求書"),
  "expenses": t10("Expenses","ব্যয়","Gastos","Dépenses","Ausgaben","Despesas","व्यय","المصروفات","费用","経費"),
  "payments": t10("Payments","পেমেন্ট","Pagos","Paiements","Zahlungen","Pagamentos","भुगतान","المدفوعات","付款","支払い"),
  "portals": t10("Portals","পোর্টাল","Portales","Portails","Portale","Portais","पोर्टल","البوابات","门户","ポータル"),
  "customer_portal": t10("Customer Portal","গ্রাহক পোর্টাল","Portal de cliente","Portail client","Kundenportal","Portal do cliente","ग्राहक पोर्टल","بوابة العملاء","客户门户","カスタマーポータル"),
  "employee_portal": t10("Employee Portal","কর্মচারী পোর্টাল","Portal de empleado","Portail employé","Mitarbeiterportal","Portal do funcionário","कर्मचारी पोर्टल","بوابة الموظفين","员工门户","従業員ポータル"),

  // Dashboard
  "welcome_back": t10("Welcome back","স্বাগতম","Bienvenido de nuevo","Bon retour","Willkommen zurück","Bem-vindo de volta","वापसी पर स्वागत","مرحبًا بعودتك","欢迎回来","おかえりなさい"),
  "dashboard_subtitle": t10("Here's what's happening across your organization.","আপনার প্রতিষ্ঠানে কী চলছে তা এখানে দেখুন।","Esto es lo que está pasando en su organización.","Voici ce qui se passe dans votre organisation.","Hier ist, was in Ihrer Organisation passiert.","Veja o que está acontecendo na sua organização.","आपके संगठन में क्या हो रहा है।","إليك ما يحدث في مؤسستك.","以下是您组织中正在发生的事情。","組織全体の状況です。"),
  "total_employees": t10("Total Employees","মোট কর্মচারী","Total empleados","Total employés","Mitarbeiter gesamt","Total de funcionários","कुल कर्मचारी","إجمالي الموظفين","员工总数","従業員総数"),
  "active_deals": t10("Active Deals","সক্রিয় চুক্তি","Tratos activos","Affaires actives","Aktive Deals","Negócios ativos","सक्रिय सौदे","الصفقات النشطة","活跃交易","アクティブな取引"),
  "revenue_paid": t10("Revenue (Paid)","রাজস্ব (প্রাপ্ত)","Ingresos (Pagados)","Revenus (Payés)","Umsatz (Bezahlt)","Receita (Paga)","राजस्व (भुगतान)","الإيرادات (المدفوعة)","收入（已付）","収益（支払済）"),
  "open_tickets": t10("Open Tickets","খোলা টিকেট","Tickets abiertos","Tickets ouverts","Offene Tickets","Tickets abertos","खुले टिकट","التذاكر المفتوحة","未解决工单","オープンチケット"),
  "add_employee": t10("Add Employee","কর্মচারী যোগ করুন","Añadir empleado","Ajouter un employé","Mitarbeiter hinzufügen","Adicionar funcionário","कर्मचारी जोड़ें","إضافة موظف","添加员工","従業員を追加"),
  "new_deal": t10("New Deal","নতুন চুক্তি","Nuevo trato","Nouvelle affaire","Neuer Deal","Novo negócio","नया सौदा","صفقة جديدة","新交易","新規取引"),
  "create_invoice": t10("Create Invoice","চালান তৈরি করুন","Crear factura","Créer une facture","Rechnung erstellen","Criar fatura","चालान बनाएं","إنشاء فاتورة","创建发票","請求書を作成"),
  "view_reports": t10("View Reports","রিপোর্ট দেখুন","Ver informes","Voir les rapports","Berichte anzeigen","Ver relatórios","रिपोर्ट देखें","عرض التقارير","查看报告","レポートを表示"),
  "kpi_widgets": t10("KPI Widgets","কেপিআই উইজেট","Widgets KPI","Widgets KPI","KPI-Widgets","Widgets KPI","केपीआई विजेट","أدوات KPI","KPI小部件","KPIウィジェット"),
  "customize": t10("Customize","কাস্টমাইজ","Personalizar","Personnaliser","Anpassen","Personalizar","कस्टमाइज़","تخصيص","自定义","カスタマイズ"),
  "done": t10("Done","সম্পন্ন","Hecho","Terminé","Fertig","Concluído","हो गया","تم","完成","完了"),
  "todays_attendance": t10("Today's Attendance","আজকের উপস্থিতি","Asistencia de hoy","Présence du jour","Heutige Anwesenheit","Presença de hoje","आज की उपस्थिति","حضور اليوم","今日考勤","本日の出勤"),
  "active_projects": t10("Active Projects","সক্রিয় প্রকল্প","Proyectos activos","Projets actifs","Aktive Projekte","Projetos ativos","सक्रिय प्रोजेक्ट","المشاريع النشطة","活跃项目","アクティブプロジェクト"),
  "pending_invoices": t10("Pending Invoices","মুলতুবি চালান","Facturas pendientes","Factures en attente","Offene Rechnungen","Faturas pendentes","लंबित चालान","الفواتير المعلقة","待处理发票","未処理の請求書"),
  "active_campaigns": t10("Active Campaigns","সক্রিয় ক্যাম্পেইন","Campañas activas","Campagnes actives","Aktive Kampagnen","Campanhas ativas","सक्रिय अभियान","الحملات النشطة","活跃活动","アクティブキャンペーン"),

  // Notifications
  "mark_all_read": t10("Mark all as read","সব পঠিত হিসাবে চিহ্নিত করুন","Marcar todo como leído","Tout marquer comme lu","Alle als gelesen markieren","Marcar tudo como lido","सभी को पढ़ा हुआ चिह्नित करें","تحديد الكل كمقروء","全部标为已读","すべて既読にする"),
  "no_notifications": t10("No notifications","কোনো বিজ্ঞপ্তি নেই","Sin notificaciones","Aucune notification","Keine Benachrichtigungen","Sem notificações","कोई सूचना नहीं","لا توجد إشعارات","没有通知","通知はありません"),
  "recent_notifications": t10("Recent Notifications","সাম্প্রতিক বিজ্ঞপ্তি","Notificaciones recientes","Notifications récentes","Neueste Benachrichtigungen","Notificações recentes","हाल की सूचनाएं","الإشعارات الأخيرة","最近通知","最近の通知"),

  // AI Insights
  "ai_insights": t10("AI Business Insights","এআই ব্যবসায়িক অন্তর্দৃষ্টি","Insights de IA","Insights IA","KI-Einblicke","Insights de IA","एआई बिज़नेस इनसाइट्स","رؤى الأعمال بالذكاء الاصطناعي","AI商业洞察","AIビジネスインサイト"),
  "generate_insights": t10("Generate Insights","অন্তর্দৃষ্টি তৈরি করুন","Generar insights","Générer des insights","Einblicke generieren","Gerar insights","इनसाइट्स जेनरेट करें","إنشاء رؤى","生成洞察","インサイトを生成"),
  "analyzing": t10("Analyzing your business data...","আপনার ব্যবসার ডেটা বিশ্লেষণ করা হচ্ছে...","Analizando sus datos...","Analyse de vos données...","Daten werden analysiert...","Analisando seus dados...","आपके डेटा का विश्लेषण...","جاري تحليل بياناتك...","正在分析您的数据...","データを分析中..."),

  // Payment history
  "payment_history": t10("Payment History","পেমেন্ট ইতিহাস","Historial de pagos","Historique des paiements","Zahlungshistorie","Histórico de pagamentos","भुगतान इतिहास","سجل المدفوعات","付款记录","支払い履歴"),
  "download_receipt": t10("Download Receipt","রসিদ ডাউনলোড করুন","Descargar recibo","Télécharger le reçu","Beleg herunterladen","Baixar recibo","रसीद डाउनलोड करें","تحميل الإيصال","下载收据","領収書をダウンロード"),

  // CRM
  "sales_pipeline": t10("Sales Pipeline","সেলস পাইপলাইন","Pipeline de ventas","Pipeline de ventes","Vertriebspipeline","Pipeline de vendas","सेल्स पाइपलाइन","خط أنابيب المبيعات","销售管道","セールスパイプライン"),
  "drag_deals": t10("Drag deals between stages to update","স্টেজ পরিবর্তন করতে চুক্তি টেনে আনুন","Arrastre tratos entre etapas","Glissez les affaires entre les étapes","Deals zwischen Stufen ziehen","Arraste negócios entre etapas","डील को स्टेज के बीच ड्रैग करें","اسحب الصفقات بين المراحل","拖动交易到不同阶段","ステージ間で取引をドラッグ"),
  "create_new_deal": t10("Create New Deal","নতুন চুক্তি তৈরি করুন","Crear nuevo trato","Créer une nouvelle affaire","Neuen Deal erstellen","Criar novo negócio","नया सौदा बनाएं","إنشاء صفقة جديدة","创建新交易","新規取引を作成"),
  "company_name": t10("Company Name","কোম্পানির নাম","Nombre de empresa","Nom de l'entreprise","Firmenname","Nome da empresa","कंपनी का नाम","اسم الشركة","公司名称","会社名"),
  "contact_person": t10("Contact Person","যোগাযোগ ব্যক্তি","Persona de contacto","Personne de contact","Kontaktperson","Pessoa de contato","संपर्क व्यक्ति","شخص الاتصال","联系人","担当者"),
  "deal_value": t10("Deal Value ($)","চুক্তির মূল্য ($)","Valor del trato ($)","Valeur de l'affaire ($)","Deal-Wert ($)","Valor do negócio ($)","सौदे का मूल्य ($)","قيمة الصفقة ($)","交易价值 ($)","取引額 ($)"),
  "stage": t10("Stage","স্টেজ","Etapa","Étape","Stufe","Etapa","स्टेज","المرحلة","阶段","ステージ"),
  "leads": t10("Leads","লিডস","Leads","Prospects","Leads","Leads","लीड्स","العملاء المحتملون","线索","リード"),
  "qualified": t10("Qualified","যোগ্য","Calificado","Qualifié","Qualifiziert","Qualificado","योग्य","مؤهل","合格","適格"),
  "proposal": t10("Proposal","প্রস্তাব","Propuesta","Proposition","Angebot","Proposta","प्रस्ताव","عرض","提案","提案"),
  "negotiation": t10("Negotiation","আলোচনা","Negociación","Négociation","Verhandlung","Negociação","बातचीत","تفاوض","谈判","交渉"),
  "won": t10("Won","জিতেছে","Ganado","Gagné","Gewonnen","Ganho","जीता","فاز","赢得","成約"),
  "no_deals": t10("No deals yet. Create your first deal to get started.","এখনো কোনো চুক্তি নেই। শুরু করতে আপনার প্রথম চুক্তি তৈরি করুন।","Aún no hay tratos. Cree su primer trato para comenzar.","Aucune affaire. Créez votre première affaire.","Noch keine Deals. Erstellen Sie Ihren ersten Deal.","Nenhum negócio ainda. Crie seu primeiro negócio.","अभी कोई सौदा नहीं। शुरू करने के लिए पहला सौदा बनाएं।","لا توجد صفقات بعد. أنشئ أول صفقة.","还没有交易。创建您的第一笔交易。","まだ取引がありません。最初の取引を作成しましょう。"),
  "deal_created": t10("Deal created","চুক্তি তৈরি হয়েছে","Trato creado","Affaire créée","Deal erstellt","Negócio criado","सौदा बनाया गया","تم إنشاء الصفقة","交易已创建","取引を作成しました"),
  "failed_update_stage": t10("Failed to update deal stage","চুক্তির স্টেজ আপডেট করতে ব্যর্থ","Error al actualizar la etapa","Échec de la mise à jour","Aktualisierung fehlgeschlagen","Falha ao atualizar etapa","स्टेज अपडेट विफल","فشل تحديث المرحلة","更新阶段失败","ステージの更新に失敗"),

  // HRMS
  "employee_directory": t10("Employee Directory","কর্মচারী তালিকা","Directorio de empleados","Répertoire des employés","Mitarbeiterverzeichnis","Diretório de funcionários","कर्मचारी निर्देशिका","دليل الموظفين","员工目录","従業員名簿"),
  "manage_employees": t10("Manage your organization's employees","আপনার প্রতিষ্ঠানের কর্মচারী পরিচালনা করুন","Gestione los empleados de su organización","Gérez les employés de votre organisation","Verwalten Sie die Mitarbeiter","Gerencie os funcionários da sua organização","अपने संगठन के कर्मचारियों को प्रबंधित करें","إدارة موظفي مؤسستك","管理您组织的员工","組織の従業員を管理"),
  "add_new_employee": t10("Add New Employee","নতুন কর্মচারী যোগ করুন","Añadir nuevo empleado","Ajouter un nouvel employé","Neuen Mitarbeiter hinzufügen","Adicionar novo funcionário","नया कर्मचारी जोड़ें","إضافة موظف جديد","添加新员工","新規従業員を追加"),
  "full_name": t10("Full Name","পুরো নাম","Nombre completo","Nom complet","Vollständiger Name","Nome completo","पूरा नाम","الاسم الكامل","全名","氏名"),
  "email": t10("Email","ইমেইল","Correo electrónico","E-mail","E-Mail","E-mail","ईमेल","البريد الإلكتروني","电子邮件","メール"),
  "phone": t10("Phone","ফোন","Teléfono","Téléphone","Telefon","Telefone","फ़ोन","الهاتف","电话","電話"),
  "department": t10("Department","বিভাগ","Departamento","Département","Abteilung","Departamento","विभाग","القسم","部门","部署"),
  "job_title": t10("Job Title","পদবী","Cargo","Poste","Berufsbezeichnung","Cargo","पदनाम","المسمى الوظيفي","职位","役職"),
  "salary": t10("Salary","বেতন","Salario","Salaire","Gehalt","Salário","वेतन","الراتب","薪资","給与"),
  "hire_date": t10("Hire Date","নিয়োগের তারিখ","Fecha de contratación","Date d'embauche","Einstellungsdatum","Data de contratação","नियुक्ति तिथि","تاريخ التوظيف","入职日期","入社日"),
  "active": t10("Active","সক্রিয়","Activo","Actif","Aktiv","Ativo","सक्रिय","نشط","活跃","アクティブ"),
  "inactive": t10("Inactive","নিষ্ক্রিয়","Inactivo","Inactif","Inaktiv","Inativo","निष्क्रिय","غير نشط","不活跃","非アクティブ"),
  "on_leave": t10("On Leave","ছুটিতে","De licencia","En congé","Im Urlaub","De licença","छुट्टी पर","في إجازة","休假中","休暇中"),

  // Attendance
  "attendance_records": t10("Attendance Records","উপস্থিতির রেকর্ড","Registros de asistencia","Registres de présence","Anwesenheitsaufzeichnungen","Registros de presença","उपस्थिति रिकॉर्ड","سجلات الحضور","考勤记录","出勤記録"),
  "mark_attendance": t10("Mark Attendance","উপস্থিতি চিহ্নিত করুন","Marcar asistencia","Marquer la présence","Anwesenheit markieren","Marcar presença","उपस्थिति दर्ज करें","تسجيل الحضور","标记考勤","出勤を記録"),
  "check_in": t10("Check In","চেক ইন","Entrada","Pointage entrée","Einstempeln","Entrada","चेक इन","تسجيل الدخول","签到","チェックイン"),
  "check_out": t10("Check Out","চেক আউট","Salida","Pointage sortie","Ausstempeln","Saída","चेक आउट","تسجيل الخروج","签退","チェックアウト"),
  "present": t10("Present","উপস্থিত","Presente","Présent","Anwesend","Presente","उपस्थित","حاضر","出勤","出席"),
  "absent": t10("Absent","অনুপস্থিত","Ausente","Absent","Abwesend","Ausente","अनुपस्थित","غائب","缺勤","欠席"),
  "late": t10("Late","বিলম্বিত","Tarde","En retard","Verspätet","Atrasado","देरी","متأخر","迟到","遅刻"),
  "half_day": t10("Half Day","অর্ধ দিবস","Medio día","Demi-journée","Halber Tag","Meio dia","आधा दिन","نصف يوم","半天","半日"),

  // Leave Management
  "leave_management": t10("Leave Management","ছুটি ব্যবস্থাপনা","Gestión de licencias","Gestion des congés","Urlaubsverwaltung","Gestão de licenças","छुट्टी प्रबंधन","إدارة الإجازات","请假管理","休暇管理"),
  "apply_leave": t10("Apply Leave","ছুটির আবেদন","Solicitar licencia","Demander un congé","Urlaub beantragen","Solicitar licença","छुट्टी के लिए आवेदन","طلب إجازة","申请请假","休暇を申請"),
  "leave_type": t10("Leave Type","ছুটির ধরন","Tipo de licencia","Type de congé","Urlaubsart","Tipo de licença","छुट्टी का प्रकार","نوع الإجازة","请假类型","休暇種類"),
  "from_date": t10("From Date","শুরুর তারিখ","Desde","Date de début","Von","De","से तिथि","من تاريخ","开始日期","開始日"),
  "to_date": t10("To Date","শেষের তারিখ","Hasta","Date de fin","Bis","Até","तक तिथि","إلى تاريخ","结束日期","終了日"),
  "reason": t10("Reason","কারণ","Motivo","Raison","Grund","Motivo","कारण","السبب","原因","理由"),
  "approved": t10("Approved","অনুমোদিত","Aprobado","Approuvé","Genehmigt","Aprovado","अनुमोदित","موافق عليه","已批准","承認済み"),
  "pending": t10("Pending","মুলতুবি","Pendiente","En attente","Ausstehend","Pendente","लंबित","معلق","待处理","保留中"),
  "rejected": t10("Rejected","প্রত্যাখ্যাত","Rechazado","Rejeté","Abgelehnt","Rejeitado","अस्वीकृत","مرفوض","已拒绝","却下"),
  "casual_leave": t10("Casual Leave","নৈমিত্তিক ছুটি","Licencia casual","Congé occasionnel","Sonderurlaub","Licença casual","आकस्मिक छुट्टी","إجازة عرضية","事假","特別休暇"),
  "sick_leave": t10("Sick Leave","অসুস্থতার ছুটি","Licencia por enfermedad","Congé maladie","Krankheitsurlaub","Licença médica","बीमारी की छुट्टी","إجازة مرضية","病假","病気休暇"),
  "annual_leave": t10("Annual Leave","বার্ষিক ছুটি","Vacaciones anuales","Congé annuel","Jahresurlaub","Férias anuais","वार्षिक छुट्टी","إجازة سنوية","年假","年次休暇"),

  // Payroll
  "payroll_management": t10("Payroll Management","পে-রোল ব্যবস্থাপনা","Gestión de nómina","Gestion de la paie","Gehaltsabrechnung","Gestão de folha","पेरोल प्रबंधन","إدارة الرواتب","工资管理","給与管理"),
  "basic_salary": t10("Basic Salary","মূল বেতন","Salario base","Salaire de base","Grundgehalt","Salário base","मूल वेतन","الراتب الأساسي","基本工资","基本給"),
  "allowances": t10("Allowances","ভাতা","Subsidios","Indemnités","Zulagen","Subsídios","भत्ते","البدلات","津贴","手当"),
  "deductions": t10("Deductions","কর্তন","Deducciones","Déductions","Abzüge","Deduções","कटौतियां","الخصومات","扣除","控除"),
  "net_pay": t10("Net Pay","নিট বেতন","Pago neto","Salaire net","Nettogehalt","Pagamento líquido","शुद्ध वेतन","صافي الراتب","实发工资","手取り"),
  "pay_period": t10("Pay Period","বেতনের সময়কাল","Período de pago","Période de paie","Zahlungszeitraum","Período de pagamento","वेतन अवधि","فترة الدفع","工资周期","支払期間"),
  "processed": t10("Processed","প্রক্রিয়াকৃত","Procesado","Traité","Verarbeitet","Processado","संसाधित","تمت المعالجة","已处理","処理済み"),

  // Recruitment
  "recruitment_management": t10("Recruitment","নিয়োগ","Reclutamiento","Recrutement","Rekrutierung","Recrutamento","भर्ती","التوظيف","招聘","採用"),
  "post_job": t10("Post Job","চাকরি পোস্ট করুন","Publicar empleo","Publier une offre","Stelle ausschreiben","Publicar vaga","जॉब पोस्ट करें","نشر وظيفة","发布职位","求人を投稿"),
  "job_title_label": t10("Job Title","পদের নাম","Cargo","Poste","Berufsbezeichnung","Cargo","पदनाम","المسمى الوظيفي","职位名称","職種"),
  "location": t10("Location","অবস্থান","Ubicación","Lieu","Standort","Localização","स्थान","الموقع","地点","勤務地"),
  "applicants": t10("Applicants","আবেদনকারী","Candidatos","Candidats","Bewerber","Candidatos","आवेदक","المتقدمون","申请人","応募者"),
  "shortlisted": t10("Shortlisted","সংক্ষিপ্ত তালিকাভুক্ত","Preseleccionado","Présélectionné","Engere Auswahl","Pré-selecionado","शॉर्टलिस्ट","مدرج في القائمة المختصرة","入围","候補者"),
  "full_time": t10("Full-time","পূর্ণকালীন","Tiempo completo","Temps plein","Vollzeit","Tempo integral","पूर्णकालिक","دوام كامل","全职","フルタイム"),
  "part_time": t10("Part-time","খণ্ডকালীন","Medio tiempo","Temps partiel","Teilzeit","Meio período","अंशकालिक","دوام جزئي","兼职","パートタイム"),
  "contract": t10("Contract","চুক্তিভিত্তিক","Contrato","Contrat","Vertrag","Contrato","अनुबंध","عقد","合同","契約"),

  // Performance
  "performance_reviews": t10("Performance Reviews","কর্মক্ষমতা পর্যালোচনা","Evaluaciones de rendimiento","Évaluations de performance","Leistungsbeurteilungen","Avaliações de desempenho","प्रदर्शन समीक्षा","مراجعات الأداء","绩效评估","パフォーマンスレビュー"),
  "review_period": t10("Review Period","পর্যালোচনার সময়কাল","Período de evaluación","Période d'évaluation","Beurteilungszeitraum","Período de avaliação","समीक्षा अवधि","فترة المراجعة","评估周期","レビュー期間"),
  "rating": t10("Rating","রেটিং","Calificación","Évaluation","Bewertung","Avaliação","रेटिंग","التقييم","评分","評価"),
  "goals_completed": t10("Goals Completed","সম্পন্ন লক্ষ্য","Objetivos completados","Objectifs atteints","Ziele erreicht","Metas concluídas","लक्ष्य पूर्ण","الأهداف المكتملة","已完成目标","達成目標"),
  "feedback": t10("Feedback","মতামত","Comentarios","Retour","Feedback","Feedback","प्रतिक्रिया","ملاحظات","反馈","フィードバック"),

  // Accounting - Invoices
  "invoice_management": t10("Invoice Management","চালান ব্যবস্থাপনা","Gestión de facturas","Gestion des factures","Rechnungsverwaltung","Gestão de faturas","चालान प्रबंधन","إدارة الفواتير","发票管理","請求書管理"),
  "create_new_invoice": t10("Create New Invoice","নতুন চালান তৈরি করুন","Crear nueva factura","Créer une nouvelle facture","Neue Rechnung erstellen","Criar nova fatura","नया चालान बनाएं","إنشاء فاتورة جديدة","创建新发票","新規請求書を作成"),
  "invoice_number": t10("Invoice Number","চালান নম্বর","Número de factura","Numéro de facture","Rechnungsnummer","Número da fatura","चालान संख्या","رقم الفاتورة","发票编号","請求書番号"),
  "client": t10("Client","ক্লায়েন্ট","Cliente","Client","Kunde","Cliente","ग्राहक","العميل","客户","クライアント"),
  "issue_date": t10("Issue Date","ইস্যুর তারিখ","Fecha de emisión","Date d'émission","Ausstellungsdatum","Data de emissão","जारी तिथि","تاريخ الإصدار","开具日期","発行日"),
  "due_date": t10("Due Date","নির্ধারিত তারিখ","Fecha de vencimiento","Date d'échéance","Fälligkeitsdatum","Data de vencimento","देय तिथि","تاريخ الاستحقاق","到期日","期日"),
  "paid": t10("Paid","পরিশোধিত","Pagado","Payé","Bezahlt","Pago","भुगतान किया","مدفوع","已支付","支払済"),
  "overdue": t10("Overdue","মেয়াদোত্তীর্ণ","Vencido","En retard","Überfällig","Vencido","अतिदेय","متأخر","逾期","期限超過"),

  // Accounting - Expenses
  "expense_management": t10("Expense Management","ব্যয় ব্যবস্থাপনা","Gestión de gastos","Gestion des dépenses","Ausgabenverwaltung","Gestão de despesas","व्यय प्रबंधन","إدارة المصروفات","费用管理","経費管理"),
  "add_expense": t10("Add Expense","ব্যয় যোগ করুন","Añadir gasto","Ajouter une dépense","Ausgabe hinzufügen","Adicionar despesa","व्यय जोड़ें","إضافة مصروف","添加费用","経費を追加"),
  "category": t10("Category","বিভাগ","Categoría","Catégorie","Kategorie","Categoria","श्रेणी","الفئة","类别","カテゴリ"),
  "description": t10("Description","বিবরণ","Descripción","Description","Beschreibung","Descrição","विवरण","الوصف","描述","説明"),
  "receipt": t10("Receipt","রসিদ","Recibo","Reçu","Beleg","Recibo","रसीद","إيصال","收据","領収書"),

  // Accounting - Payments
  "payment_management": t10("Payment Management","পেমেন্ট ব্যবস্থাপনা","Gestión de pagos","Gestion des paiements","Zahlungsverwaltung","Gestão de pagamentos","भुगतान प्रबंधन","إدارة المدفوعات","付款管理","支払い管理"),
  "record_payment": t10("Record Payment","পেমেন্ট রেকর্ড করুন","Registrar pago","Enregistrer un paiement","Zahlung erfassen","Registrar pagamento","भुगतान दर्ज करें","تسجيل دفعة","记录付款","支払いを記録"),
  "payment_method": t10("Payment Method","পেমেন্ট পদ্ধতি","Método de pago","Moyen de paiement","Zahlungsmethode","Método de pagamento","भुगतान विधि","طريقة الدفع","付款方式","支払方法"),
  "payment_type": t10("Payment Type","পেমেন্ট ধরন","Tipo de pago","Type de paiement","Zahlungsart","Tipo de pagamento","भुगतान प्रकार","نوع الدفع","付款类型","支払いタイプ"),
  "counterparty": t10("Counterparty","পক্ষ","Contraparte","Contrepartie","Gegenpartei","Contraparte","प्रतिपक्ष","الطرف المقابل","交易方","取引先"),

  // Helpdesk
  "helpdesk_tickets": t10("Helpdesk Tickets","হেল্পডেস্ক টিকেট","Tickets de soporte","Tickets de support","Helpdesk-Tickets","Tickets de suporte","हेल्पडेस्क टिकट","تذاكر الدعم","服务工单","サポートチケット"),
  "create_ticket": t10("Create Ticket","টিকেট তৈরি করুন","Crear ticket","Créer un ticket","Ticket erstellen","Criar ticket","टिकट बनाएं","إنشاء تذكرة","创建工单","チケットを作成"),
  "subject": t10("Subject","বিষয়","Asunto","Sujet","Betreff","Assunto","विषय","الموضوع","主题","件名"),
  "priority": t10("Priority","অগ্রাধিকার","Prioridad","Priorité","Priorität","Prioridade","प्राथमिकता","الأولوية","优先级","優先度"),
  "assigned_to": t10("Assigned To","নিয়োগ করা হয়েছে","Asignado a","Assigné à","Zugewiesen an","Atribuído a","को सौंपा","مسند إلى","分配给","担当者"),
  "customer": t10("Customer","গ্রাহক","Cliente","Client","Kunde","Cliente","ग्राहक","العميل","客户","顧客"),
  "high": t10("High","উচ্চ","Alto","Élevé","Hoch","Alto","उच्च","عالي","高","高"),
  "medium": t10("Medium","মাঝারি","Medio","Moyen","Mittel","Médio","मध्यम","متوسط","中","中"),
  "low": t10("Low","নিম্ন","Bajo","Faible","Niedrig","Baixo","निम्न","منخفض","低","低"),
  "open": t10("Open","খোলা","Abierto","Ouvert","Offen","Aberto","खुला","مفتوح","打开","オープン"),
  "closed": t10("Closed","বন্ধ","Cerrado","Fermé","Geschlossen","Fechado","बंद","مغلق","关闭","クローズ"),
  "in_progress": t10("In Progress","চলমান","En progreso","En cours","In Bearbeitung","Em andamento","प्रगति में","قيد التنفيذ","进行中","進行中"),

  // Marketing
  "campaign_management": t10("Campaign Management","ক্যাম্পেইন ব্যবস্থাপনা","Gestión de campañas","Gestion des campagnes","Kampagnenverwaltung","Gestão de campanhas","अभियान प्रबंधन","إدارة الحملات","活动管理","キャンペーン管理"),
  "create_campaign": t10("Create Campaign","ক্যাম্পেইন তৈরি করুন","Crear campaña","Créer une campagne","Kampagne erstellen","Criar campanha","अभियान बनाएं","إنشاء حملة","创建活动","キャンペーンを作成"),
  "channel": t10("Channel","চ্যানেল","Canal","Canal","Kanal","Canal","चैनल","القناة","渠道","チャネル"),
  "budget": t10("Budget","বাজেট","Presupuesto","Budget","Budget","Orçamento","बजट","الميزانية","预算","予算"),
  "sent": t10("Sent","পাঠানো","Enviado","Envoyé","Gesendet","Enviado","भेजा गया","مرسل","已发送","送信済み"),
  "opened": t10("Opened","খোলা হয়েছে","Abierto","Ouvert","Geöffnet","Aberto","खोला गया","مفتوح","已打开","開封済み"),
  "clicked": t10("Clicked","ক্লিক করা হয়েছে","Clicado","Cliqué","Geklickt","Clicado","क्लिक किया","تم النقر","已点击","クリック済み"),
  "converted": t10("Converted","রূপান্তরিত","Convertido","Converti","Konvertiert","Convertido","रूपांतरित","محوّل","已转化","コンバート済み"),
  "email_templates": t10("Email Templates","ইমেইল টেমপ্লেট","Plantillas de correo","Modèles d'e-mail","E-Mail-Vorlagen","Modelos de e-mail","ईमेल टेम्पलेट","قوالب البريد","邮件模板","メールテンプレート"),
  "marketing_analytics": t10("Marketing Analytics","মার্কেটিং বিশ্লেষণ","Analítica de marketing","Analytique marketing","Marketing-Analytik","Análise de marketing","मार्केटिंग विश्लेषण","تحليلات التسويق","营销分析","マーケティング分析"),

  // Projects
  "project_management": t10("Project Management","প্রকল্প ব্যবস্থাপনা","Gestión de proyectos","Gestion de projets","Projektmanagement","Gestão de projetos","प्रोजेक्ट प्रबंधन","إدارة المشاريع","项目管理","プロジェクト管理"),
  "create_project": t10("Create Project","প্রকল্প তৈরি করুন","Crear proyecto","Créer un projet","Projekt erstellen","Criar projeto","प्रोजेक्ट बनाएं","إنشاء مشروع","创建项目","プロジェクトを作成"),
  "deadline": t10("Deadline","সময়সীমা","Fecha límite","Date limite","Frist","Prazo","समय सीमा","الموعد النهائي","截止日期","締切"),
  "progress": t10("Progress","অগ্রগতি","Progreso","Progrès","Fortschritt","Progresso","प्रगति","التقدم","进度","進捗"),
  "team_size": t10("Team Size","দলের আকার","Tamaño del equipo","Taille de l'équipe","Teamgröße","Tamanho da equipe","टीम का आकार","حجم الفريق","团队规模","チーム人数"),
  "tasks": t10("Tasks","কাজ","Tareas","Tâches","Aufgaben","Tarefas","कार्य","المهام","任务","タスク"),
  "completed": t10("Completed","সম্পন্ন","Completado","Terminé","Abgeschlossen","Concluído","पूर्ण","مكتمل","已完成","完了"),
  "not_started": t10("Not Started","শুরু হয়নি","No iniciado","Non commencé","Nicht begonnen","Não iniciado","शुरू नहीं हुआ","لم يبدأ","未开始","未着手"),

  // Documents
  "document_management": t10("Document Management","নথি ব্যবস্থাপনা","Gestión de documentos","Gestion des documents","Dokumentenverwaltung","Gestão de documentos","दस्तावेज़ प्रबंधन","إدارة المستندات","文档管理","ドキュメント管理"),
  "upload_document": t10("Upload Document","নথি আপলোড করুন","Subir documento","Télécharger un document","Dokument hochladen","Enviar documento","दस्तावेज़ अपलोड करें","رفع مستند","上传文档","ドキュメントをアップロード"),
  "file_name": t10("File Name","ফাইলের নাম","Nombre del archivo","Nom du fichier","Dateiname","Nome do arquivo","फ़ाइल का नाम","اسم الملف","文件名","ファイル名"),
  "file_type": t10("File Type","ফাইলের ধরন","Tipo de archivo","Type de fichier","Dateityp","Tipo de arquivo","फ़ाइल प्रकार","نوع الملف","文件类型","ファイルタイプ"),
  "file_size": t10("File Size","ফাইলের আকার","Tamaño del archivo","Taille du fichier","Dateigröße","Tamanho do arquivo","फ़ाइल आकार","حجم الملف","文件大小","ファイルサイズ"),
  "shared_with": t10("Shared With","শেয়ার করা হয়েছে","Compartido con","Partagé avec","Geteilt mit","Compartilhado com","के साथ साझा","مشترك مع","共享给","共有先"),

  // Workflows
  "workflow_management": t10("Workflow Management","ওয়ার্কফ্লো ব্যবস্থাপনা","Gestión de flujos","Gestion des flux","Workflow-Verwaltung","Gestão de fluxos","वर्कफ़्लो प्रबंधन","إدارة سير العمل","工作流管理","ワークフロー管理"),
  "create_workflow": t10("Create Workflow","ওয়ার্কফ্লো তৈরি করুন","Crear flujo","Créer un flux","Workflow erstellen","Criar fluxo","वर्कफ़्लो बनाएं","إنشاء سير عمل","创建工作流","ワークフローを作成"),
  "trigger_type": t10("Trigger Type","ট্রিগারের ধরন","Tipo de disparador","Type de déclencheur","Auslösertyp","Tipo de gatilho","ट्रिगर प्रकार","نوع المشغل","触发类型","トリガータイプ"),
  "total_runs": t10("Total Runs","মোট রান","Ejecuciones totales","Total d'exécutions","Gesamtläufe","Total de execuções","कुल रन","إجمالي التشغيلات","总运行次数","合計実行数"),
  "last_run": t10("Last Run","সর্বশেষ রান","Última ejecución","Dernière exécution","Letzter Lauf","Última execução","अंतिम रन","آخر تشغيل","上次运行","最終実行"),
  "steps": t10("Steps","ধাপ","Pasos","Étapes","Schritte","Passos","चरण","الخطوات","步骤","ステップ"),

  // General / Common
  "plan": t10("Plan","প্ল্যান","Plan","Plan","Plan","Plano","योजना","الخطة","方案","プラン"),
  "amount": t10("Amount","পরিমাণ","Monto","Montant","Betrag","Valor","राशि","المبلغ","金额","金額"),
  "cycle": t10("Cycle","চক্র","Ciclo","Cycle","Zyklus","Ciclo","चक्र","الدورة","周期","サイクル"),
  "date": t10("Date","তারিখ","Fecha","Date","Datum","Data","तिथि","التاريخ","日期","日付"),
  "status": t10("Status","স্ট্যাটাস","Estado","Statut","Status","Status","स्थिति","الحالة","状态","ステータス"),
  "loading": t10("Loading...","লোড হচ্ছে...","Cargando...","Chargement...","Laden...","Carregando...","लोड हो रहा है...","جاري التحميل...","加载中...","読み込み中..."),
  "save": t10("Save","সংরক্ষণ","Guardar","Enregistrer","Speichern","Salvar","सहेजें","حفظ","保存","保存"),
  "cancel": t10("Cancel","বাতিল","Cancelar","Annuler","Abbrechen","Cancelar","रद्द करें","إلغاء","取消","キャンセル"),
  "delete": t10("Delete","মুছুন","Eliminar","Supprimer","Löschen","Excluir","हटाएं","حذف","删除","削除"),
  "edit": t10("Edit","সম্পাদনা","Editar","Modifier","Bearbeiten","Editar","संपादित करें","تعديل","编辑","編集"),
  "actions": t10("Actions","কার্যক্রম","Acciones","Actions","Aktionen","Ações","कार्रवाइयां","الإجراءات","操作","アクション"),
  "name": t10("Name","নাম","Nombre","Nom","Name","Nome","नाम","الاسم","名称","名前"),
  "created_at": t10("Created At","তৈরির তারিখ","Creado el","Créé le","Erstellt am","Criado em","बनाया गया","تاريخ الإنشاء","创建于","作成日"),
  "updated_at": t10("Updated At","আপডেটের তারিখ","Actualizado el","Mis à jour le","Aktualisiert am","Atualizado em","अपडेट किया गया","تاريخ التحديث","更新于","更新日"),
  "no_data": t10("No data found","কোনো তথ্য পাওয়া যায়নি","No se encontraron datos","Aucune donnée trouvée","Keine Daten gefunden","Nenhum dado encontrado","कोई डेटा नहीं मिला","لا توجد بيانات","未找到数据","データがありません"),
  "export": t10("Export","রপ্তানি","Exportar","Exporter","Exportieren","Exportar","निर्यात","تصدير","导出","エクスポート"),
  "filter": t10("Filter","ফিল্টার","Filtrar","Filtrer","Filtern","Filtrar","फ़िल्टर","تصفية","筛选","フィルター"),
  "all": t10("All","সব","Todo","Tout","Alle","Todos","सभी","الكل","全部","すべて"),
  "view": t10("View","দেখুন","Ver","Voir","Ansehen","Ver","देखें","عرض","查看","表示"),
  "submit": t10("Submit","জমা দিন","Enviar","Soumettre","Absenden","Enviar","जमा करें","إرسال","提交","送信"),
  "confirm": t10("Confirm","নিশ্চিত করুন","Confirmar","Confirmer","Bestätigen","Confirmar","पुष्टि करें","تأكيد","确认","確認"),
  "back": t10("Back","পেছনে","Atrás","Retour","Zurück","Voltar","वापस","رجوع","返回","戻る"),
  "next": t10("Next","পরবর্তী","Siguiente","Suivant","Weiter","Próximo","अगला","التالي","下一步","次へ"),
  "yes": t10("Yes","হ্যাঁ","Sí","Oui","Ja","Sim","हां","نعم","是","はい"),
  "no": t10("No","না","No","Non","Nein","Não","नहीं","لا","否","いいえ"),

  // Super Admin Panel
  "super_admin_panel": t10("Super Admin Panel","সুপার অ্যাডমিন প্যানেল","Panel de Super Admin","Panneau Super Admin","Super-Admin-Panel","Painel Super Admin","सुपर एडमिन पैनल","لوحة المشرف الأعلى","超级管理面板","スーパー管理パネル"),
  "command_center": t10("Command Center","কমান্ড সেন্টার","Centro de mando","Centre de commande","Kommandozentrale","Centro de comando","कमांड सेंटर","مركز القيادة","指挥中心","コマンドセンター"),
  "tenant_management": t10("Tenant Management","টেন্যান্ট ব্যবস্থাপনা","Gestión de inquilinos","Gestion des locataires","Mandantenverwaltung","Gestão de inquilinos","टेनेंट प्रबंधन","إدارة المستأجرين","租户管理","テナント管理"),
  "manage_tenants": t10("Manage all tenants","সকল টেন্যান্ট পরিচালনা করুন","Gestionar todos los inquilinos","Gérer tous les locataires","Alle Mandanten verwalten","Gerenciar todos os inquilinos","सभी टेनेंट प्रबंधित करें","إدارة جميع المستأجرين","管理所有租户","すべてのテナントを管理"),
  "tenant_name": t10("Tenant Name","টেন্যান্টের নাম","Nombre del inquilino","Nom du locataire","Mandantenname","Nome do inquilino","टेनेंट का नाम","اسم المستأجر","租户名称","テナント名"),
  "tenant_slug": t10("Tenant Slug","টেন্যান্ট স্লাগ","Slug del inquilino","Slug du locataire","Mandanten-Slug","Slug do inquilino","टेनेंट स्लग","رابط المستأجر","租户别名","テナントスラッグ"),
  "industry": t10("Industry","শিল্প","Industria","Industrie","Branche","Indústria","उद्योग","الصناعة","行业","業種"),
  "company_size": t10("Company Size","কোম্পানির আকার","Tamaño de empresa","Taille de l'entreprise","Unternehmensgröße","Tamanho da empresa","कंपनी का आकार","حجم الشركة","公司规模","会社規模"),
  "is_active": t10("Is Active","সক্রিয় আছে","Está activo","Est actif","Ist aktiv","Está ativo","सक्रिय है","نشط","是否活跃","アクティブ"),
  "trial_ends_at": t10("Trial Ends At","ট্রায়াল শেষ হবে","Fin de prueba","Fin de l'essai","Testende","Fim do teste","ट्रायल समाप्ति","انتهاء الفترة التجريبية","试用结束","トライアル終了"),
  "user_management": t10("User Management","ব্যবহারকারী ব্যবস্থাপনা","Gestión de usuarios","Gestion des utilisateurs","Benutzerverwaltung","Gestão de usuários","उपयोगकर्ता प्रबंधन","إدارة المستخدمين","用户管理","ユーザー管理"),
  "global_user_management": t10("Global User Management","গ্লোবাল ব্যবহারকারী ব্যবস্থাপনা","Gestión global de usuarios","Gestion globale des utilisateurs","Globale Benutzerverwaltung","Gestão global de usuários","वैश्विक उपयोगकर्ता प्रबंधन","إدارة المستخدمين العالمية","全局用户管理","グローバルユーザー管理"),
  "manage_users": t10("Manage users across tenants","টেন্যান্ট জুড়ে ব্যবহারকারী পরিচালনা করুন","Gestionar usuarios entre inquilinos","Gérer les utilisateurs entre locataires","Benutzer über Mandanten verwalten","Gerenciar usuários entre inquilinos","टेनेंट में उपयोगकर्ता प्रबंधित करें","إدارة المستخدمين عبر المستأجرين","跨租户管理用户","テナント間のユーザーを管理"),
  "invite_user": t10("Invite User","ব্যবহারকারীকে আমন্ত্রণ জানান","Invitar usuario","Inviter un utilisateur","Benutzer einladen","Convidar usuário","उपयोगकर्ता आमंत्रित करें","دعوة مستخدم","邀请用户","ユーザーを招待"),
  "role": t10("Role","ভূমিকা","Rol","Rôle","Rolle","Função","भूमिका","الدور","角色","ロール"),
  "role_management": t10("Role Management","ভূমিকা ব্যবস্থাপনা","Gestión de roles","Gestion des rôles","Rollenverwaltung","Gestão de funções","भूमिका प्रबंधन","إدارة الأدوار","角色管理","ロール管理"),
  "manage_roles": t10("Manage roles and permissions","ভূমিকা এবং অনুমতি পরিচালনা করুন","Gestionar roles y permisos","Gérer rôles et permissions","Rollen und Berechtigungen verwalten","Gerenciar funções e permissões","भूमिकाएं और अनुमतियां प्रबंधित करें","إدارة الأدوار والصلاحيات","管理角色和权限","ロールと権限を管理"),
  "subscription_management": t10("Subscription Management","সাবস্ক্রিপশন ব্যবস্থাপনা","Gestión de suscripciones","Gestion des abonnements","Abonnementverwaltung","Gestão de assinaturas","सदस्यता प्रबंधन","إدارة الاشتراكات","订阅管理","サブスクリプション管理"),
  "manage_subscriptions": t10("Manage tenant subscriptions","টেন্যান্ট সাবস্ক্রিপশন পরিচালনা করুন","Gestionar suscripciones","Gérer les abonnements","Abonnements verwalten","Gerenciar assinaturas","सदस्यता प्रबंधित करें","إدارة اشتراكات المستأجرين","管理租户订阅","テナントサブスクリプションを管理"),
  "plan_management": t10("Plan Management","প্ল্যান ব্যবস্থাপনা","Gestión de planes","Gestion des plans","Planverwaltung","Gestão de planos","योजना प्रबंधन","إدارة الخطط","方案管理","プラン管理"),
  "manage_plans": t10("Manage subscription plans","সাবস্ক্রিপশন প্ল্যান পরিচালনা করুন","Gestionar planes de suscripción","Gérer les plans d'abonnement","Abonnementpläne verwalten","Gerenciar planos de assinatura","सदस्यता योजनाएं प्रबंधित करें","إدارة خطط الاشتراك","管理订阅方案","サブスクリプションプランを管理"),
  "billing": t10("Billing","বিলিং","Facturación","Facturation","Abrechnung","Faturamento","बिलिंग","الفوترة","账单","請求"),
  "billing_management": t10("Billing Management","বিলিং ব্যবস্থাপনা","Gestión de facturación","Gestion de la facturation","Abrechnungsverwaltung","Gestão de faturamento","बिलिंग प्रबंधन","إدارة الفوترة","账单管理","請求管理"),
  "payment_gateway": t10("Payment Gateway","পেমেন্ট গেটওয়ে","Pasarela de pago","Passerelle de paiement","Zahlungsgateway","Gateway de pagamento","भुगतान गेटवे","بوابة الدفع","支付网关","決済ゲートウェイ"),
  "module_management": t10("Module Management","মডিউল ব্যবস্থাপনা","Gestión de módulos","Gestion des modules","Modulverwaltung","Gestão de módulos","मॉड्यूल प्रबंधन","إدارة الوحدات","模块管理","モジュール管理"),
  "manage_modules": t10("Manage modules per tenant","টেন্যান্ট অনুযায়ী মডিউল পরিচালনা করুন","Gestionar módulos por inquilino","Gérer les modules par locataire","Module pro Mandant verwalten","Gerenciar módulos por inquilino","टेनेंट के अनुसार मॉड्यूल प्रबंधित करें","إدارة الوحدات لكل مستأجر","按租户管理模块","テナントごとのモジュールを管理"),
  "feature_toggles": t10("Feature Toggles","ফিচার টগল","Alternar funciones","Basculer les fonctionnalités","Feature-Toggles","Alternância de recursos","फीचर टॉगल","تبديل الميزات","功能开关","機能トグル"),
  "department_management": t10("Department Management","বিভাগ ব্যবস্থাপনা","Gestión de departamentos","Gestion des départements","Abteilungsverwaltung","Gestão de departamentos","विभाग प्रबंधन","إدارة الأقسام","部门管理","部署管理"),
  "manage_departments": t10("Manage departments","বিভাগ পরিচালনা করুন","Gestionar departamentos","Gérer les départements","Abteilungen verwalten","Gerenciar departamentos","विभाग प्रबंधित करें","إدارة الأقسام","管理部门","部署を管理"),
  "approval_workflows": t10("Approval Workflows","অনুমোদন ওয়ার্কফ্লো","Flujos de aprobación","Flux d'approbation","Genehmigungsworkflows","Fluxos de aprovação","अनुमोदन वर्कफ़्लो","سير عمل الموافقة","审批工作流","承認ワークフロー"),
  "audit_logs": t10("Audit Logs","অডিট লগ","Registros de auditoría","Journaux d'audit","Audit-Protokolle","Logs de auditoria","ऑडिट लॉग","سجلات التدقيق","审计日志","監査ログ"),
  "system_status": t10("System Status","সিস্টেম স্ট্যাটাস","Estado del sistema","État du système","Systemstatus","Status do sistema","सिस्टम स्थिति","حالة النظام","系统状态","システムステータス"),
  "security": t10("Security","নিরাপত্তা","Seguridad","Sécurité","Sicherheit","Segurança","सुरक्षा","الأمان","安全","セキュリティ"),
  "admin_settings": t10("Admin Settings","অ্যাডমিন সেটিংস","Configuración de admin","Paramètres admin","Admin-Einstellungen","Configurações de admin","एडमिन सेटिंग्स","إعدادات المسؤول","管理设置","管理者設定"),
  "ip_restrictions": t10("IP Restrictions","আইপি সীমাবদ্ধতা","Restricciones de IP","Restrictions IP","IP-Beschränkungen","Restrições de IP","आईपी प्रतिबंध","قيود IP","IP限制","IP制限"),
  "login_history": t10("Login History","লগইন ইতিহাস","Historial de inicio de sesión","Historique de connexion","Anmeldehistorie","Histórico de login","लॉगिन इतिहास","سجل الدخول","登录历史","ログイン履歴"),

  // Company Admin Panel
  "company_admin": t10("Company Admin","কোম্পানি অ্যাডমিন","Admin de empresa","Admin entreprise","Firmen-Admin","Admin da empresa","कंपनी एडमिन","مسؤول الشركة","公司管理","会社管理"),
  "company_dashboard": t10("Company Dashboard","কোম্পানি ড্যাশবোর্ড","Panel de empresa","Tableau de bord entreprise","Firmen-Dashboard","Painel da empresa","कंपनी डैशबोर्ड","لوحة تحكم الشركة","公司仪表盘","会社ダッシュボード"),
  "company_employees": t10("Company Employees","কোম্পানি কর্মচারী","Empleados de empresa","Employés de l'entreprise","Firmenmitarbeiter","Funcionários da empresa","कंपनी कर्मचारी","موظفو الشركة","公司员工","会社の従業員"),
  "company_departments": t10("Company Departments","কোম্পানি বিভাগ","Departamentos de empresa","Départements de l'entreprise","Firmenabteilungen","Departamentos da empresa","कंपनी विभाग","أقسام الشركة","公司部门","会社の部署"),
  "company_roles": t10("Company Roles","কোম্পানি ভূমিকা","Roles de empresa","Rôles de l'entreprise","Firmenrollen","Funções da empresa","कंपनी भूमिकाएं","أدوار الشركة","公司角色","会社のロール"),
  "company_settings": t10("Company Settings","কোম্পানি সেটিংস","Configuración de empresa","Paramètres de l'entreprise","Firmeneinstellungen","Configurações da empresa","कंपनी सेटिंग्स","إعدادات الشركة","公司设置","会社設定"),
  "company_approval_workflows": t10("Company Approval Workflows","কোম্পানি অনুমোদন ওয়ার্কফ্লো","Flujos de aprobación de empresa","Flux d'approbation entreprise","Firmengenehmigungsworkflows","Fluxos de aprovação da empresa","कंपनी अनुमोदन वर्कफ़्लो","سير عمل موافقة الشركة","公司审批流程","会社承認ワークフロー"),
  "total_users": t10("Total Users","মোট ব্যবহারকারী","Total de usuarios","Total d'utilisateurs","Benutzer gesamt","Total de usuários","कुल उपयोगकर्ता","إجمالي المستخدمين","用户总数","ユーザー総数"),
  "total_tenants": t10("Total Tenants","মোট টেন্যান্ট","Total de inquilinos","Total de locataires","Mandanten gesamt","Total de inquilinos","कुल टेनेंट","إجمالي المستأجرين","租户总数","テナント総数"),
  "total_revenue": t10("Total Revenue","মোট রাজস্ব","Ingresos totales","Revenus totaux","Gesamtumsatz","Receita total","कुल राजस्व","إجمالي الإيرادات","总收入","総収益"),
  "active_subscriptions": t10("Active Subscriptions","সক্রিয় সাবস্ক্রিপশন","Suscripciones activas","Abonnements actifs","Aktive Abonnements","Assinaturas ativas","सक्रिय सदस्यता","الاشتراكات النشطة","活跃订阅","アクティブサブスクリプション"),
  "system_health": t10("System Health","সিস্টেম স্বাস্থ্য","Salud del sistema","Santé du système","Systemgesundheit","Saúde do sistema","सिस्टम स्वास्थ्य","صحة النظام","系统健康","システムヘルス"),
  "recent_activity": t10("Recent Activity","সাম্প্রতিক কার্যক্রম","Actividad reciente","Activité récente","Letzte Aktivität","Atividade recente","हाल की गतिविधि","النشاط الأخير","最近活动","最近のアクティビティ"),
  "quick_actions": t10("Quick Actions","দ্রুত কার্যক্রম","Acciones rápidas","Actions rapides","Schnellaktionen","Ações rápidas","त्वरित कार्रवाइयां","إجراءات سريعة","快速操作","クイックアクション"),
  "enabled": t10("Enabled","সক্রিয়","Habilitado","Activé","Aktiviert","Habilitado","सक्षम","مفعّل","已启用","有効"),
  "disabled": t10("Disabled","নিষ্ক্রিয়","Deshabilitado","Désactivé","Deaktiviert","Desabilitado","अक्षम","معطّل","已禁用","無効"),
  "permissions": t10("Permissions","অনুমতি","Permisos","Permissions","Berechtigungen","Permissões","अनुमतियां","الصلاحيات","权限","権限"),
  "access_control": t10("Access Control","অ্যাক্সেস নিয়ন্ত্রণ","Control de acceso","Contrôle d'accès","Zugriffskontrolle","Controle de acesso","एक्सेस कंट्रोल","التحكم في الوصول","访问控制","アクセス制御"),
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("app_language") as Language) || "en";
  });

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = translations[key];
      return entry ? entry[language] : key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
