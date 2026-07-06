import { motion } from "framer-motion";

export function AnimatedSecurity({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 480 360" fill="none" className="w-full h-full">
        <rect width="480" height="360" rx="16" className="fill-muted/20" />
        
        {/* Shield */}
        <motion.path
          d="M240 40 L300 70 L300 160 Q300 220 240 260 Q180 220 180 160 L180 70 Z"
          className="fill-success/8 stroke-success/30" strokeWidth="2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          style={{ transformOrigin: "240px 150px" }}
        />
        <motion.path
          d="M240 60 L288 84 L288 158 Q288 208 240 242 Q192 208 192 158 L192 84 Z"
          className="fill-success/5 stroke-success/15" strokeWidth="1"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          style={{ transformOrigin: "240px 150px" }}
        />
        
        {/* Checkmark inside shield */}
        <motion.path
          d="M218 145 L234 162 L264 128"
          className="stroke-success" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        />
        
        {/* Rotating ring */}
        <motion.circle cx="240" cy="150" r="90" className="stroke-success/10" strokeWidth="1" fill="none"
          strokeDasharray="8 12"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "240px 150px" }}
        />
        
        {/* Orbiting dots */}
        {[0, 1, 2, 3].map(i => (
          <motion.circle key={`orbit-${i}`} r="4"
            className="fill-success/40"
            animate={{
              cx: [240 + 90 * Math.cos(i * Math.PI / 2), 240 + 90 * Math.cos(i * Math.PI / 2 + Math.PI * 2)],
              cy: [150 + 90 * Math.sin(i * Math.PI / 2), 150 + 90 * Math.sin(i * Math.PI / 2 + Math.PI * 2)],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: i * 3 }}
          />
        ))}
        
        {/* Encryption blocks */}
        {[0, 1, 2].map(i => (
          <motion.g key={`enc-${i}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.15 }}
          >
            <rect x={60 + i * 150} y="290" width="120" height="44" rx="8"
              className="fill-card stroke-border" strokeWidth="1"
            />
            <rect x={72 + i * 150} y="300" width="16" height="16" rx="4"
              className="fill-success/15"
            />
            <rect x={96 + i * 150} y="302" width="50" height="6" rx="3" className="fill-muted" />
            <rect x={96 + i * 150} y="314" width="36" height="4" rx="2" className="fill-muted-foreground/15" />
          </motion.g>
        ))}
        
        {/* Pulse rings */}
        {[1, 2, 3].map(i => (
          <motion.circle key={`pulse-${i}`} cx="240" cy="150" r={30 + i * 20}
            className="stroke-success/10" strokeWidth="1" fill="none"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
            style={{ transformOrigin: "240px 150px" }}
          />
        ))}
      </svg>
    </div>
  );
}
