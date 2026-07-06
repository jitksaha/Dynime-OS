// @ts-nocheck
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, Copy, Info, LogIn } from "lucide-react";
import { toast } from "sonner";

interface WizardStep {
  title: string;
  description: string;
  type: "info" | "input" | "action" | "link";
  linkUrl?: string;
  linkLabel?: string;
  fields?: { key: string; label: string; type: string; placeholder: string; hint?: string; default?: string }[];
  imageTip?: string;
}

interface IntegrationWizardConfig {
  key: string;
  name: string;
  icon: any;
  connectLabel: string;
  steps: WizardStep[];
}

const WIZARD_CONFIGS: Record<string, Omit<IntegrationWizardConfig, "key" | "name" | "icon">> = {
  gmail: {
    connectLabel: "Sign in with Gmail",
    steps: [
      {
        title: "Enable 2-Step Verification",
        description: "First, make sure 2-Step Verification is turned ON for your Google account. This is required to generate an App Password.",
        type: "link",
        linkUrl: "https://myaccount.google.com/security",
        linkLabel: "Open Google Security Settings",
      },
      {
        title: "Generate App Password",
        description: "Go to App Passwords page, select 'Mail' as the app and generate a 16-character password. Copy this password — you'll paste it in the next step.",
        type: "link",
        linkUrl: "https://myaccount.google.com/apppasswords",
        linkLabel: "Open App Passwords",
        imageTip: "Select 'Mail' from the dropdown → Click 'Generate' → Copy the 16-character password",
      },
      {
        title: "Enter Your Credentials",
        description: "Paste your Gmail address and the App Password you just generated.",
        type: "input",
        fields: [
          { key: "email", label: "Gmail Address", type: "text", placeholder: "your@gmail.com" },
          { key: "app_password", label: "App Password", type: "password", placeholder: "Paste your 16-character app password" },
          { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com", default: "smtp.gmail.com" },
          { key: "smtp_port", label: "SMTP Port", type: "text", placeholder: "587", default: "587" },
        ],
      },
    ],
  },
  slack: {
    connectLabel: "Add to Slack",
    steps: [
      {
        title: "Create a Slack App",
        description: "Go to Slack API and create a new app (or use an existing one). Choose 'From scratch' and select your workspace.",
        type: "link",
        linkUrl: "https://api.slack.com/apps",
        linkLabel: "Open Slack API Dashboard",
      },
      {
        title: "Enable Incoming Webhooks",
        description: "In your Slack app settings, go to 'Incoming Webhooks' → Toggle it ON → Click 'Add New Webhook to Workspace' → Select a channel → Copy the Webhook URL.",
        type: "link",
        linkUrl: "https://api.slack.com/apps",
        linkLabel: "Configure Webhooks",
        imageTip: "Features → Incoming Webhooks → ON → Add New Webhook → Select Channel → Copy URL",
      },
      {
        title: "Connect to Your Workspace",
        description: "Paste the webhook URL and customize the bot name that will appear in Slack.",
        type: "input",
        fields: [
          { key: "webhook_url", label: "Webhook URL", type: "password", placeholder: "https://hooks.slack.com/services/..." },
          { key: "default_channel", label: "Default Channel", type: "text", placeholder: "#general" },
          { key: "bot_name", label: "Bot Display Name", type: "text", placeholder: "Dynime Bot", default: "Dynime Bot" },
        ],
      },
    ],
  },
  whatsapp: {
    connectLabel: "Connect WhatsApp",
    steps: [
      {
        title: "Set Up Meta Business Account",
        description: "You need a Meta Business account with WhatsApp Business API enabled. If you don't have one, create it through Meta Business Suite.",
        type: "link",
        linkUrl: "https://business.facebook.com/",
        linkLabel: "Open Meta Business Suite",
      },
      {
        title: "Get WhatsApp API Credentials",
        description: "In Meta Business Suite, go to WhatsApp → API Setup. You'll find your Phone Number ID, Business Account ID, and can generate a Permanent Access Token.",
        type: "link",
        linkUrl: "https://developers.facebook.com/apps/",
        linkLabel: "Open Meta Developer Portal",
        imageTip: "WhatsApp → API Setup → Copy Phone Number ID → Generate Permanent Token",
      },
      {
        title: "Enter API Credentials",
        description: "Paste the credentials you copied from Meta's dashboard.",
        type: "input",
        fields: [
          { key: "phone_number_id", label: "Phone Number ID", type: "text", placeholder: "Your WhatsApp Business phone number ID" },
          { key: "access_token", label: "Access Token", type: "password", placeholder: "Permanent access token" },
          { key: "business_account_id", label: "Business Account ID", type: "text", placeholder: "WhatsApp Business Account ID" },
          { key: "api_version", label: "API Version", type: "text", placeholder: "v18.0", default: "v18.0" },
        ],
      },
    ],
  },
  google_calendar: {
    connectLabel: "Connect Google Calendar",
    steps: [
      {
        title: "Enable Calendar API",
        description: "Go to Google Cloud Console, create or select a project, then enable the Google Calendar API.",
        type: "link",
        linkUrl: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
        linkLabel: "Enable Calendar API",
      },
      {
        title: "Create API Key",
        description: "In Google Cloud Console, go to Credentials → Create Credentials → API Key. Copy the generated key.",
        type: "link",
        linkUrl: "https://console.cloud.google.com/apis/credentials",
        linkLabel: "Create API Key",
        imageTip: "Credentials → Create Credentials → API Key → Copy Key",
      },
      {
        title: "Enter Calendar Details",
        description: "Paste your API key. Leave Calendar ID as 'primary' to use your main calendar, or enter a specific calendar email.",
        type: "input",
        fields: [
          { key: "api_key", label: "API Key", type: "password", placeholder: "Your Google Cloud API key" },
          { key: "calendar_id", label: "Calendar ID", type: "text", placeholder: "primary", default: "primary" },
        ],
      },
    ],
  },
  google_drive: {
    connectLabel: "Connect Google Drive",
    steps: [
      {
        title: "Create OAuth Credentials",
        description: "Go to Google Cloud Console → APIs & Services → Credentials. Create an OAuth 2.0 Client ID for a Web application.",
        type: "link",
        linkUrl: "https://console.cloud.google.com/apis/credentials",
        linkLabel: "Open Google Cloud Credentials",
      },
      {
        title: "Enter Credentials",
        description: "Paste the OAuth Client ID and Secret from the previous step.",
        type: "input",
        fields: [
          { key: "client_id", label: "OAuth Client ID", type: "text", placeholder: "Google Cloud OAuth client ID" },
          { key: "client_secret", label: "OAuth Client Secret", type: "password", placeholder: "Client secret" },
          { key: "folder_id", label: "Default Folder ID (optional)", type: "text", placeholder: "Google Drive folder ID" },
        ],
      },
    ],
  },
  google_sheets: {
    connectLabel: "Connect Google Sheets",
    steps: [
      {
        title: "Enable Sheets API & Get Key",
        description: "Enable Google Sheets API in Cloud Console and create an API key under Credentials.",
        type: "link",
        linkUrl: "https://console.cloud.google.com/apis/library/sheets.googleapis.com",
        linkLabel: "Enable Sheets API",
      },
      {
        title: "Enter Credentials",
        description: "Paste your API key and the Spreadsheet ID from your Google Sheets URL.",
        type: "input",
        fields: [
          { key: "api_key", label: "API Key", type: "password", placeholder: "Google Cloud API key" },
          { key: "spreadsheet_id", label: "Spreadsheet ID", type: "text", placeholder: "From the Google Sheets URL" },
        ],
      },
    ],
  },
  microsoft_outlook: {
    connectLabel: "Connect Outlook",
    steps: [
      {
        title: "Register Azure AD App",
        description: "Go to Azure Portal → App Registrations → New registration. Set the redirect URI and grant Mail.Send permission.",
        type: "link",
        linkUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
        linkLabel: "Open Azure Portal",
      },
      {
        title: "Enter Azure Credentials",
        description: "Copy the Application (Client) ID, Client Secret, and Directory (Tenant) ID from your Azure app registration.",
        type: "input",
        fields: [
          { key: "client_id", label: "Azure App Client ID", type: "text", placeholder: "Application (client) ID" },
          { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Azure AD client secret" },
          { key: "tenant_id", label: "Azure Tenant ID", type: "text", placeholder: "Directory (tenant) ID" },
          { key: "sender_email", label: "Sender Email", type: "text", placeholder: "noreply@yourcompany.com" },
        ],
      },
    ],
  },
  microsoft_teams: {
    connectLabel: "Add to Teams",
    steps: [
      {
        title: "Add Incoming Webhook to Teams",
        description: "In Microsoft Teams, go to your channel → Connectors → Incoming Webhook → Configure → Name it → Copy the webhook URL.",
        type: "link",
        linkUrl: "https://teams.microsoft.com/",
        linkLabel: "Open Microsoft Teams",
        imageTip: "Channel → ⋯ → Connectors → Incoming Webhook → Configure → Copy URL",
      },
      {
        title: "Paste Webhook URL",
        description: "Paste the webhook URL from Teams.",
        type: "input",
        fields: [
          { key: "webhook_url", label: "Incoming Webhook URL", type: "password", placeholder: "https://outlook.office.com/webhook/..." },
          { key: "default_channel", label: "Channel Name", type: "text", placeholder: "#general" },
        ],
      },
    ],
  },
  zapier: {
    connectLabel: "Connect Zapier",
    steps: [
      {
        title: "Create a Zap with Webhook Trigger",
        description: "In Zapier, create a new Zap → Choose 'Webhooks by Zapier' as the trigger → Select 'Catch Hook' → Copy the webhook URL shown.",
        type: "link",
        linkUrl: "https://zapier.com/app/editor",
        linkLabel: "Open Zapier Editor",
        imageTip: "New Zap → Trigger: 'Webhooks by Zapier' → 'Catch Hook' → Copy URL",
      },
      {
        title: "Paste Webhook URL",
        description: "Paste the Zapier webhook URL and specify which events should trigger the Zap.",
        type: "input",
        fields: [
          { key: "webhook_url", label: "Zapier Webhook URL", type: "password", placeholder: "https://hooks.zapier.com/hooks/catch/..." },
          { key: "events", label: "Trigger Events", type: "text", placeholder: "deal.created, invoice.paid", hint: "Comma-separated list of events" },
        ],
      },
    ],
  },
  make: {
    connectLabel: "Connect Make",
    steps: [
      {
        title: "Create a Scenario with Webhook",
        description: "In Make.com, create a new Scenario → Add a Webhook module → Copy the auto-generated URL.",
        type: "link",
        linkUrl: "https://www.make.com/en/login",
        linkLabel: "Open Make Dashboard",
        imageTip: "New Scenario → Add Module → Webhooks → Custom Webhook → Copy URL",
      },
      {
        title: "Paste Webhook URL",
        description: "Paste the Make webhook URL and specify trigger events.",
        type: "input",
        fields: [
          { key: "webhook_url", label: "Make Webhook URL", type: "password", placeholder: "https://hook.make.com/..." },
          { key: "events", label: "Trigger Events", type: "text", placeholder: "deal.created, invoice.paid" },
        ],
      },
    ],
  },
  quickbooks: {
    connectLabel: "Connect QuickBooks",
    steps: [
      {
        title: "Register Your App on Intuit",
        description: "Go to Intuit Developer → Dashboard → Create an App → Select 'QuickBooks Online and Payments' → Copy the Client ID and Secret.",
        type: "link",
        linkUrl: "https://developer.intuit.com/app/developer/dashboard",
        linkLabel: "Open Intuit Developer",
      },
      {
        title: "Enter QuickBooks Credentials",
        description: "Paste the OAuth Client ID, Client Secret, and Company ID (Realm ID) from your QuickBooks app.",
        type: "input",
        fields: [
          { key: "client_id", label: "Client ID", type: "text", placeholder: "QuickBooks OAuth Client ID" },
          { key: "client_secret", label: "Client Secret", type: "password", placeholder: "OAuth client secret" },
          { key: "realm_id", label: "Company ID (Realm ID)", type: "text", placeholder: "Your QuickBooks company ID" },
          { key: "environment", label: "Environment", type: "text", placeholder: "sandbox or production", default: "sandbox" },
        ],
      },
    ],
  },
  xero: {
    connectLabel: "Connect Xero",
    steps: [
      {
        title: "Register Your App on Xero",
        description: "Go to Xero Developer → My Apps → Create an App → Copy the Client ID and Client Secret.",
        type: "link",
        linkUrl: "https://developer.xero.com/app/manage/",
        linkLabel: "Open Xero Developer",
      },
      {
        title: "Enter Xero Credentials",
        description: "Paste the OAuth2 Client ID, Secret, and Tenant ID.",
        type: "input",
        fields: [
          { key: "client_id", label: "Client ID", type: "text", placeholder: "Xero OAuth2 Client ID" },
          { key: "client_secret", label: "Client Secret", type: "password", placeholder: "OAuth2 client secret" },
          { key: "tenant_id", label: "Xero Tenant ID", type: "text", placeholder: "Organisation tenant ID" },
        ],
      },
    ],
  },
  freshbooks: {
    connectLabel: "Connect FreshBooks",
    steps: [
      {
        title: "Register on FreshBooks Developer",
        description: "Go to FreshBooks Developer Portal → Create an App → Copy the Client ID and Client Secret.",
        type: "link",
        linkUrl: "https://my.freshbooks.com/#/developer",
        linkLabel: "Open FreshBooks Developer",
      },
      {
        title: "Enter FreshBooks Credentials",
        description: "Paste your API credentials.",
        type: "input",
        fields: [
          { key: "client_id", label: "Client ID", type: "text", placeholder: "FreshBooks API client ID" },
          { key: "client_secret", label: "Client Secret", type: "password", placeholder: "API client secret" },
          { key: "account_id", label: "Account ID", type: "text", placeholder: "Your FreshBooks account ID" },
        ],
      },
    ],
  },
};

interface Props {
  integrationKey: string;
  integrationName: string;
  icon: any;
  currentConfig: Record<string, any>;
  onSave: (config: Record<string, any>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function IntegrationSetupWizard({ integrationKey, integrationName, icon: Icon, currentConfig, onSave, onClose, saving }: Props) {
  const wizardConfig = WIZARD_CONFIGS[integrationKey];
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    if (wizardConfig) {
      wizardConfig.steps.forEach(step => {
        step.fields?.forEach(f => {
          defaults[f.key] = currentConfig[f.key] || f.default || "";
        });
      });
    }
    return defaults;
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  if (!wizardConfig) return null;

  const steps = wizardConfig.steps;
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      // Collect all field values from all steps
      const config: Record<string, any> = { ...formValues };
      onSave(config);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (isFirstStep) {
      onClose();
    } else {
      setCurrentStep(s => s - 1);
    }
  };

  const allFieldsFilled = () => {
    if (step.type !== "input" || !step.fields) return true;
    return step.fields.every(f => {
      if (f.default) return true; // has default
      return (formValues[f.key] || "").trim().length > 0;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">Connect {integrationName}</h2>
              <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary/60" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-5 space-y-4 min-h-[250px]">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Image/Tip callout */}
          {step.imageTip && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary font-medium">{step.imageTip}</p>
            </div>
          )}

          {/* Link button */}
          {step.type === "link" && step.linkUrl && (
            <a
              href={step.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {step.linkLabel || "Open Link"}
            </a>
          )}

          {/* Input fields */}
          {step.type === "input" && step.fields && (
            <div className="space-y-3">
              {step.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                      value={formValues[field.key] || ""}
                      onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {field.type === "password" && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                  {field.hint && <p className="text-[10px] text-muted-foreground mt-1">{field.hint}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isFirstStep ? "Cancel" : "Back"}
          </button>

          <button
            onClick={handleNext}
            disabled={isLastStep && (!allFieldsFilled() || saving)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isLastStep ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            {isLastStep ? "Connect & Save" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { WIZARD_CONFIGS };
