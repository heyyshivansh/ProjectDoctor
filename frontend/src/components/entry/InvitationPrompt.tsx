import React from "react";

interface InvitationPromptProps {
  isReturningUser?: boolean;
}

export const InvitationPrompt: React.FC<InvitationPromptProps> = () => {
  return (
    <div className="text-center space-y-3 select-none">
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900">
        What are you building?
      </h1>
      <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto font-normal leading-relaxed">
        Describe your project concept, architecture, or goals. You can also attach
        specifications or connect GitHub to begin technical diagnosis.
      </p>
    </div>
  );
};
