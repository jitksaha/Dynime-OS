import { Suspense, lazy, useEffect, type ReactElement } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { ColorThemeProvider } from "@/hooks/use-color-theme";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AuthProvider } from "@/hooks/useAuth";
import { AppInfoProvider } from "@/hooks/useAppInfo";
import { CompanyInfoProvider } from "@/hooks/useCompanyInfo";
import { WalletBalanceProvider } from "@/hooks/useWalletBalance";
import { ActiveBranchProvider } from "@/hooks/useActiveBranch";
const Branches = lazy(() => import("./pages/Branches"));
import { CountryProvider } from "@/hooks/useCountry";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PosModuleGate, PosSetupGate } from "@/components/PosModuleGate";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
// CompanyAdminProtectedRoute removed — company admin pages now use AppLayout
import { ModuleAccessProvider } from "@/hooks/useModuleAccess";
import { TenantCurrencyProvider } from "@/hooks/useTenantCurrency";
import { MenuConfigProvider } from "@/hooks/useMenuConfig";
import { registerRoutes } from "@/lib/search-index";
import { APP_ROUTES } from "@/lib/app-routes";

// Auto-register every authenticated route into the global search index at module load.
registerRoutes(APP_ROUTES);

// Layouts — kept eager since they wrap many routes
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
// CompanyAdminLayout removed — company admin pages now render inside AppLayout
import { PortalLayout } from "@/components/layout/PortalLayout";

// PWAInstallPrompt removed — install available via /app-download

// Eagerly load critical pages for instant rendering
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// Lazy-loaded pages
const Pricing = lazy(() => import("./pages/Pricing"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const SuperAdminLogin = lazy(() => import("./pages/auth/SuperAdminLogin"));
const Onboarding = lazy(() => import("./pages/auth/Onboarding"));
const JoinCompany = lazy(() => import("./pages/auth/JoinCompany"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Contact = lazy(() => import("./pages/Contact"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refund = lazy(() => import("./pages/Refund"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/AcceptableUsePolicy"));
const DataProcessingAgreement = lazy(() => import("./pages/DataProcessingAgreement"));
const SolutionPage = lazy(() => import("./pages/SolutionPage"));
const PublicJobApplication = lazy(() => import("./pages/PublicJobApplication"));
const PublicJobArchive = lazy(() => import("./pages/PublicJobArchive"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const AppDownload = lazy(() => import("./pages/AppDownload"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPost"));
const InvoiceBuilder = lazy(() => import("./pages/tools/InvoiceBuilder"));

// Feature pages
const HRMFeature = lazy(() => import("./pages/features/HRMSFeature"));
const CRMFeature = lazy(() => import("./pages/features/CRMFeature"));
const MarketingFeature = lazy(() => import("./pages/features/MarketingFeature"));
const WorkflowsFeature = lazy(() => import("./pages/features/WorkflowsFeature"));
const AccountingFeature = lazy(() => import("./pages/features/AccountingFeature"));
const HelpdeskFeature = lazy(() => import("./pages/features/HelpdeskFeature"));
const ProjectsFeature = lazy(() => import("./pages/features/ProjectsFeature"));
const DocumentsFeature = lazy(() => import("./pages/features/DocumentsFeature"));
const ReportsFeature = lazy(() => import("./pages/features/ReportsFeature"));
const TeamChatFeature = lazy(() => import("./pages/features/TeamChatFeature"));
const POSFeature = lazy(() => import("./pages/features/POSFeature"));
const CalendarFeature = lazy(() => import("./pages/features/CalendarFeature"));
const WalletFeature = lazy(() => import("./pages/features/WalletFeature"));
const TaxComplianceFeature = lazy(() => import("./pages/features/TaxComplianceFeature"));
const SecurityFeature = lazy(() => import("./pages/features/SecurityFeature"));
const IntegrationsFeature = lazy(() => import("./pages/features/IntegrationsFeature"));
const PortalsFeature = lazy(() => import("./pages/features/PortalsFeature"));
const RecruitmentFeature = lazy(() => import("./pages/features/RecruitmentFeature"));
const SMSFeature = lazy(() => import("./pages/features/SMSFeature"));
const WhatsAppFeature = lazy(() => import("./pages/features/WhatsAppFeature"));
const MeetingsFeature = lazy(() => import("./pages/features/MeetingsFeature"));
const NotificationsFeature = lazy(() => import("./pages/features/NotificationsFeature"));
const APIFeature = lazy(() => import("./pages/features/APIFeature"));
const EmailFeature = lazy(() => import("./pages/features/EmailFeature"));
const AIFeaturePage = lazy(() => import("./pages/features/AIFeature"));
const SocialAgentFeature = lazy(() => import("./pages/features/SocialAgentFeature"));
const OKRFeature = lazy(() => import("./pages/features/OKRFeature"));
const SubscriptionManagementFeature = lazy(() => import("./pages/features/SubscriptionManagementFeature"));
const BudgetPlanningFeature = lazy(() => import("./pages/features/BudgetPlanningFeature"));
const ComplianceFeature = lazy(() => import("./pages/features/ComplianceFeature"));
const LMSFeature = lazy(() => import("./pages/features/LMSFeature"));
const ITAssetFeature = lazy(() => import("./pages/features/ITAssetFeature"));
const CommissionFeature = lazy(() => import("./pages/features/CommissionFeature"));
const VisitorManagementFeature = lazy(() => import("./pages/features/VisitorManagementFeature"));
const ESGFeature = lazy(() => import("./pages/features/ESGFeature"));
const VendorPortalFeature = lazy(() => import("./pages/features/VendorPortalFeature"));
const TerritoryFeature = lazy(() => import("./pages/features/TerritoryFeature"));
const GamificationFeature = lazy(() => import("./pages/features/GamificationFeature"));
const ExpenseManagementFeature = lazy(() => import("./pages/features/ExpenseManagementFeature"));
const ControlTowerFeature = lazy(() => import("./pages/features/ControlTowerFeature"));
const MultiEntityFeature = lazy(() => import("./pages/features/MultiEntityFeature"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const HRMEmployees = lazy(() => import("./pages/hrms/Employees"));
const Attendance = lazy(() => import("./pages/hrms/Attendance"));
const LeaveManagement = lazy(() => import("./pages/hrms/LeaveManagement"));
const Payroll = lazy(() => import("./pages/hrms/Payroll"));
const PayrollSettings = lazy(() => import("./pages/hrms/PayrollSettings"));
const Recruitment = lazy(() => import("./pages/hrms/Recruitment"));
const Performance = lazy(() => import("./pages/hrms/Performance"));
const ShiftManagement = lazy(() => import("./pages/hrms/ShiftManagement"));
const LateManagement = lazy(() => import("./pages/hrms/LateManagement"));
const SalaryScaleup = lazy(() => import("./pages/hrms/SalaryScaleup"));
const SalarySheet = lazy(() => import("./pages/hrms/SalarySheet"));
const Invoices = lazy(() => import("./pages/accounting/Invoices"));
const Expenses = lazy(() => import("./pages/accounting/Expenses"));
const Payments = lazy(() => import("./pages/accounting/Payments"));
const TaxSettings = lazy(() => import("./pages/accounting/TaxSettings"));
const TaxReports = lazy(() => import("./pages/accounting/TaxReports"));
const Campaigns = lazy(() => import("./pages/marketing/Campaigns"));
const EmailTemplates = lazy(() => import("./pages/marketing/EmailTemplates"));
const MarketingAnalytics = lazy(() => import("./pages/marketing/Analytics"));
const CRM = lazy(() => import("./pages/CRM"));
const Helpdesk = lazy(() => import("./pages/Helpdesk"));
const Projects = lazy(() => import("./pages/Projects"));
const Workflows = lazy(() => import("./pages/Workflows"));
const Documents = lazy(() => import("./pages/Documents"));
const Reports = lazy(() => import("./pages/Reports"));
const BranchReports = lazy(() => import("./pages/BranchReports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const MySubscription = lazy(() => import("./pages/MySubscription"));
const CalendarEvents = lazy(() => import("./pages/CalendarEvents"));
const Meetings = lazy(() => import("./pages/Meetings"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BookingServicesPage = lazy(() => import("./pages/bookings/BookingServices"));
const BookingLinkPage = lazy(() => import("./pages/bookings/BookingLink"));
const ESignatures = lazy(() => import("./pages/ESignatures"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));

// POS (Point of Sale) pages
const POSSetup = lazy(() => import("./pages/product-hub/Setup"));
const POSDashboard = lazy(() => import("./pages/product-hub/Dashboard"));
const POSProducts = lazy(() => import("./pages/product-hub/Products"));
const POSOrders = lazy(() => import("./pages/product-hub/Orders"));
const POSSendToCourier = lazy(() => import("./pages/product-hub/SendToCourier"));
const POSSettings = lazy(() => import("./pages/product-hub/Settings"));
const POSIntegrations = lazy(() => import("./pages/product-hub/Integrations"));
const POSTerminal = lazy(() => import("./pages/product-hub/POS"));

// Admin pages
const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard"));
const TenantManagement = lazy(() => import("./pages/admin/TenantManagement"));
const GlobalUserManagement = lazy(() => import("./pages/admin/GlobalUserManagement"));
const SuperAdminStaffManagement = lazy(() => import("./pages/admin/SuperAdminStaffManagement"));
const SuperAdminProfile = lazy(() => import("./pages/admin/SuperAdminProfile"));
const PlanManagement = lazy(() => import("./pages/admin/PlanManagement"));
const FreePlanLimits = lazy(() => import("./pages/admin/FreePlanLimits"));
const EmailTemplateBuilder = lazy(() => import("./pages/admin/EmailTemplateBuilder"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const ModuleManagement = lazy(() => import("./pages/admin/ModuleManagement"));
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));
const FeatureToggles = lazy(() => import("./pages/admin/FeatureToggles"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSystemStatus = lazy(() => import("./pages/admin/AdminSystemStatus"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const InviteUser = lazy(() => import("./pages/admin/InviteUser"));
const DepartmentManagement = lazy(() => import("./pages/admin/DepartmentManagement"));
const ApprovalWorkflows = lazy(() => import("./pages/admin/ApprovalWorkflows"));
const SubscriptionManagement = lazy(() => import("./pages/admin/SubscriptionManagement"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const PaymentGateway = lazy(() => import("./pages/admin/PaymentGateway"));
const PortalGovernance = lazy(() => import("./pages/admin/PortalGovernance"));
const AdminCommunicationHub = lazy(() => import("./pages/admin/CommunicationHub"));
const PageManagement = lazy(() => import("./pages/admin/PageManagement"));
const AdminContactSubmissions = lazy(() => import("./pages/admin/AdminContactSubmissions"));
const HeaderEditor = lazy(() => import("./pages/admin/HeaderEditor"));
const FooterEditor = lazy(() => import("./pages/admin/FooterEditor"));
const SocialMediaManager = lazy(() => import("./pages/admin/SocialMediaManager"));
const MenuEditor = lazy(() => import("./pages/admin/MenuEditor"));
const CouponManagement = lazy(() => import("./pages/admin/CouponManagement"));
const WalletFeeConfig = lazy(() => import("./pages/admin/WalletFeeConfig"));
const PayoutApprovals = lazy(() => import("./pages/admin/PayoutApprovals"));
const AddonPricingManagement = lazy(() => import("./pages/admin/AddonPricingManagement"));
const CountryManagement = lazy(() => import("./pages/admin/CountryManagement"));
const SolutionManagement = lazy(() => import("./pages/admin/SolutionManagement"));
const FeaturesMegaMenuEditor = lazy(() => import("./pages/admin/FeaturesMegaMenuEditor"));
const KycManagement = lazy(() => import("./pages/admin/KycManagement"));
const SEOManagement = lazy(() => import("./pages/admin/SEOManagement"));
const PageSpeedOptimization = lazy(() => import("./pages/admin/PageSpeedOptimization"));
const ContactInfoEditor = lazy(() => import("./pages/admin/ContactInfoEditor"));
const CompanyInfoEditor = lazy(() => import("./pages/admin/CompanyInfoEditor"));
const AppInfoManager = lazy(() => import("./pages/admin/AppInfoManager"));
const SmsGatewayManagement = lazy(() => import("./pages/admin/SmsGatewayManagement"));
const SmsTemplateEditor = lazy(() => import("./pages/admin/SmsTemplateEditor"));
const WhatsAppGatewayManagement = lazy(() => import("./pages/admin/WhatsAppGatewayManagement"));
const WhatsAppTemplateEditor = lazy(() => import("./pages/admin/WhatsAppTemplateEditor"));
const VerificationSettings = lazy(() => import("./pages/admin/VerificationSettings"));
const KybManagement = lazy(() => import("./pages/admin/KybManagement"));
const BlogManagement = lazy(() => import("./pages/admin/BlogManagement"));
const SidebarMenuManager = lazy(() => import("./pages/admin/SidebarMenuManager"));
const DynamicModuleManager = lazy(() => import("./pages/admin/DynamicModuleManager"));
const AIConfiguration = lazy(() => import("./pages/admin/AIConfiguration"));
const ThemeManagement = lazy(() => import("./pages/admin/ThemeManagement"));
const SecuritySuite = lazy(() => import("./pages/admin/SecuritySuite"));
const SocialSignInConfig = lazy(() => import("./pages/admin/SocialSignInConfig"));
const SocialOAuthCallback = lazy(() => import("./pages/auth/SocialOAuthCallback"));

const AdminTaxConfig = lazy(() => import("./pages/admin/AdminTaxConfig"));
const PartnerManagement = lazy(() => import("./pages/admin/PartnerManagement"));
const CountryPaymentFlowBuilder = lazy(() => import("./pages/admin/CountryPaymentFlowBuilder"));
const MediaLibrary = lazy(() => import("./pages/admin/MediaLibrary"));
const SearchReplace = lazy(() => import("./pages/admin/SearchReplace"));
const CDNConfiguration = lazy(() => import("./pages/admin/CDNConfiguration"));
const CloudConsole = lazy(() => import("./pages/admin/CloudConsole"));
const CartAbandonment = lazy(() => import("./pages/admin/CartAbandonment"));
const KnowledgeBaseManager = lazy(() => import("./pages/admin/KnowledgeBaseManager"));
const SocialInbox = lazy(() => import("./pages/admin/SocialInbox"));
const AgentSettings = lazy(() => import("./pages/admin/AgentSettings"));
const EscalationManager = lazy(() => import("./pages/admin/EscalationManager"));
const SocialAnalytics = lazy(() => import("./pages/admin/SocialAnalytics"));
const SocialChannels = lazy(() => import("./pages/admin/SocialChannels"));

const SelfHostingGuide = lazy(() => import("./pages/admin/SelfHostingGuide"));
const GatewayHealthDashboard = lazy(() => import("./pages/admin/GatewayHealthDashboard"));
const Partners = lazy(() => import("./pages/Partners"));
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const PartnerApply = lazy(() => import("./pages/PartnerApply"));

// Company Admin pages
const CompanyAdminDashboard = lazy(() => import("./pages/company-admin/CompanyAdminDashboard"));
const CompanySettings = lazy(() => import("./pages/company-admin/CompanySettings"));
const CompanyDepartments = lazy(() => import("./pages/company-admin/CompanyDepartments"));
const CompanyEmployees = lazy(() => import("./pages/company-admin/CompanyEmployees"));
const CompanyApprovalWorkflows = lazy(() => import("./pages/company-admin/CompanyApprovalWorkflows"));
const CompanyRoles = lazy(() => import("./pages/company-admin/CompanyRoles"));
const CompanyCommunicationHub = lazy(() => import("./pages/admin/CommunicationHub"));
const CompanyCoupons = lazy(() => import("./pages/company-admin/CompanyCoupons"));
const WalletSettings = lazy(() => import("./pages/company-admin/WalletSettings"));
const CompanyWallet = lazy(() => import("./pages/company-admin/CompanyWallet"));
const CompanyInviteCodes = lazy(() => import("./pages/company-admin/CompanyInviteCodes"));
const CompanyReferralSettings = lazy(() => import("./pages/company-admin/CompanyReferralSettings"));
const CompanyApiKeys = lazy(() => import("./pages/company-admin/CompanyApiKeys"));
const MobileAppManager = lazy(() => import("./pages/company-admin/MobileAppManager"));
const WebhookManager = lazy(() => import("./pages/company-admin/WebhookManager"));
const BrandingSettings = lazy(() => import("./pages/company-admin/BrandingSettings"));
const ScheduledReports = lazy(() => import("./pages/company-admin/ScheduledReports"));
const NotificationPreferences = lazy(() => import("./pages/company-admin/NotificationPreferences"));
const KybApplication = lazy(() => import("./pages/company-admin/KybApplication"));
const SmsDashboard = lazy(() => import("./pages/company-admin/SmsDashboard"));
const WhatsAppSettings = lazy(() => import("./pages/company-admin/WhatsAppSettings"));
const SmsPricingManagement = lazy(() => import("./pages/admin/SmsPricingManagement"));
const AIAutomationHub = lazy(() => import("./pages/company-admin/AIAutomationHub"));
const AIChurnDetection = lazy(() => import("./pages/company-admin/AIChurnDetection"));
const AIDocumentGen = lazy(() => import("./pages/company-admin/AIDocumentGen"));
const AIThreatDetection = lazy(() => import("./pages/company-admin/AIThreatDetection"));
const AINaturalLanguageWorkflows = lazy(() => import("./pages/company-admin/AINaturalLanguageWorkflows"));
const AdvancedAnalytics = lazy(() => import("./pages/company-admin/AdvancedAnalytics"));
const IntegrationConnectors = lazy(() => import("./pages/company-admin/IntegrationConnectors"));
const AppMarketplace = lazy(() => import("./pages/company-admin/AppMarketplace"));
const ZapierAutomationHub = lazy(() => import("./pages/company-admin/ZapierAutomationHub"));
const StaffManagement = lazy(() => import("./pages/company-admin/StaffManagement"));
const LiveChatInbox = lazy(() => import("./pages/LiveChatInbox"));
const SuperAdminLiveChat = lazy(() => import("./pages/admin/SuperAdminLiveChat"));
const TeamChat = lazy(() => import("./pages/TeamChat"));
const Referrals = lazy(() => import("./pages/Referrals"));
const ApiDocumentation = lazy(() => import("./pages/ApiDocumentation"));
const Testimonials = lazy(() => import("./pages/Testimonials"));
const SavedPaymentMethods = lazy(() => import("./pages/SavedPaymentMethods"));
const RecurringPayments = lazy(() => import("./pages/RecurringPayments"));
const CheckoutPage = lazy(() => import("./pages/Checkout"));

// Portals
const CustomerPortal = lazy(() => import("./pages/portals/CustomerPortal"));
const EmployeePortal = lazy(() => import("./pages/portals/EmployeePortal"));
const EmployeeProfile = lazy(() => import("./pages/portals/EmployeeProfile"));
const EmployeePayslips = lazy(() => import("./pages/portals/EmployeePayslips"));
const EmployeeTeamDirectory = lazy(() => import("./pages/portals/EmployeeTeamDirectory"));
const EmployeeAnnouncements = lazy(() => import("./pages/portals/EmployeeAnnouncements"));
const EmployeeHolidays = lazy(() => import("./pages/portals/EmployeeHolidays"));
const EmployeeDocRequests = lazy(() => import("./pages/portals/EmployeeDocRequests"));
const CustomerWallet = lazy(() => import("./pages/portals/CustomerWallet"));
const EmployeeVerification = lazy(() => import("./pages/portals/EmployeeVerification"));
const EmployeeExpenseClaims = lazy(() => import("./pages/portals/EmployeeExpenseClaims"));
const EmployeeAssets = lazy(() => import("./pages/portals/EmployeeAssets"));
const EmployeeTraining = lazy(() => import("./pages/portals/EmployeeTraining"));
const EmployeeSurveys = lazy(() => import("./pages/portals/EmployeeSurveys"));
const CustomerInvoices = lazy(() => import("./pages/portals/CustomerInvoices"));
const CustomerOrderTracking = lazy(() => import("./pages/portals/CustomerOrderTracking"));
const CustomerKnowledgeBase = lazy(() => import("./pages/portals/CustomerKnowledgeBase"));
const CustomerLoyalty = lazy(() => import("./pages/portals/CustomerLoyalty"));

// New HRM pages
const EmployeeLoans = lazy(() => import("./pages/hrms/EmployeeLoans"));
const TrainingTracker = lazy(() => import("./pages/hrms/TrainingTracker"));
const WarningTracker = lazy(() => import("./pages/hrms/WarningTracker"));
const ProbationTracker = lazy(() => import("./pages/hrms/ProbationTracker"));

// New Accounting pages
const RecurringInvoices = lazy(() => import("./pages/accounting/RecurringInvoices"));
const ProfitLoss = lazy(() => import("./pages/accounting/ProfitLoss"));
const BudgetTracking = lazy(() => import("./pages/accounting/BudgetTracking"));

// New CRM pages
const SalesForecasting = lazy(() => import("./pages/crm/SalesForecasting"));
const DealTimeline = lazy(() => import("./pages/crm/DealTimeline"));

// Tax Compliance pages
const TaxDashboard = lazy(() => import("./pages/tax-compliance/TaxDashboard"));
const CountryTaxProfiles = lazy(() => import("./pages/tax-compliance/CountryTaxProfiles"));
const TaxRatesManager = lazy(() => import("./pages/tax-compliance/TaxRatesManager"));
const TaxComplianceTracker = lazy(() => import("./pages/tax-compliance/TaxComplianceTracker"));
const TaxCalculator = lazy(() => import("./pages/tax-compliance/TaxCalculator"));
const TaxCodeImporter = lazy(() => import("./pages/tax-compliance/TaxCodeImporter"));

// New modules
const InventoryItems = lazy(() => import("./pages/inventory/InventoryItems"));
const StockTransfers = lazy(() => import("./pages/inventory/StockTransfers"));
const PurchaseOrders = lazy(() => import("./pages/procurement/PurchaseOrders"));
const OKRObjectives = lazy(() => import("./pages/okr/Objectives"));
const AssetManagement = lazy(() => import("./pages/assets/AssetManagement"));
const ContractsPage = lazy(() => import("./pages/contracts/Contracts"));
const FleetManagement = lazy(() => import("./pages/logistics/FleetManagement"));
const ComplianceRisk = lazy(() => import("./pages/compliance/ComplianceRisk"));

// Remote Worker Tracking
const RemoteTrackingDashboard = lazy(() => import("./pages/remote-tracking/RemoteTrackingDashboard"));
const EmployeeTracker = lazy(() => import("./pages/remote-tracking/EmployeeTracker"));

// Phase 2 modules
const ClientPortalManager = lazy(() => import("./pages/client-portal/ClientPortalManager"));
const FeedbackNPS = lazy(() => import("./pages/feedback/FeedbackNPS"));
const LoyaltyRewards = lazy(() => import("./pages/loyalty/LoyaltyRewards"));
const ReferralProgramPage = lazy(() => import("./pages/referral-program/ReferralProgram"));
const FieldServiceJobs = lazy(() => import("./pages/field-service/FieldServiceJobs"));
const ShiftRosterPlanner = lazy(() => import("./pages/shift-planner/ShiftRosterPlanner"));
const SLAManagerPage = lazy(() => import("./pages/sla/SLAManager"));
const DocumentAutomation = lazy(() => import("./pages/doc-automation/DocumentAutomation"));
const ResourcePlannerPage = lazy(() => import("./pages/resource-planner/ResourcePlanner"));
const QualityControlPage = lazy(() => import("./pages/quality-control/QualityControl"));
const CollectionsDunning = lazy(() => import("./pages/collections/CollectionsDunning"));
const SubscriptionAnalyticsPage = lazy(() => import("./pages/sub-analytics/SubscriptionAnalytics"));
const TreasuryAccounts = lazy(() => import("./pages/treasury/TreasuryAccounts"));
const RevenueRecognitionPage = lazy(() => import("./pages/revenue/RevenueRecognition"));
const ExpenseClaimsPage = lazy(() => import("./pages/expense-claims/ExpenseClaims"));
const FinancialForecastingPage = lazy(() => import("./pages/forecasting/FinancialForecasting"));

// AI Assistant
const AIAssistant = lazy(() => import("./pages/ai/AIAssistant"));
const AIPromptLibrary = lazy(() => import("./pages/ai/AIPromptLibrary"));
const AIUsageDashboard = lazy(() => import("./pages/ai/AIUsageDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { RouteProgressBar } from "@/components/RouteProgressBar";

// Lightweight chunk error recovery — no aggressive preloading
function RouteWarmup() {
  useEffect(() => {
    const onChunkError = (event: ErrorEvent) => {
      const message = String(event.message || "");
      if (!message.includes("Failed to fetch dynamically imported module")) return;
      const reloadKey = "lazy_chunk_recovered_once";
      if (sessionStorage.getItem(reloadKey) === "1") return;
      sessionStorage.setItem(reloadKey, "1");
      window.location.reload();
    };
    window.addEventListener("error", onChunkError);
    return () => window.removeEventListener("error", onChunkError);
  }, []);

  return null;
}

function SEOWrapper() {
  useSEO();
  return null;
}

/**
 * Keeps rendering the previous matched route tree until the next one is
 * actually ready, preventing white flashes during lazy route transitions.
 */
function DeferredRouteRenderer({ children }: { children: ReactElement }) {
  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ColorThemeProvider>
    <ThemeProvider>
      <AppInfoProvider>
      <CompanyInfoProvider>
      <AuthProvider>
        <TenantCurrencyProvider>
        <WalletBalanceProvider>
        <ActiveBranchProvider>
        <CountryProvider>
        <LanguageProvider>
        <ModuleAccessProvider>
        <MenuConfigProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SEOWrapper />
            <RouteWarmup />
            <RouteProgressBar />
            
            <DeferredRouteRenderer>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/features/hrms" element={<HRMFeature />} />
                <Route path="/features/hrm" element={<HRMFeature />} />
                <Route path="/features/crm" element={<CRMFeature />} />
                <Route path="/features/marketing" element={<MarketingFeature />} />
                <Route path="/features/workflows" element={<WorkflowsFeature />} />
                <Route path="/features/accounting" element={<AccountingFeature />} />
                <Route path="/features/helpdesk" element={<HelpdeskFeature />} />
                <Route path="/features/projects" element={<ProjectsFeature />} />
                <Route path="/features/documents" element={<DocumentsFeature />} />
                <Route path="/features/reports" element={<ReportsFeature />} />
                <Route path="/features/team-chat" element={<TeamChatFeature />} />
                <Route path="/features/pos" element={<POSFeature />} />
                <Route path="/features/calendar" element={<CalendarFeature />} />
                <Route path="/features/wallet" element={<WalletFeature />} />
                <Route path="/features/tax-compliance" element={<TaxComplianceFeature />} />
                <Route path="/features/security" element={<SecurityFeature />} />
                <Route path="/features/integrations" element={<IntegrationsFeature />} />
                <Route path="/features/portals" element={<PortalsFeature />} />
                <Route path="/features/recruitment" element={<RecruitmentFeature />} />
                <Route path="/features/sms" element={<SMSFeature />} />
                <Route path="/features/whatsapp" element={<WhatsAppFeature />} />
                <Route path="/features/meetings" element={<MeetingsFeature />} />
                <Route path="/features/notifications" element={<NotificationsFeature />} />
                <Route path="/features/api" element={<APIFeature />} />
                <Route path="/features/email" element={<EmailFeature />} />
                <Route path="/features/ai" element={<AIFeaturePage />} />
                <Route path="/features/okr" element={<OKRFeature />} />
                <Route path="/features/subscription-management" element={<SubscriptionManagementFeature />} />
                <Route path="/features/budget-planning" element={<BudgetPlanningFeature />} />
                <Route path="/features/compliance" element={<ComplianceFeature />} />
                <Route path="/features/lms" element={<LMSFeature />} />
                <Route path="/features/it-asset" element={<ITAssetFeature />} />
                <Route path="/features/commission" element={<CommissionFeature />} />
                <Route path="/features/visitor-management" element={<VisitorManagementFeature />} />
                <Route path="/features/esg" element={<ESGFeature />} />
                <Route path="/features/vendor-portal" element={<VendorPortalFeature />} />
                <Route path="/features/territory" element={<TerritoryFeature />} />
                <Route path="/features/gamification" element={<GamificationFeature />} />
                <Route path="/features/expense-management" element={<ExpenseManagementFeature />} />
                <Route path="/features/control-tower" element={<ControlTowerFeature />} />
                <Route path="/features/multi-entity" element={<MultiEntityFeature />} />
                <Route path="/features/social-agent" element={<SocialAgentFeature />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/social-callback" element={<SocialOAuthCallback />} />
                
                <Route path="/invite/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/superadmin" element={<SuperAdminLogin />} />
                <Route path="/hrm/recruitment/:jobId" element={<PublicJobApplication />} />
                <Route path="/careers/:companySlug" element={<PublicJobArchive />} />
                <Route path="/book/:companySlug" element={<PublicBooking />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/acceptable-use" element={<AcceptableUsePolicy />} />
                <Route path="/dpa" element={<DataProcessingAgreement />} />
                <Route path="/solutions/:slug" element={<SolutionPage />} />
                <Route path="/api/docs" element={<ApiDocumentation />} />
                <Route path="/app-download" element={<AppDownload />} />
                <Route path="/testimonials" element={<Testimonials />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/partners/apply" element={<PartnerApply />} />
                <Route path="/partners/:slug" element={<PartnerDetail />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/tools/invoice-builder" element={<InvoiceBuilder />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/join-company" element={<ProtectedRoute><JoinCompany /></ProtectedRoute>} />
                <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />

                {/* User Panel */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/branches" element={<Branches />} />
                  <Route path="/hrm/employees" element={<HRMEmployees />} />
                  <Route path="/hrm/shifts" element={<ShiftManagement />} />
                  <Route path="/hrm/attendance" element={<Attendance />} />
                  <Route path="/hrm/leave" element={<LeaveManagement />} />
                  <Route path="/hrm/late" element={<LateManagement />} />
                  <Route path="/hrm/payroll" element={<Payroll />} />
                  <Route path="/hrm/salary-sheet" element={<SalarySheet />} />
                  <Route path="/hrm/salary-scaleup" element={<SalaryScaleup />} />
                  <Route path="/hrm/payroll-settings" element={<PayrollSettings />} />
                  <Route path="/hrm/recruitment" element={<Recruitment />} />
                  <Route path="/hrm/performance" element={<Performance />} />
                  <Route path="/hrm/loans" element={<EmployeeLoans />} />
                  <Route path="/hrm/training" element={<TrainingTracker />} />
                  <Route path="/hrm/warnings" element={<WarningTracker />} />
                  <Route path="/hrm/probation" element={<ProbationTracker />} />
                  {/* Legacy routes */}
                  <Route path="/hrms/employees" element={<HRMEmployees />} />
                  <Route path="/hrms/attendance" element={<Attendance />} />
                  <Route path="/hrms/leave" element={<LeaveManagement />} />
                  <Route path="/hrms/payroll" element={<Payroll />} />
                  <Route path="/hrms/payroll-settings" element={<PayrollSettings />} />
                  <Route path="/hrms/recruitment" element={<Recruitment />} />
                  <Route path="/hrms/performance" element={<Performance />} />
                  <Route path="/crm" element={<CRM />} />
                  <Route path="/crm/forecasting" element={<SalesForecasting />} />
                  <Route path="/crm/timeline" element={<DealTimeline />} />
                  <Route path="/marketing/campaigns" element={<Campaigns />} />
                  <Route path="/marketing/templates" element={<EmailTemplates />} />
                  <Route path="/marketing/analytics" element={<MarketingAnalytics />} />
                  <Route path="/workflows" element={<Workflows />} />
                  <Route path="/accounting/invoices" element={<Invoices />} />
                  <Route path="/accounting/recurring" element={<RecurringInvoices />} />
                  <Route path="/accounting/expenses" element={<Expenses />} />
                  <Route path="/accounting/payments" element={<Payments />} />
                  <Route path="/accounting/tax" element={<TaxSettings />} />
                  <Route path="/accounting/tax-reports" element={<TaxReports />} />
                  <Route path="/accounting/profit-loss" element={<ProfitLoss />} />
                  <Route path="/accounting/budgets" element={<BudgetTracking />} />
                  {/* Tax Compliance */}
                  <Route path="/tax" element={<TaxDashboard />} />
                  <Route path="/tax/dashboard" element={<TaxDashboard />} />
                  <Route path="/tax/profiles" element={<CountryTaxProfiles />} />
                  <Route path="/tax/rates" element={<TaxRatesManager />} />
                  <Route path="/tax/compliance" element={<TaxComplianceTracker />} />
                  <Route path="/tax/calculator" element={<TaxCalculator />} />
                  <Route path="/tax/importer" element={<TaxCodeImporter />} />
                  <Route path="/helpdesk" element={<Helpdesk />} />
                  <Route path="/helpdesk/live-chat" element={<LiveChatInbox />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/reports/branches" element={<BranchReports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/calendar" element={<CalendarEvents />} />
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/subscription" element={<MySubscription />} />
                  <Route path="/wallet" element={<CompanyWallet />} />
                  <Route path="/wallet/settings" element={<WalletSettings />} />
                  <Route path="/team-chat" element={<TeamChat />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/payment-methods" element={<SavedPaymentMethods />} />
                  <Route path="/auto-payments" element={<RecurringPayments />} />
                  {/* New Modules */}
                  <Route path="/inventory" element={<InventoryItems />} />
                  <Route path="/inventory/transfers" element={<StockTransfers />} />
                  <Route path="/procurement" element={<PurchaseOrders />} />
                  <Route path="/okr" element={<OKRObjectives />} />
                  <Route path="/assets" element={<AssetManagement />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/logistics" element={<FleetManagement />} />
                  <Route path="/compliance" element={<ComplianceRisk />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/bookings/services" element={<BookingServicesPage />} />
                  <Route path="/bookings/link" element={<BookingLinkPage />} />
                  <Route path="/e-signatures" element={<ESignatures />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  {/* Phase 2 modules */}
                  <Route path="/client-portal" element={<ClientPortalManager />} />
                  <Route path="/feedback-nps" element={<FeedbackNPS />} />
                  <Route path="/loyalty" element={<LoyaltyRewards />} />
                  <Route path="/referral-program" element={<ReferralProgramPage />} />
                  <Route path="/field-service" element={<FieldServiceJobs />} />
                  <Route path="/shift-planner" element={<ShiftRosterPlanner />} />
                  <Route path="/sla-manager" element={<SLAManagerPage />} />
                  <Route path="/doc-automation" element={<DocumentAutomation />} />
                  <Route path="/resource-planner" element={<ResourcePlannerPage />} />
                  <Route path="/quality-control" element={<QualityControlPage />} />
                  <Route path="/collections" element={<CollectionsDunning />} />
                  <Route path="/sub-analytics" element={<SubscriptionAnalyticsPage />} />
                  <Route path="/treasury" element={<TreasuryAccounts />} />
                  <Route path="/revenue-recognition" element={<RevenueRecognitionPage />} />
                  <Route path="/expense-claims" element={<ExpenseClaimsPage />} />
                  <Route path="/financial-forecasting" element={<FinancialForecastingPage />} />
                  {/* Remote Worker Tracking */}
                  <Route path="/remote-tracking" element={<RemoteTrackingDashboard />} />
                  <Route path="/remote-tracking/employee" element={<EmployeeTracker />} />
                  {/* POS (Point of Sale) */}
                  <Route path="/pos/setup" element={<PosSetupGate><POSSetup /></PosSetupGate>} />
                  <Route path="/pos/dashboard" element={<PosModuleGate><POSDashboard /></PosModuleGate>} />
                  <Route path="/pos/terminal" element={<PosModuleGate><POSTerminal /></PosModuleGate>} />
                  <Route path="/pos/products" element={<PosModuleGate><POSProducts /></PosModuleGate>} />
                  <Route path="/pos/orders" element={<PosModuleGate><POSOrders /></PosModuleGate>} />
                  <Route path="/pos/send-courier" element={<PosModuleGate><POSSendToCourier /></PosModuleGate>} />
                  <Route path="/pos/settings" element={<PosModuleGate><POSSettings /></PosModuleGate>} />
                  <Route path="/pos/integrations" element={<PosModuleGate><POSIntegrations /></PosModuleGate>} />
                  {/* Dynime AI */}
                  <Route path="/dynime-ai" element={<AIAssistant />} />
                  <Route path="/dynime-ai/prompts" element={<AIPromptLibrary />} />
                  <Route path="/dynime-ai/usage" element={<AIUsageDashboard />} />
                  {/* Legacy product-hub routes */}
                  <Route path="/product-hub/dashboard" element={<POSDashboard />} />
                  <Route path="/product-hub/pos" element={<POSTerminal />} />
                  <Route path="/product-hub/products" element={<POSProducts />} />
                  <Route path="/product-hub/orders" element={<POSOrders />} />
                  <Route path="/product-hub/send-courier" element={<POSSendToCourier />} />
                  <Route path="/product-hub/settings" element={<POSSettings />} />
                  <Route path="/product-hub/integrations" element={<POSIntegrations />} />

                  {/* Admin pages — merged into main app (formerly /cadmin/*) */}
                  <Route path="/admin-dashboard" element={<CompanyAdminDashboard />} />
                  <Route path="/company-settings" element={<CompanySettings />} />
                  <Route path="/departments" element={<CompanyDepartments />} />
                  <Route path="/company-employees" element={<CompanyEmployees />} />
                  <Route path="/approvals" element={<CompanyApprovalWorkflows />} />
                  <Route path="/roles" element={<CompanyRoles />} />
                  <Route path="/invite-codes" element={<CompanyInviteCodes />} />
                  <Route path="/communication" element={<CompanyCommunicationHub />} />
                  <Route path="/coupons" element={<CompanyCoupons />} />
                  <Route path="/referral-settings" element={<CompanyReferralSettings />} />
                  <Route path="/api-keys" element={<CompanyApiKeys />} />
                  <Route path="/webhooks" element={<WebhookManager />} />
                  <Route path="/branding" element={<BrandingSettings />} />
                  <Route path="/scheduled-reports" element={<ScheduledReports />} />
                  <Route path="/notification-settings" element={<NotificationPreferences />} />
                  <Route path="/kyb" element={<KybApplication />} />
                  <Route path="/sms" element={<SmsDashboard />} />
                  <Route path="/sms-settings" element={<SmsDashboard />} />
                  <Route path="/whatsapp" element={<WhatsAppSettings />} />
                  <Route path="/ai-automation" element={<AIAutomationHub />} />
                  <Route path="/ai-churn" element={<AIChurnDetection />} />
                  <Route path="/ai-documents" element={<AIDocumentGen />} />
                  <Route path="/ai-threats" element={<AIThreatDetection />} />
                  <Route path="/ai-workflows" element={<AINaturalLanguageWorkflows />} />
                  <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
                  <Route path="/integrations" element={<IntegrationConnectors />} />
                  <Route path="/app-marketplace" element={<AppMarketplace />} />
                  <Route path="/zapier" element={<ZapierAutomationHub />} />
                  <Route path="/live-chat" element={<LiveChatInbox />} />
                  <Route path="/staff-management" element={<StaffManagement />} />
                  <Route path="/social-inbox" element={<SocialInbox />} />
                  <Route path="/social-channels" element={<SocialChannels />} />
                  <Route path="/agent-knowledge-base" element={<KnowledgeBaseManager />} />
                  <Route path="/agent-settings" element={<AgentSettings />} />
                  <Route path="/escalation-manager" element={<EscalationManager />} />
                  <Route path="/social-analytics" element={<SocialAnalytics />} />

                  {/* Legacy /cadmin/* redirects — keep old bookmarks working */}
                  <Route path="/cadmin/dashboard" element={<Navigate to="/admin-dashboard" replace />} />
                  <Route path="/cadmin/settings" element={<Navigate to="/company-settings" replace />} />
                  <Route path="/cadmin/departments" element={<Navigate to="/departments" replace />} />
                  <Route path="/cadmin/employees" element={<Navigate to="/company-employees" replace />} />
                  <Route path="/cadmin/approvals" element={<Navigate to="/approvals" replace />} />
                  <Route path="/cadmin/roles" element={<Navigate to="/roles" replace />} />
                  <Route path="/cadmin/invite-codes" element={<Navigate to="/invite-codes" replace />} />
                  <Route path="/cadmin/communication" element={<Navigate to="/communication" replace />} />
                  <Route path="/cadmin/coupons" element={<Navigate to="/coupons" replace />} />
                  <Route path="/cadmin/wallet" element={<Navigate to="/wallet" replace />} />
                  <Route path="/cadmin/wallet-settings" element={<Navigate to="/wallet/settings" replace />} />
                  <Route path="/cadmin/referral-settings" element={<Navigate to="/referral-settings" replace />} />
                  <Route path="/cadmin/api-keys" element={<Navigate to="/api-keys" replace />} />
                  <Route path="/cadmin/webhooks" element={<Navigate to="/webhooks" replace />} />
                  <Route path="/cadmin/branding" element={<Navigate to="/branding" replace />} />
                  <Route path="/cadmin/scheduled-reports" element={<Navigate to="/scheduled-reports" replace />} />
                  <Route path="/cadmin/notifications" element={<Navigate to="/notification-settings" replace />} />
                  <Route path="/cadmin/kyb" element={<Navigate to="/kyb" replace />} />
                  <Route path="/cadmin/sms" element={<Navigate to="/sms" replace />} />
                  <Route path="/cadmin/sms-settings" element={<Navigate to="/sms-settings" replace />} />
                  <Route path="/cadmin/whatsapp" element={<Navigate to="/whatsapp" replace />} />
                  <Route path="/cadmin/ai-automation" element={<Navigate to="/ai-automation" replace />} />
                  <Route path="/cadmin/ai-churn" element={<Navigate to="/ai-churn" replace />} />
                  <Route path="/cadmin/ai-documents" element={<Navigate to="/ai-documents" replace />} />
                  <Route path="/cadmin/ai-threats" element={<Navigate to="/ai-threats" replace />} />
                  <Route path="/cadmin/ai-workflows" element={<Navigate to="/ai-workflows" replace />} />
                  <Route path="/cadmin/analytics" element={<Navigate to="/advanced-analytics" replace />} />
                  <Route path="/cadmin/integrations" element={<Navigate to="/integrations" replace />} />
                  <Route path="/cadmin/app-marketplace" element={<Navigate to="/app-marketplace" replace />} />
                  <Route path="/cadmin/zapier" element={<Navigate to="/zapier" replace />} />
                  <Route path="/cadmin/live-chat" element={<Navigate to="/live-chat" replace />} />
                  <Route path="/cadmin/staff-management" element={<Navigate to="/staff-management" replace />} />
                  <Route path="/cadmin/social-inbox" element={<Navigate to="/social-inbox" replace />} />
                  <Route path="/cadmin/social-channels" element={<Navigate to="/social-channels" replace />} />
                  <Route path="/cadmin/knowledge-base" element={<Navigate to="/agent-knowledge-base" replace />} />
                  <Route path="/cadmin/agent-settings" element={<Navigate to="/agent-settings" replace />} />
                  <Route path="/cadmin/escalation-manager" element={<Navigate to="/escalation-manager" replace />} />
                  <Route path="/cadmin/social-analytics" element={<Navigate to="/social-analytics" replace />} />
                </Route>

                {/* Employee Portal */}
                <Route element={<ProtectedRoute><PortalLayout type="employee" /></ProtectedRoute>}>
                  <Route path="/portal/employee" element={<EmployeePortal />} />
                  <Route path="/portal/employee/profile" element={<EmployeeProfile />} />
                  <Route path="/portal/employee/payslips" element={<EmployeePayslips />} />
                  <Route path="/portal/employee/team" element={<EmployeeTeamDirectory />} />
                  <Route path="/portal/employee/announcements" element={<EmployeeAnnouncements />} />
                  <Route path="/portal/employee/holidays" element={<EmployeeHolidays />} />
                  <Route path="/portal/employee/documents" element={<EmployeeDocRequests />} />
                  <Route path="/portal/employee/verifications" element={<EmployeeVerification />} />
                  <Route path="/portal/employee/expenses" element={<EmployeeExpenseClaims />} />
                  <Route path="/portal/employee/assets" element={<EmployeeAssets />} />
                  <Route path="/portal/employee/training" element={<EmployeeTraining />} />
                  <Route path="/portal/employee/surveys" element={<EmployeeSurveys />} />
                </Route>

                {/* Customer Portal */}
                <Route element={<ProtectedRoute><PortalLayout type="customer" /></ProtectedRoute>}>
                  <Route path="/portal/customer" element={<CustomerPortal />} />
                  <Route path="/portal/customer/wallet" element={<CustomerWallet />} />
                  <Route path="/portal/customer/invoices" element={<CustomerInvoices />} />
                  <Route path="/portal/customer/orders" element={<CustomerOrderTracking />} />
                  <Route path="/portal/customer/knowledge-base" element={<CustomerKnowledgeBase />} />
                  <Route path="/portal/customer/loyalty" element={<CustomerLoyalty />} />
                </Route>

                {/* Super Admin Panel */}
                <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                  <Route path="/superadmin/tenants" element={<TenantManagement />} />
                  <Route path="/superadmin/users" element={<GlobalUserManagement />} />
                  <Route path="/superadmin/staff-management" element={<SuperAdminStaffManagement />} />
                  <Route path="/superadmin/plans" element={<PlanManagement />} />
                  <Route path="/superadmin/free-plan-limits" element={<FreePlanLimits />} />
                  <Route path="/superadmin/email-templates" element={<EmailTemplateBuilder />} />
                  <Route path="/superadmin/billing" element={<AdminBilling />} />
                  <Route path="/superadmin/modules" element={<ModuleManagement />} />
                  <Route path="/superadmin/roles" element={<RoleManagement />} />
                  <Route path="/superadmin/features" element={<FeatureToggles />} />
                  <Route path="/superadmin/audit-logs" element={<AuditLogs />} />
                  <Route path="/superadmin/system" element={<AdminSystemStatus />} />
                  <Route path="/superadmin/settings" element={<AdminSettings />} />
                  <Route path="/superadmin/invite" element={<InviteUser />} />
                  <Route path="/superadmin/departments" element={<DepartmentManagement />} />
                  <Route path="/superadmin/approvals" element={<ApprovalWorkflows />} />
                  <Route path="/superadmin/subscriptions" element={<SubscriptionManagement />} />
                  <Route path="/superadmin/security" element={<AdminSecurity />} />
                  <Route path="/superadmin/payment-gateway" element={<PaymentGateway />} />
                  <Route path="/superadmin/portal-governance" element={<PortalGovernance />} />
                  <Route path="/superadmin/communication" element={<AdminCommunicationHub />} />
                  <Route path="/superadmin/pages" element={<PageManagement />} />
                  <Route path="/superadmin/contact" element={<AdminContactSubmissions />} />
                  <Route path="/superadmin/header-editor" element={<HeaderEditor />} />
                  <Route path="/superadmin/footer-editor" element={<FooterEditor />} />
                  <Route path="/superadmin/social-media" element={<SocialMediaManager />} />
                  <Route path="/superadmin/menu-editor" element={<MenuEditor />} />
                  <Route path="/superadmin/coupons" element={<CouponManagement />} />
                  <Route path="/superadmin/wallet-fees" element={<WalletFeeConfig />} />
                  <Route path="/superadmin/payout-approvals" element={<PayoutApprovals />} />
                  <Route path="/superadmin/addon-pricing" element={<AddonPricingManagement />} />
                  <Route path="/superadmin/countries" element={<CountryManagement />} />
                  <Route path="/superadmin/solutions" element={<SolutionManagement />} />
                  <Route path="/superadmin/features-menu" element={<FeaturesMegaMenuEditor />} />
                  <Route path="/superadmin/kyc-management" element={<KycManagement />} />
                  <Route path="/superadmin/seo" element={<SEOManagement />} />
                  <Route path="/superadmin/page-speed" element={<PageSpeedOptimization />} />
                  <Route path="/superadmin/contact-info" element={<ContactInfoEditor />} />
                  <Route path="/superadmin/mobile-app" element={<MobileAppManager />} />
                  <Route path="/superadmin/app-info" element={<AppInfoManager />} />
                  <Route path="/superadmin/company-info" element={<CompanyInfoEditor />} />
                  <Route path="/superadmin/sms-gateways" element={<SmsGatewayManagement />} />
                  <Route path="/superadmin/sms-templates" element={<SmsTemplateEditor />} />
                  <Route path="/superadmin/sms-pricing" element={<SmsPricingManagement />} />
                  <Route path="/superadmin/whatsapp-gateways" element={<WhatsAppGatewayManagement />} />
                  <Route path="/superadmin/whatsapp-templates" element={<WhatsAppTemplateEditor />} />
                  <Route path="/superadmin/verification-settings" element={<VerificationSettings />} />
                  <Route path="/superadmin/kyb-management" element={<KybManagement />} />
                  <Route path="/superadmin/blog" element={<BlogManagement />} />
                  <Route path="/superadmin/sidebar-menu-manager" element={<SidebarMenuManager />} />
                  <Route path="/superadmin/dynamic-modules" element={<DynamicModuleManager />} />
                  <Route path="/superadmin/ai-config" element={<AIConfiguration />} />
                  <Route path="/superadmin/theme-management" element={<ThemeManagement />} />
                  <Route path="/superadmin/security-suite" element={<SecuritySuite />} />
                  <Route path="/superadmin/social-signin" element={<SocialSignInConfig />} />
                  <Route path="/superadmin/tax-config" element={<AdminTaxConfig />} />
                  <Route path="/superadmin/cloud-console" element={<CloudConsole />} />
                  <Route path="/superadmin/partners" element={<PartnerManagement />} />
                  <Route path="/superadmin/partners/directory" element={<Partners />} />
                  <Route path="/superadmin/live-chat" element={<SuperAdminLiveChat />} />
                  <Route path="/superadmin/country-payment-flow" element={<CountryPaymentFlowBuilder />} />
                  <Route path="/superadmin/media-library" element={<MediaLibrary />} />
                  <Route path="/superadmin/search-replace" element={<SearchReplace />} />
                  <Route path="/superadmin/cdn-config" element={<CDNConfiguration />} />
                  <Route path="/superadmin/cart-abandonment" element={<CartAbandonment />} />
                  <Route path="/superadmin/gateway-health" element={<GatewayHealthDashboard />} />
                  <Route path="/superadmin/profile" element={<SuperAdminProfile />} />
                  <Route path="/superadmin/self-hosting" element={<SelfHostingGuide />} />
                  <Route path="/superadmin/knowledge-base" element={<KnowledgeBaseManager />} />
                  <Route path="/superadmin/social-inbox" element={<SocialInbox />} />
                  <Route path="/superadmin/agent-settings" element={<AgentSettings />} />
                  <Route path="/superadmin/escalation-manager" element={<EscalationManager />} />
                  <Route path="/superadmin/social-analytics" element={<SocialAnalytics />} />
                  
                </Route>

                {/* Company Admin routes removed — merged into main AppLayout below */}

                <Route path="*" element={<NotFound />} />
              </Routes>
            </DeferredRouteRenderer>
          </BrowserRouter>
        </TooltipProvider>
        </MenuConfigProvider>
        </ModuleAccessProvider>
        </LanguageProvider>
        </CountryProvider>
        </ActiveBranchProvider>
        </WalletBalanceProvider>
        </TenantCurrencyProvider>
      </AuthProvider>
      </CompanyInfoProvider>
      </AppInfoProvider>
    </ThemeProvider>
    </ColorThemeProvider>
  </QueryClientProvider>
);

export default App;
