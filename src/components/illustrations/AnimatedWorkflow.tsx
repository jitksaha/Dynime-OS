import { motion } from "framer-motion";

export function AnimatedWorkflow({ className = "" }: { className?: string }) {
  const nodeDelay = 0.3;
  
  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 480 360" fill="none" className="w-full h-full">
        <rect width="480" height="360" rx="16" className="fill-muted/20" />
        
        {/* Grid pattern */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`vg-${i}`} x1={i * 24} y1="0" x2={i * 24} y2="360" className="stroke-border/30" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`hg-${i}`} x1="0" y1={i * 24} x2="480" y2={i * 24} className="stroke-border/30" strokeWidth="0.5" />
        ))}
        
        {/* Connection lines with animated dashes */}
        <motion.path d="M140 100 L240 100" className="stroke-primary/40" strokeWidth="2" strokeDasharray="6 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.5 }}
        />
        <motion.path d="M340 100 L340 180" className="stroke-primary/40" strokeWidth="2" strokeDasharray="6 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.2, duration: 0.5 }}
        />
        <motion.path d="M340 180 L240 240" className="stroke-success/40" strokeWidth="2" strokeDasharray="6 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.6, duration: 0.5 }}
        />
        <motion.path d="M340 180 L440 240" className="stroke-destructive/40" strokeWidth="2" strokeDasharray="6 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.6, duration: 0.5 }}
        />
        
        {/* Trigger node */}
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: nodeDelay, type: "spring" }}>
          <rect x="60" y="72" width="80" height="56" rx="12" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5" />
          <circle cx="100" cy="92" r="10" className="fill-primary/20" />
          <rect x="80" y="108" width="40" height="6" rx="3" className="fill-primary/30" />
        </motion.g>
        
        {/* Process node */}
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: nodeDelay + 0.4, type: "spring" }}>
          <rect x="240" y="72" width="100" height="56" rx="12" className="fill-card stroke-border" strokeWidth="1.5" />
          <rect x="256" y="84" width="28" height="28" rx="6" className="fill-warning/15" />
          <rect x="290" y="88" width="36" height="6" rx="3" className="fill-foreground/20" />
          <rect x="290" y="100" width="24" height="4" rx="2" className="fill-muted-foreground/20" />
        </motion.g>
        
        {/* Decision diamond */}
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: nodeDelay + 0.8, type: "spring" }}>
          <motion.rect x="310" y="155" width="60" height="50" rx="8" className="fill-accent/10 stroke-accent/30" strokeWidth="1.5"
            style={{ transformOrigin: "340px 180px", rotate: 0 }}
          />
          <text x="340" y="184" textAnchor="middle" className="fill-foreground/40" fontSize="10" fontWeight="600">IF</text>
        </motion.g>
        
        {/* Success path */}
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: nodeDelay + 1.2, type: "spring" }}>
          <rect x="190" y="216" width="100" height="48" rx="12" className="fill-success/10 stroke-success/30" strokeWidth="1.5" />
          <rect x="206" y="228" width="20" height="20" rx="10" className="fill-success/20" />
          <rect x="232" y="234" width="40" height="6" rx="3" className="fill-success/30" />
        </motion.g>
        
        {/* Failure path */}
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: nodeDelay + 1.2, type: "spring" }}>
          <rect x="390" y="216" width="80" height="48" rx="12" className="fill-destructive/10 stroke-destructive/30" strokeWidth="1.5" />
          <rect x="406" y="228" width="20" height="20" rx="10" className="fill-destructive/20" />
          <rect x="432" y="234" width="28" height="6" rx="3" className="fill-destructive/30" />
        </motion.g>
        
        {/* Animated data packet flowing */}
        <motion.circle r="5" className="fill-primary"
          initial={{ cx: 140, cy: 100, opacity: 0 }}
          animate={{ cx: [140, 240, 340, 340, 240], cy: [100, 100, 100, 180, 240], opacity: [0, 1, 1, 1, 0] }}
          transition={{ delay: 2, duration: 3, repeat: Infinity, repeatDelay: 1 }}
        />
      </svg>
      
      {/* Labels */}
      <motion.div className="absolute top-[17%] left-[10%] text-[10px] font-semibold text-primary"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
      >Trigger</motion.div>
      <motion.div className="absolute top-[17%] left-[50%] text-[10px] font-semibold text-foreground/60"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
      >Process</motion.div>
      <motion.div className="absolute bottom-[22%] left-[38%] text-[10px] font-semibold text-success"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
      >✓ Approve</motion.div>
      <motion.div className="absolute bottom-[22%] right-[4%] text-[10px] font-semibold text-destructive"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
      >✗ Reject</motion.div>
    </div>
  );
}
