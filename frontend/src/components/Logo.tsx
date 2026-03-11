import { BrainCircuit, Sparkles } from "lucide-react";

const Logo = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-glow">
          <BrainCircuit className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-success-foreground" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-display font-bold text-xl text-foreground leading-tight">
          TruthLens
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          AI Fact Checker
        </span>
      </div>
    </div>
  );
};

export default Logo;
