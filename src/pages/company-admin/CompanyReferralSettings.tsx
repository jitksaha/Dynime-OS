// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Settings, Users, DollarSign, Gift, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function CompanyReferralSettings() {
  const { tenantId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [settings, setSettings] = useState<any>(null);
  const [allCodes, setAllCodes] = useState<any[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    program_enabled: true,
    default_reward_type: "free_month",
    commission_percentage: 10,
    free_month_for_referrer: true,
    free_month_for_referred: true,
    min_subscription_months: 1,
    max_referrals_per_user: 0,
  });

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    const [settRes, codesRes, refsRes] = await Promise.all([
      supabase.from("referral_settings").select("*").eq("tenant_id", tenantId!).maybeSingle(),
      supabase.from("referral_codes").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }),
      supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (settRes.data) {
      setSettings(settRes.data);
      setForm({
        program_enabled: settRes.data.program_enabled,
        default_reward_type: settRes.data.default_reward_type,
        commission_percentage: settRes.data.commission_percentage,
        free_month_for_referrer: settRes.data.free_month_for_referrer,
        free_month_for_referred: settRes.data.free_month_for_referred,
        min_subscription_months: settRes.data.min_subscription_months,
        max_referrals_per_user: settRes.data.max_referrals_per_user,
      });
    }
    setAllCodes(codesRes.data || []);
    setAllReferrals(refsRes.data || []);
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!tenantId) return;
    setSaving(true);
    const payload = { ...form, tenant_id: tenantId };
    const { error } = settings
      ? await supabase.from("referral_settings").update(payload).eq("id", settings.id)
      : await supabase.from("referral_settings").insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved", description: "Referral settings updated." }); loadData(); }
    setSaving(false);
  };

  const totalReferrals = allCodes.reduce((s, c) => s + (c.total_referrals || 0), 0);
  const totalEarnings = allCodes.reduce((s, c) => s + Number(c.total_earnings || 0), 0);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referral Program Settings</h1>
        <p className="text-muted-foreground">Configure your company's referral and affiliate program.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{allCodes.length}</p><p className="text-xs text-muted-foreground">Active Codes</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Gift className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{totalReferrals}</p><p className="text-xs text-muted-foreground">Total Referrals</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p><p className="text-xs text-muted-foreground">Total Earnings</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-yellow-500" /></div><div><p className="text-2xl font-bold">{form.commission_percentage}%</p><p className="text-xs text-muted-foreground">Commission Rate</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList><TabsTrigger value="settings">Settings</TabsTrigger><TabsTrigger value="codes">Referral Codes</TabsTrigger><TabsTrigger value="referrals">Referrals</TabsTrigger></TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Program Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div><Label className="text-base">Enable Referral Program</Label><p className="text-sm text-muted-foreground">Allow users to generate referral codes</p></div>
                <Switch checked={form.program_enabled} onCheckedChange={v => setForm(p => ({ ...p, program_enabled: v }))} />
              </div>

              <div className="space-y-2">
                <Label>Default Reward Type</Label>
                <Select value={form.default_reward_type} onValueChange={v => setForm(p => ({ ...p, default_reward_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_month">Free Month</SelectItem>
                    <SelectItem value="percentage">Commission Percentage</SelectItem>
                    <SelectItem value="both">Both (User Chooses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Commission Percentage: {form.commission_percentage}%</Label>
                <Slider min={5} max={50} step={5} value={[form.commission_percentage]} onValueChange={([v]) => setForm(p => ({ ...p, commission_percentage: v }))} />
                <p className="text-xs text-muted-foreground">Referrers earn this % from referred users' subscription payments (5%–50%)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div><Label>Free Month for Referrer</Label><p className="text-xs text-muted-foreground">Referrer gets 1 free month</p></div>
                  <Switch checked={form.free_month_for_referrer} onCheckedChange={v => setForm(p => ({ ...p, free_month_for_referrer: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div><Label>Free Month for Referred</Label><p className="text-xs text-muted-foreground">New user gets 1 free month</p></div>
                  <Switch checked={form.free_month_for_referred} onCheckedChange={v => setForm(p => ({ ...p, free_month_for_referred: v }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Subscription Months for Reward</Label>
                  <Input type="number" min={1} max={12} value={form.min_subscription_months} onChange={e => setForm(p => ({ ...p, min_subscription_months: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Referrals per User (0 = unlimited)</Label>
                  <Input type="number" min={0} value={form.max_referrals_per_user} onChange={e => setForm(p => ({ ...p, max_referrals_per_user: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes">
          <Card><CardContent className="pt-6">
            {allCodes.length === 0 ? <p className="text-center text-muted-foreground py-8">No referral codes generated yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Referrals</TableHead><TableHead>Earnings</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>{allCodes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell><Badge variant="outline">{c.commission_type}</Badge></TableCell>
                    <TableCell>{c.total_referrals}</TableCell>
                    <TableCell>${Number(c.total_earnings).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={c.is_active ? "default" : "destructive"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>{format(new Date(c.created_at), "MMM dd, yyyy")}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card><CardContent className="pt-6">
            {allReferrals.length === 0 ? <p className="text-center text-muted-foreground py-8">No referrals yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Reward Type</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>{allReferrals.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell><Badge variant={r.status === "rewarded" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                    <TableCell>{r.reward_type === "free_month" ? "Free Month" : "Commission"}</TableCell>
                    <TableCell>{r.reward_type === "commission" ? formatPrice(Number(r.reward_amount)) : "1 Month"}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
