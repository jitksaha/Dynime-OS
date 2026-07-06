import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function IdleTimeoutWarning() {
  const { showWarning, secondsLeft, stayActive } = useIdleTimeout();
  const { signOut } = useAuth();

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Session Expiring</h3>
            <p className="text-sm text-muted-foreground">
              You've been inactive for a while
            </p>
          </div>
        </div>
        <div className="text-center py-3">
          <p className="text-4xl font-bold text-warning tabular-nums">{secondsLeft}s</p>
          <p className="text-xs text-muted-foreground mt-1">until automatic sign out</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => signOut()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
          <button
            onClick={stayActive}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
