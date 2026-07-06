import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { POS_BUSINESS_TYPES, usePosConfig } from "@/hooks/usePosConfig";
import { Settings2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PosTypeSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export function PosTypeSwitcher({ open, onClose }: PosTypeSwitcherProps) {
  const { businessType, setupPOS, refetch } = usePosConfig();
  const [selected, setSelected] = useState<string | null>(businessType);
  const [saving, setSaving] = useState(false);

  const handleSwitch = async () => {
    if (!selected || selected === businessType) { onClose(); return; }
    const type = POS_BUSINESS_TYPES.find(t => t.key === selected);
    if (!type) return;
    setSaving(true);
    try {
      await setupPOS(type.key, type.label);
      await refetch();
      toast.success(`POS switched to ${type.label}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to switch POS type");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Change POS Type
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground mb-3">
          Switch your POS mode to match your business. Your products and orders stay intact.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POS_BUSINESS_TYPES.map((type) => {
            const isActive = selected === type.key;
            const isCurrent = businessType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => setSelected(type.key)}
                className={`relative p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-primary/30 bg-card"
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Current
                  </span>
                )}
                <span className="text-2xl mb-2 block">{type.icon}</span>
                <p className="text-sm font-bold text-foreground">{type.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {type.description}
                </p>
                {isActive && (
                  <div className="absolute bottom-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSwitch}
            disabled={saving || !selected || selected === businessType}
            className="gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Switch POS Type
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
