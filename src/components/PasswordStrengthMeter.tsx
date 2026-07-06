import { evaluatePasswordStrength } from "@/lib/security-utils";
import { motion } from "framer-motion";

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const { score, label, color, suggestions } = evaluatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            style={{
              backgroundColor: i <= score - 1 ? color : "hsl(var(--muted))",
              transformOrigin: "left",
            }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{ color }}>
          {label}
        </span>
        {suggestions.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {suggestions[0]}
          </span>
        )}
      </div>
    </div>
  );
}
