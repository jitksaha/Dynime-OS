import { useEffect, useState } from "react";
import { Smartphone, Apple, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const AppDownload = () => {
  const [platform, setPlatform] = useState<"android" | "ios" | "unknown">("unknown");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
  }, []);

  const appName = new URLSearchParams(window.location.search).get("name") || "Our App";
  const pwaUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Download {appName}</h1>
          <p className="text-sm text-muted-foreground">
            Get the app on your device for the best experience
          </p>
        </div>

        {/* Download Options */}
        <div className="space-y-3">
          {/* Android */}
          <Card className={platform === "android" ? "ring-2 ring-primary" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-6 w-6 text-chart-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Android</p>
                  <p className="text-xs text-muted-foreground">APK / Play Store</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    // PWA install prompt for Android
                    window.location.href = pwaUrl + "?utm_source=qr&install=true";
                  }}
                >
                  <Download className="h-4 w-4" /> Install
                </Button>
              </div>
              {platform === "android" && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-chart-2 font-medium">✓ Detected — You're on Android</p>
                  <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                    <li>Tap <strong>Install</strong> above</li>
                    <li>In Chrome, tap <strong>⋮</strong> → <strong>"Install app"</strong></li>
                    <li>The app will appear on your home screen</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>

          {/* iOS */}
          <Card className={platform === "ios" ? "ring-2 ring-primary" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Apple className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">iOS</p>
                  <p className="text-xs text-muted-foreground">iPhone / iPad</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    window.location.href = pwaUrl + "?utm_source=qr&install=true";
                  }}
                >
                  <Download className="h-4 w-4" /> Install
                </Button>
              </div>
              {platform === "ios" && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-primary font-medium">✓ Detected — You're on iOS</p>
                  <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                    <li>Tap <strong>Install</strong> above to open in Safari</li>
                    <li>Tap the <strong>Share</strong> button (box with arrow)</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> to confirm</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            No app store download needed — installs directly as a lightweight app on your device.
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            Works offline • Fast & secure • Auto-updates
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppDownload;
