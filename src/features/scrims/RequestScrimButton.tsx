"use client";

import { useCallback, useRef, useState } from "react";

type Lifecycle = "idle" | "loading" | "success" | "error";

/** Forces a visual state for demo/QA. Overrides interaction. */
export type DemoState =
  | "hover"
  | "focus"
  | "active"
  | "loading"
  | "error"
  | "success"
  | "disabled";

interface Props {
  teamName: string;
  /** Freeze the button in one state so every state is demoable. */
  demoState?: DemoState;
  /** When true, a real request "fails" — lets the error state be exercised. */
  simulateFailure?: boolean;
}

const LABEL: Record<Lifecycle, string> = {
  idle: "Request Scrim",
  loading: "Requesting…",
  success: "Requested",
  error: "Failed — retry",
};

export function RequestScrimButton({
  teamName,
  demoState,
  simulateFailure = false,
}: Props) {
  const [state, setState] = useState<Lifecycle>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    if (state === "loading") return;
    setState("loading");
    timer.current = setTimeout(() => {
      setState(simulateFailure ? "error" : "success");
    }, 900);
  }, [state, simulateFailure]);

  // Demo mode: static render, no interaction.
  if (demoState) {
    const cls =
      demoState === "disabled" ? "request-btn" : `request-btn is-${demoState}`;
    return (
      <button
        type="button"
        className={cls}
        disabled={demoState === "disabled" || demoState === "loading"}
        aria-label={`Request scrim with ${teamName}`}
      >
        {demoState === "success"
          ? LABEL.success
          : demoState === "error"
            ? LABEL.error
            : LABEL.idle}
      </button>
    );
  }

  const cls = [
    "request-btn",
    state === "loading" && "is-loading",
    state === "success" && "is-success",
    state === "error" && "is-error",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      disabled={state === "loading" || state === "success"}
      aria-busy={state === "loading"}
      aria-label={`Request scrim with ${teamName}`}
      onClick={run}
    >
      {LABEL[state]}
    </button>
  );
}
