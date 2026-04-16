// ---------------------------------------------------------------------------
// TypingIndicator — three animated bouncing dots
// ---------------------------------------------------------------------------

import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}
