import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Camera, Keyboard, X } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open && mode === "manual") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  // Camera mode
  useEffect(() => {
    if (!open || mode !== "camera") return;
    let cancelled = false;

    const startCamera = async () => {
      try {
        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        setCameraError("Camera access denied. Use manual entry instead.");
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open, mode]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setManualCode("");
    }
  }, [open]);

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Scan Barcode / QR Code
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => setMode("manual")}
          >
            <Keyboard className="h-3.5 w-3.5" /> Manual Entry
          </Button>
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => setMode("camera")}
          >
            <Camera className="h-3.5 w-3.5" /> Camera
          </Button>
        </div>

        {mode === "manual" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter barcode number manually or use a USB/Bluetooth barcode scanner
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleManualSubmit(); }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or type barcode..."
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={!manualCode.trim()}>
                Add
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center">
              💡 USB barcode scanners work automatically — just scan and it enters the code
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cameraError ? (
              <div className="text-center py-8">
                <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-destructive">{cameraError}</p>
              </div>
            ) : (
              <>
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-primary/60 rounded-xl" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Point camera at barcode. For best results use a USB scanner in manual mode.
                </p>
                {/* Manual fallback while camera is on */}
                <form onSubmit={(e) => { e.preventDefault(); handleManualSubmit(); }} className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Or type code manually..."
                    className="flex-1 h-8 text-xs"
                  />
                  <Button type="submit" size="sm" disabled={!manualCode.trim()}>Go</Button>
                </form>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline barcode listener hook — listens for rapid keystrokes
 * from a USB/Bluetooth barcode scanner anywhere on the page.
 */
export function useBarcodeScanListener(onScan: (code: string) => void, enabled = true) {
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Enter" && bufferRef.current.length >= 3) {
        onScan(bufferRef.current);
        bufferRef.current = "";
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { bufferRef.current = ""; }, 150);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(timerRef.current);
    };
  }, [onScan, enabled]);
}
