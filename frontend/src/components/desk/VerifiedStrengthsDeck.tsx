import { Sparkles, CheckCircle2 } from 'lucide-react';
import { FindingSummary } from '@/types/diagnosis';

interface VerifiedStrengthsDeckProps {
  strengths: FindingSummary[];
}

export function VerifiedStrengthsDeck({ strengths }: VerifiedStrengthsDeckProps) {
  if (!strengths || strengths.length === 0) return null;

  return (
    <section className="w-full py-8 space-y-6">
      <div className="flex items-center gap-3 px-2">
        <Sparkles className="w-5 h-5 text-[#10B981]" />
        <h2 className="font-display text-xl text-[var(--pd-text-primary)] tracking-wide">What's Working</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strengths.map((strength) => (
          <div 
            key={strength.id}
            className="bg-[var(--pd-surface)] border border-[var(--pd-hairline)] rounded-xl p-5 flex flex-col gap-3 hover:border-[#10B981]/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-lg text-[var(--pd-text-primary)] leading-snug">
                {strength.title}
              </h3>
              <div className="flex-shrink-0 mt-1 bg-[#10B981]/10 p-1.5 rounded-full text-[#10B981]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            
            <p className="font-sans text-sm text-[var(--pd-text-body)] leading-relaxed">
              {strength.summary}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
