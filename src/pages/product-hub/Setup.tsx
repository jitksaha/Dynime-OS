import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Loader2, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POS_BUSINESS_TYPES, usePosConfig } from "@/hooks/usePosConfig";
import { toast } from "sonner";

export default function POSSetup() {
  const navigate = useNavigate();
  const { setupPOS } = usePosConfig();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSetup = async () => {
    if (!selected) return;
    const type = POS_BUSINESS_TYPES.find((t) => t.key === selected);
    if (!type) return;
    setSaving(true);
    try {
      await setupPOS(type.key, type.label);
      toast.success(`POS configured as ${type.label}`);
      navigate("/pos/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to setup POS");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Set Up Your Point of Sale</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose your business type to get a specialized POS experience tailored to your needs. This can only be set once.
          </p>
        </motion.div>

        {/* Business Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {POS_BUSINESS_TYPES.map((type, i) => {
            const isSelected = selected === type.key;
            return (
              <motion.button
                key={type.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelected(type.key)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 bg-gradient-to-br ${type.color} ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]"
                    : "border-border hover:border-primary/40 hover:shadow-md"
                }`}
              >
                {/* Selection indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-3 right-3 h-7 w-7 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">{type.icon}</span>
                  {type.free && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      Free
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{type.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{type.description}</p>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5">
                  {type.features.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-full bg-background/60 text-[10px] font-medium text-muted-foreground capitalize"
                    >
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                  {type.features.length > 4 && (
                    <span className="px-2 py-0.5 rounded-full bg-background/60 text-[10px] font-medium text-muted-foreground">
                      +{type.features.length - 4} more
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <Button
            size="lg"
            className="px-8 gap-2 text-base"
            disabled={!selected || saving}
            onClick={handleSetup}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Activate POS Module
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Your POS will be customized based on your selection
          </p>
        </motion.div>
      </div>
    </div>
  );
}
