import { motion } from "framer-motion";

export function AnimatedDashboard({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 480 360" fill="none" className="w-full h-full">
        {/* Background */}
        <rect width="480" height="360" rx="16" className="fill-muted/30" />
        
        {/* Sidebar */}
        <motion.rect x="0" y="0" width="72" height="360" rx="16" className="fill-primary/8"
          initial={{ x: -72 }} animate={{ x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        />
        {[40, 80, 120, 160, 200].map((y, i) => (
          <motion.rect key={y} x="20" y={y} width="32" height="8" rx="4" className="fill-primary/20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }}
          />
        ))}
        <motion.rect x="16" y="40" width="40" height="8" rx="4" className="fill-primary/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        />
        
        {/* Top bar */}
        <motion.rect x="88" y="16" width="376" height="40" rx="8" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        />
        <motion.rect x="104" y="30" width="120" height="12" rx="6" className="fill-muted"
          initial={{ width: 0 }} animate={{ width: 120 }} transition={{ delay: 0.5, duration: 0.4 }}
        />
        
        {/* KPI Cards */}
        {[0, 1, 2, 3].map(i => (
          <motion.g key={`kpi-${i}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.12 }}
          >
            <rect x={96 + i * 92} y="72" width="84" height="56" rx="8" className="fill-card stroke-border" strokeWidth="1" />
            <rect x={104 + i * 92} y="82" width="20" height="20" rx="6" className="fill-primary/12" />
            <motion.rect x={104 + i * 92} y="110" width={40 + i * 5} height="8" rx="4" className="fill-primary/30"
              initial={{ width: 0 }} animate={{ width: 40 + i * 5 }} transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
            />
          </motion.g>
        ))}
        
        {/* Chart area */}
        <motion.rect x="96" y="144" width="240" height="140" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        />
        {/* Animated bar chart */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.rect
            key={`bar-${i}`}
            x={116 + i * 34}
            width="20" rx="4"
            className="fill-primary/40"
            initial={{ y: 274, height: 0 }}
            animate={{ y: 274 - (30 + Math.random() * 70), height: 30 + Math.random() * 70 }}
            transition={{ delay: 1 + i * 0.1, duration: 0.6, ease: "easeOut" }}
          />
        ))}
        
        {/* Side panel */}
        <motion.rect x="348" y="144" width="116" height="140" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
        />
        {/* Donut chart */}
        <motion.circle cx="406" cy="200" r="28" className="stroke-primary/20" strokeWidth="8" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.2, duration: 1 }}
        />
        <motion.circle cx="406" cy="200" r="28" className="stroke-primary" strokeWidth="8" fill="none"
          strokeDasharray="176" strokeLinecap="round"
          initial={{ strokeDashoffset: 176 }} animate={{ strokeDashoffset: 55 }}
          transition={{ delay: 1.4, duration: 1, ease: "easeOut" }}
        />
        
        {/* Activity list */}
        <motion.rect x="96" y="300" width="368" height="44" rx="8" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
        />
        {[0, 1, 2].map(i => (
          <motion.rect key={`act-${i}`} x={108 + i * 120} y="316" width="80" height="8" rx="4" className="fill-muted"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + i * 0.1 }}
          />
        ))}
      </svg>
      
      {/* Floating notification */}
      <motion.div
        className="absolute top-16 right-4 w-36 rounded-lg border border-border bg-card shadow-lg p-2.5"
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.8, type: "spring" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-success" />
          </div>
          <div>
            <div className="h-2 w-16 rounded bg-foreground/20" />
            <div className="h-1.5 w-10 rounded bg-muted-foreground/20 mt-1" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
