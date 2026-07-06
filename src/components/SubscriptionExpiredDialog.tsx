import { AlertCircle, CreditCard, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  hasPermanentModules: boolean;
  daysRemaining: number | null;
}

export function SubscriptionExpiredDialog({ hasPermanentModules, daysRemaining }: Props) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 sm:p-8 animate-fade-in">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">
              {daysRemaining !== null && daysRemaining <= 0
                ? "Your Trial Has Expired"
                : "Subscription Required"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your free trial has ended. To continue using the platform, please subscribe to a plan.
              Your data and settings are safely saved and will be available once you reactivate.
            </p>
          </div>

          {hasPermanentModules && (
            <div className="w-full p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 text-warning">
                <Package className="h-4 w-4 shrink-0" />
                <p className="text-xs font-medium text-left">
                  You have permanently purchased modules. An active base subscription is required to access them.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/subscription")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <CreditCard className="h-4 w-4" />
            Choose a Plan
          </button>

          <p className="text-xs text-muted-foreground">
            You can browse plans and subscribe at any time to restore full access.
          </p>
        </div>
      </div>
    </div>
  );
}
