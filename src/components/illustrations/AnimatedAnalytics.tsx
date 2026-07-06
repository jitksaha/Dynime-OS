import { motion } from "framer-motion";

export function AnimatedAnalytics({ className = "" }: { className?: string }) {
  const barHeights = [65, 90, 45, 110, 75, 100, 55, 85];
  
  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 480 360" fill="none" className="w-full h-full">
        <rect width="480" height="360" rx="16" className="fill-muted/20" />
        
        {/* Header area */}
        <motion.rect x="24" y="20" width="140" height="14" rx="7" className="fill-foreground/15"
          initial={{ width: 0 }} animate={{ width: 140 }} transition={{ delay: 0.2, duration: 0.4 }}
        />
        <motion.rect x="24" y="42" width="200" height="8" rx="4" className="fill-muted-foreground/15"
          initial={{ width: 0 }} animate={{ width: 200 }} transition={{ delay: 0.3, duration: 0.4 }}
        />
        
        {/* Line chart */}
        <motion.rect x="24" y="68" width="280" height="150" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        />
        {/* Grid lines */}
        {[0, 1, 2, 3].map(i => (
          <motion.line key={`grid-${i}`} x1="40" y1={96 + i * 30} x2="288" y2={96 + i * 30}
            className="stroke-border/50" strokeWidth="0.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05 }}
          />
        ))}
        {/* Animated line */}
        <motion.path
          d="M50 170 Q90 140, 120 155 T190 120 T250 100 T280 130"
          className="stroke-primary" strokeWidth="2.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
        />
        {/* Area fill */}
        <motion.path
          d="M50 170 Q90 140, 120 155 T190 120 T250 100 T280 130 L280 205 L50 205 Z"
          className="fill-primary/8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        />
        {/* Data points */}
        {[[50, 170], [120, 155], [190, 120], [250, 100], [280, 130]].map(([cx, cy], i) => (
          <motion.circle key={`dp-${i}`} cx={cx} cy={cy} r="4"
            className="fill-primary stroke-card" strokeWidth="2"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 1 + i * 0.15, type: "spring" }}
          />
        ))}
        
        {/* Pie chart */}
        <motion.rect x="320" y="68" width="140" height="150" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
        />
        <motion.circle cx="390" cy="130" r="40" className="stroke-primary/20" strokeWidth="16" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.8 }}
        />
        <motion.circle cx="390" cy="130" r="40" className="stroke-primary" strokeWidth="16" fill="none"
          strokeDasharray="251" strokeDashoffset="88" strokeLinecap="round"
          initial={{ strokeDashoffset: 251 }} animate={{ strokeDashoffset: 88 }}
          transition={{ delay: 1.2, duration: 1 }}
        />
        <motion.circle cx="390" cy="130" r="40" className="stroke-success" strokeWidth="16" fill="none"
          strokeDasharray="251" strokeDashoffset="188" strokeLinecap="round"
          style={{ rotate: "230deg", transformOrigin: "390px 130px" }}
          initial={{ strokeDashoffset: 251 }} animate={{ strokeDashoffset: 188 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        />
        {/* Legend */}
        {[["Revenue", "primary"], ["Growth", "success"]].map(([label, color], i) => (
          <motion.g key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 + i * 0.1 }}>
            <circle cx="348" cy={186 + i * 16} r="4" className={`fill-${color}`} />
            <rect x="358" y={182 + i * 16} width="40" height="6" rx="3" className="fill-muted-foreground/20" />
          </motion.g>
        ))}
        
        {/* Bar chart section */}
        <motion.rect x="24" y="234" width="436" height="110" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        />
        {barHeights.map((h, i) => (
          <motion.rect
            key={`bar-${i}`}
            x={52 + i * 52}
            width="28" rx="4"
            className={i % 2 === 0 ? "fill-primary/40" : "fill-primary/20"}
            initial={{ y: 330, height: 0 }}
            animate={{ y: 330 - h, height: h }}
            transition={{ delay: 1 + i * 0.1, duration: 0.6, ease: "backOut" }}
          />
        ))}
      </svg>
      
      {/* Floating metric card */}
      <motion.div
        className="absolute top-4 right-4 rounded-lg border border-border bg-card shadow-lg px-3 py-2"
        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, type: "spring" }}
      >
        <div className="text-[10px] text-muted-foreground">Monthly Revenue</div>
        <div className="text-sm font-bold text-foreground">$127.4K</div>
        <div className="text-[10px] text-success font-medium">↑ 23.5%</div>
      </motion.div>
    </div>
  );
}
