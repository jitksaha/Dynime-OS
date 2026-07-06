import { motion } from "framer-motion";

export function AnimatedHRMS({ className = "" }: { className?: string }) {
  const employees = [
    { x: 60, y: 100, color: "hsl(243,75%,58%)" },
    { x: 180, y: 100, color: "hsl(142,71%,45%)" },
    { x: 300, y: 100, color: "hsl(270,80%,60%)" },
    { x: 420, y: 100, color: "hsl(38,92%,50%)" },
  ];

  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 480 360" fill="none" className="w-full h-full">
        <rect width="480" height="360" rx="16" className="fill-muted/20" />
        
        {/* Org chart connections */}
        <motion.path d="M240 50 L240 70" className="stroke-primary/30" strokeWidth="2"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4 }}
        />
        {employees.map((emp, i) => (
          <motion.path key={`conn-${i}`} d={`M240 70 L${emp.x} ${emp.y - 20}`}
            className="stroke-border" strokeWidth="1.5" strokeDasharray="4 3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6 + i * 0.1 }}
          />
        ))}
        
        {/* Manager node */}
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <rect x="192" y="20" width="96" height="36" rx="18" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5" />
          <circle cx="218" cy="38" r="10" className="fill-primary/20" />
          <rect x="234" y="34" width="40" height="6" rx="3" className="fill-primary/30" />
        </motion.g>
        
        {/* Employee cards */}
        {employees.map((emp, i) => (
          <motion.g key={`emp-${i}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, type: "spring" }}
          >
            <rect x={emp.x - 40} y={emp.y} width="80" height="70" rx="10"
              className="fill-card stroke-border" strokeWidth="1"
            />
            <circle cx={emp.x} cy={emp.y + 22} r="14" fill={emp.color + "20"} />
            <circle cx={emp.x} cy={emp.y + 18} r="5" fill={emp.color + "40"} />
            <rect x={emp.x - 4} y={emp.y + 24} width="8" height="6" rx="2" fill={emp.color + "30"} />
            <rect x={emp.x - 20} y={emp.y + 46} width="40" height="6" rx="3" fill={emp.color + "25"} />
            <rect x={emp.x - 14} y={emp.y + 56} width="28" height="4" rx="2" className="fill-muted-foreground/15" />
          </motion.g>
        ))}
        
        {/* Attendance table */}
        <motion.rect x="30" y="200" width="200" height="130" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}
        />
        <motion.rect x="30" y="200" width="200" height="28" rx="10" className="fill-muted/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
        />
        <motion.text x="50" y="218" className="fill-foreground/40" fontSize="9" fontWeight="600"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        >Attendance Today</motion.text>
        {[0, 1, 2, 3].map(i => (
          <motion.g key={`att-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3 + i * 0.1 }}
          >
            <circle cx="50" cy={244 + i * 22} r="6" className="fill-primary/15" />
            <rect x="64" y={240 + i * 22} width="60" height="6" rx="3" className="fill-muted" />
            <motion.rect x="180" y={240 + i * 22} width="32" height="6" rx="3"
              className={i < 3 ? "fill-success/30" : "fill-warning/30"}
              initial={{ width: 0 }} animate={{ width: 32 }} transition={{ delay: 1.5 + i * 0.1 }}
            />
          </motion.g>
        ))}
        
        {/* Leave calendar */}
        <motion.rect x="250" y="200" width="200" height="130" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }}
        />
        <motion.rect x="250" y="200" width="200" height="28" rx="10" className="fill-muted/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        />
        <motion.text x="270" y="218" className="fill-foreground/40" fontSize="9" fontWeight="600"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
        >Leave Calendar</motion.text>
        {/* Calendar grid */}
        {Array.from({ length: 20 }).map((_, i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          const isHighlighted = [3, 7, 12, 16].includes(i);
          return (
            <motion.rect key={`cal-${i}`}
              x={268 + col * 34} y={238 + row * 20} width="26" height="14" rx="3"
              className={isHighlighted ? "fill-primary/15 stroke-primary/20" : "fill-muted/40"}
              strokeWidth={isHighlighted ? "1" : "0"}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4 + i * 0.03 }}
            />
          );
        })}
      </svg>
    </div>
  );
}
