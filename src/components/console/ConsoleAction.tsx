/**
 * ConsoleAction — one contract function in the Console: optional inputs, a
 * run button, and an inline status/result readout (via useAsyncAction).
 */

import { useState } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction";

export interface Field {
  name: string;
  placeholder?: string;
  type?: "text" | "number";
  default?: string;
}

interface Props {
  title: string;                              // e.g. "post(text)"
  desc?: string;
  kind: "read" | "write";
  fields?: Field[];
  buttonLabel?: string;
  disabled?: boolean;                         // e.g. write with no wallet
  disabledReason?: string;
  onRun: (vals: Record<string, string>) => Promise<string>; // returns a display string
}

export function ConsoleAction({ title, desc, kind, fields = [], buttonLabel, disabled, disabledReason, onRun }: Props) {
  const action = useAsyncAction<string>();
  const [vals, setVals] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.name, f.default ?? ""])),
  );

  const run = () => action.run(() => onRun(vals), {
    pending: kind === "write" ? "Awaiting signature / settling…" : "Reading…",
    success: (r) => r,
  });

  return (
    <div className={`console-action console-action--${kind}`}>
      <div className="console-action__head">
        <code className="console-action__sig">{title}</code>
        <span className={`console-action__tag console-action__tag--${kind}`}>{kind}</span>
      </div>
      {desc && <p className="console-action__desc">{desc}</p>}

      {fields.length > 0 && (
        <div className="console-action__fields">
          {fields.map((f) => (
            <input
              key={f.name}
              className="input console-action__input"
              type={f.type ?? "text"}
              placeholder={f.placeholder ?? f.name}
              value={vals[f.name] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          ))}
        </div>
      )}

      <div className="console-action__run">
        <button
          className={`btn ${kind === "write" ? "btn--primary" : "btn--secondary"}`}
          onClick={run}
          disabled={action.busy || disabled}
        >
          {action.busy ? "…" : (buttonLabel ?? (kind === "write" ? "Submit" : "Call"))}
        </button>
        {disabled && disabledReason && <span className="hint">{disabledReason}</span>}
      </div>

      {action.phase !== "idle" && (
        <pre className={`console-action__status console-action__status--${action.phase}`}>
          {action.phase === "pending" && "⏳ "}
          {action.phase === "success" && "✓ "}
          {action.phase === "error" && "✗ "}
          {action.message}
        </pre>
      )}
    </div>
  );
}
