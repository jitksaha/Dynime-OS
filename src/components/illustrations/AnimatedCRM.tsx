import { motion } from "framer-motion";

export function AnimatedCRM({ className = "" }: { className?: string }) {
  const stages = [
    { label: "Lead", count: 24, width: 100, color: "hsl(243,75%,58%)" },
    { label: "Qualified", count: 18, width: 85, color: "hsl(270,80%,60%)" },
    { label: "Proposal", count: 12, width: 70, color: "hsl(38,92%,50%)" },
    { label: "Won", count: 8, width: 55, color: "hsl(142,71%,45%)" },
  ];

  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 480 360" fill="none" className="w-full h-full">
        <rect width="480" height="360" rx="16" className="fill-muted/20" />
        
        {/* Sales funnel */}
        <motion.text x="40" y="36" className="fill-foreground/40" fontSize="12" fontWeight="700"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >Sales Pipeline</motion.text>
        
        {stages.map((stage, i) => (
          <motion.g key={stage.label}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.15 }}
          >
            <motion.rect
              x={240 - stage.width / 2} y={55 + i * 42}
              height="34" rx="8"
              fill={stage.color + "15"} stroke={stage.color + "30"} strokeWidth="1"
              initial={{ width: 0 }} animate={{ width: stage.width * 2 }}
              transition={{ delay: 0.6 + i * 0.15, duration: 0.5, ease: "easeOut" }}
            />
            <motion.text x="240" y={76 + i * 42} textAnchor="middle"
              fontSize="10" fontWeight="600" fill={stage.color}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 + i * 0.15 }}
            >{stage.label} ({stage.count})</motion.text>
          </motion.g>
        ))}
        
        {/* Deal cards */}
        <motion.rect x="24" y="236" width="140" height="100" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
        />
        <motion.rect x="36" y="248" width="48" height="8" rx="4" className="fill-primary/25"
          initial={{ width: 0 }} animate={{ width: 48 }} transition={{ delay: 1.2 }}
        />
        <motion.rect x="36" y="264" width="80" height="6" rx="3" className="fill-muted"
          initial={{ width: 0 }} animate={{ width: 80 }} transition={{ delay: 1.3 }}
        />
        <motion.rect x="36" y="278" width="60" height="6" rx="3" className="fill-muted-foreground/15"
          initial={{ width: 0 }} animate={{ width: 60 }} transition={{ delay: 1.35 }}
        />
        <motion.rect x="36" y="300" width="100" height="20" rx="6" className="fill-success/10 stroke-success/20" strokeWidth="1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        />
        <motion.text x="86" y="314" textAnchor="middle" fontSize="9" className="fill-success" fontWeight="600"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        >$42,500</motion.text>
        
        {/* Activity timeline */}
        <motion.rect x="180" y="236" width="140" height="100" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
        />
        <motion.text x="196" y="254" fontSize="9" fontWeight="600" className="fill-foreground/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
        >Activity</motion.text>
        {[0, 1, 2].map(i => (
          <motion.g key={`timeline-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4 + i * 0.1 }}
          >
            <line x1="200" y1={270 + i * 20} x2="200" y2={286 + i * 20} className="stroke-border" strokeWidth="1.5" />
            <circle cx="200" cy={274 + i * 20} r="3" className={i === 0 ? "fill-primary" : "fill-muted-foreground/30"} />
            <rect x="210" y={270 + i * 20} width={60 - i * 10} height="6" rx="3" className="fill-muted" />
          </motion.g>
        ))}
        
        {/* Contact card */}
        <motion.rect x="336" y="236" width="120" height="100" rx="10" className="fill-card stroke-border" strokeWidth="1"
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
        />
        <motion.circle cx="396" cy="268" r="16" className="fill-primary/10"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4, type: "spring" }}
        />
        <motion.circle cx="396" cy="264" r="6" className="fill-primary/30"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: "spring" }}
        />
        <motion.rect x="392" y="271" width="8" height="5" rx="2" className="fill-primary/20"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }}
        />
        <motion.rect x="368" y="294" width="56" height="6" rx="3" className="fill-foreground/15"
          initial={{ width: 0 }} animate={{ width: 56 }} transition={{ delay: 1.6 }}
        />
        <motion.rect x="374" y="306" width="44" height="5" rx="2.5" className="fill-muted-foreground/15"
          initial={{ width: 0 }} animate={{ width: 44 }} transition={{ delay: 1.7 }}
        />
      </svg>
    </div>
  );
}
