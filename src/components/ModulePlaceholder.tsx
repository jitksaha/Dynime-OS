import { Construction } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export default function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl scale-150" />
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-6">
          <Construction className="h-10 w-10 text-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground text-center max-w-lg mb-6">{description}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        Coming soon
      </div>
    </div>
  );
}
