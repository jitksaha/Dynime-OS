import { useState } from "react";
import { Server, Copy, CheckCircle2, ArrowRight, Download, Terminal, Key, Rocket, Package } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function CopyBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-[11px] font-medium text-muted-foreground">{label}</p>}
      <div className="relative bg-secondary/80 rounded-lg p-3 font-mono text-xs border border-border">
        <pre className="whitespace-pre-wrap pr-8">{code}</pre>
        <button
          onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied!"); }}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border transition-colors"
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

const steps = [
  {
    icon: Download,
    title: "Clone & Install",
    desc: "Get the code on your server",
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Clone the repository and install dependencies.</p>
        <CopyBlock code={`git clone <your-repo-url> myapp
cd myapp
npm install`} />
      </div>
    ),
  },
  {
    icon: Terminal,
    title: "Setup Database",
    desc: "One command to create all tables",
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Create a free database at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">supabase.com</a>, then run:
        </p>
        <CopyBlock code={`npm install -g supabase
supabase link --project-ref YOUR_PROJECT_ID
supabase db push`} />
        <p className="text-[11px] text-muted-foreground">Find your Project ID in Supabase → Settings → General.</p>
      </div>
    ),
  },
  {
    icon: Key,
    title: "Add Keys",
    desc: "Paste 2 values into a .env file",
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Create a <code className="bg-secondary px-1 rounded text-[11px]">.env</code> file in the project root with your Supabase keys (found in Settings → API):
        </p>
        <CopyBlock code={`VITE_SUPABASE_URL=https://YOUR_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key`} />
      </div>
    ),
  },
  {
    icon: Rocket,
    title: "Deploy",
    desc: "Push to any hosting in 1 click",
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Pick any option — all work with a simple Git push:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { name: "Vercel", url: "https://vercel.com/new", note: "Preset: Vite" },
            { name: "Netlify", url: "https://app.netlify.com/start", note: "Build: npm run build" },
            { name: "Cloudflare", url: "https://dash.cloudflare.com/?to=/:account/pages", note: "Output: dist" },
          ].map((h) => (
            <a key={h.name} href={h.url} target="_blank" rel="noreferrer"
              className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-center">
              <span className="text-xs font-semibold text-foreground">{h.name}</span>
              <span className="text-[10px] text-muted-foreground">{h.note}</span>
            </a>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Add your <code className="bg-secondary px-1 rounded">.env</code> values in the hosting dashboard's environment variables section.</p>
      </div>
    ),
  },
  {
    icon: Package,
    title: "Edge Functions (Optional)",
    desc: "Deploy backend functions if needed",
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">If you use backend functions, deploy them with one command:</p>
        <CopyBlock code="supabase functions deploy --project-ref YOUR_PROJECT_ID" />
      </div>
    ),
  },
];

export default function SelfHostingGuide() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState(0);

  const toggleComplete = (i: number) => {
    const next = new Set(completed);
    if (next.has(i)) next.delete(i); else next.add(i);
    setCompleted(next);
    // Auto-advance to next incomplete step
    if (!next.has(i)) return;
    const nextIncomplete = steps.findIndex((_, idx) => idx > i && !next.has(idx));
    if (nextIncomplete !== -1) setActiveStep(nextIncomplete);
  };

  const progress = Math.round((completed.size / steps.length) * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> Self-Hosting Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">5 simple steps to host on your own server</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          {completed.size}/{steps.length} done
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress value={progress} className="h-2" />
        <p className="text-[11px] text-muted-foreground text-right">{progress}% complete</p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isActive = activeStep === i;
          const isDone = completed.has(i);
          const Icon = step.icon;

          return (
            <div key={i} className={`border rounded-xl overflow-hidden transition-colors ${isDone ? "border-green-500/30 bg-green-500/5" : isActive ? "border-primary/30 bg-card" : "border-border bg-card"}`}>
              <button
                onClick={() => setActiveStep(isActive ? -1 : i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isDone ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground">STEP {i + 1}</span>
                    {isDone && <span className="text-[10px] text-green-500 font-medium">✓ Done</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                <ArrowRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />
              </button>

              {isActive && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="pt-4 space-y-3">
                    {step.content}
                    <Button
                      size="sm"
                      variant={isDone ? "outline" : "default"}
                      className="text-xs"
                      onClick={() => toggleComplete(i)}
                    >
                      {isDone ? "Mark as incomplete" : "Mark as done"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Docker option */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
            Alternative
          </Badge>
          <h2 className="text-sm font-semibold text-foreground">One-Command Docker Setup</h2>
        </div>
        <p className="text-xs text-muted-foreground">Skip all steps above — run everything with Docker:</p>
        <CopyBlock code={`git clone <your-repo-url> myapp && cd myapp
cp .env.example .env  # add your keys
docker compose up -d`} />
      </div>
    </div>
  );
}
