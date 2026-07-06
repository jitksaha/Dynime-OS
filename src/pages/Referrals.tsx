// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Copy, Gift, Users, DollarSign, Share2, Link2, Settings, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function Referrals() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { formatPrice: fp } = useTenantCurrency();
  const { appInfo } = useAppInfo();
  const [referralCode, setReferralCode] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user && tenantId) loadData();
  }, [user, tenantId]);

  const loadData = async () => {
    setLoading(true);
    const [codeRes, refRes, earnRes, settRes] = await Promise.all([
      supabase.from("referral_codes").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("referrals").select("*").eq("referrer_user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("referral_earnings").select("*").eq("referrer_user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("referral_settings").select("*").eq("tenant_id", tenantId!).maybeSingle(),
    ]);
    setReferralCode(codeRes.data);
    setReferrals(refRes.data || []);
    setEarnings(earnRes.data || []);
    setSettings(settRes.data);
    setLoading(false);
  };

  const generateCode = async () => {
    if (!user || !tenantId) return;
    setGenerating(true);
    const code = `BOOST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { data, error } = await supabase.from("referral_codes").insert({
      user_id: user.id,
      tenant_id: tenantId,
      code,
      commission_type: settings?.default_reward_type === "percentage" ? "percentage" : "free_month",
      commission_percentage: settings?.commission_percentage || 10,
    }).select().single();
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setReferralCode(data); toast({ title: "Referral code generated!", description: `Your code: ${code}` }); }
    setGenerating(false);
  };

  const getReferralLink = () => {
    if (!referralCode) return "";

    const host = window.location.hostname.toLowerCase();
    const isPreviewHost = host.includes("preview--");

    const normalizedSiteUrl = (appInfo.site_url || "").replace(/\/+$/, "");
    const fallbackOrigin = window.location.origin.replace(/\/+$/, "");
    const baseUrl = isPreviewHost
      ? (normalizedSiteUrl || fallbackOrigin)
      : fallbackOrigin;

    return `${baseUrl}/invite/signup?ref=${referralCode.code}`;
  };

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(getReferralLink());
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const acceptedReferrals = referrals.filter(r => r.status === "accepted" || r.status === "rewarded").length;
  const pendingReferrals = referrals.filter(r => r.status === "pending").length;

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referral Program</h1>
        <p className="text-muted-foreground">Invite others and earn rewards — free months or commission on their subscriptions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{referrals.length}</p><p className="text-xs text-muted-foreground">Total Referrals</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Gift className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold text-foreground">{acceptedReferrals}</p><p className="text-xs text-muted-foreground">Accepted</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-yellow-500" /></div><div><p className="text-2xl font-bold text-foreground">{pendingReferrals}</p><p className="text-xs text-muted-foreground">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold text-foreground">{fp(totalEarnings)}</p><p className="text-xs text-muted-foreground">Total Earnings</p></div></div></CardContent></Card>
      </div>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Your Referral Link</CardTitle>
          <CardDescription>Share your unique link. Both you and your friend get rewarded!</CardDescription>
        </CardHeader>
        <CardContent>
          {referralCode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input readOnly value={getReferralLink()} className="pr-20 font-mono text-sm" />
                  <Button size="sm" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Code: <Badge variant="secondary" className="font-mono">{referralCode.code}</Badge></span>
                <span>Type: <Badge variant="outline">{referralCode.commission_type === "free_month" ? "Free Month" : `${referralCode.commission_percentage}% Commission`}</Badge></span>
                <span>Status: <Badge variant={referralCode.is_active ? "default" : "destructive"}>{referralCode.is_active ? "Active" : "Inactive"}</Badge></span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">How it works:</p>
                <p className="text-muted-foreground">1. Share your referral link with friends or colleagues</p>
                <p className="text-muted-foreground">2. They sign up and subscribe to a paid plan</p>
                <p className="text-muted-foreground">3. {referralCode.commission_type === "free_month" ? "Both you and your friend get 1 month free!" : `You earn ${referralCode.commission_percentage}% commission on their subscription payments`}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Link2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">You don't have a referral code yet. Generate one to start earning!</p>
              <Button onClick={generateCode} disabled={generating}>{generating ? "Generating..." : "Generate Referral Code"}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="referrals">
        <TabsList><TabsTrigger value="referrals">Referrals</TabsTrigger><TabsTrigger value="earnings">Earnings</TabsTrigger></TabsList>
        <TabsContent value="referrals">
          <Card>
            <CardContent className="pt-6">
              {referrals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No referrals yet. Share your link to get started!</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Reward</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {referrals.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.created_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell><Badge variant={r.status === "rewarded" ? "default" : r.status === "accepted" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                        <TableCell>{r.reward_type === "free_month" ? "Free Month" : "Commission"}</TableCell>
                        <TableCell>{r.reward_type === "commission" ? fp(r.reward_amount) : "1 Month"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="earnings">
          <Card>
            <CardContent className="pt-6">
              {earnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No earnings yet.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {earnings.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{format(new Date(e.created_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{e.earning_type === "free_month" ? "Free Month" : "Commission"}</TableCell>
                        <TableCell>{fp(e.amount)}</TableCell>
                        <TableCell><Badge variant={e.status === "paid" ? "default" : e.status === "approved" ? "secondary" : "outline"}>{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
