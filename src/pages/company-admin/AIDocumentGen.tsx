import { useState } from "react";
import { FileText, Loader2, Sparkles, Download, Copy, Check, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import ReactMarkdown from "react-markdown";

const docTypes = [
  { value: "proposal", label: "Business Proposal", desc: "Client-facing proposals with pricing & scope" },
  { value: "contract", label: "Service Contract", desc: "Legal agreements and service terms" },
  { value: "report", label: "Business Report", desc: "Performance reports with data insights" },
  { value: "sow", label: "Statement of Work", desc: "Project scope, deliverables & timeline" },
  { value: "nda", label: "NDA", desc: "Non-disclosure / confidentiality agreement" },
  { value: "memo", label: "Internal Memo", desc: "Company-wide announcements & updates" },
];

interface DocResult {
  title: string;
  content: string;
  summary: string;
  sections: string[];
  metadata: { word_count?: number; document_type?: string; date_generated?: string; confidentiality?: string };
}

export default function AIDocumentGen() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState("proposal");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState<DocResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!tenantId) { toast.error("No company selected"); return; }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-document-gen", { body: { tenant_id: tenantId, doc_type: docType, context: instructions } });
      if (error) throw error;
      if (data?.result) setResult(data.result);
      else throw new Error("No result returned");
      toast.success("Document generated");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadAsFile = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Smart Document Generator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">AI generates professional documents using your real business data</p>
      </div>

      {/* Generator Form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Generate Document</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Document Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {docTypes.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => setDocType(dt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    docType === dt.value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{dt.label}</p>
                  <p className="text-xs text-muted-foreground">{dt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Instructions (optional)</label>
            <Textarea
              placeholder="e.g., Create a proposal for ABC Corp for our premium plan, include pricing for 50 users, 1-year contract..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
            />
          </div>

          <Button onClick={generate} disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? "Generating..." : "Generate Document"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{result.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                {result.metadata?.confidentiality && (
                  <Badge variant="outline">{result.metadata.confidentiality}</Badge>
                )}
                {result.metadata?.word_count && (
                  <Badge variant="secondary">{result.metadata.word_count} words</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Section Nav */}
            {result.sections?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-border">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                {result.sections.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}

            {/* Document Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result.content}</ReactMarkdown>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadAsFile}>
                <Download className="h-4 w-4 mr-1" /> Download .md
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
