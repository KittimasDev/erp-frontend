"use client";

import { useEffect, useState, type ReactNode } from "react";

import PageLoading from "./PageLoading";

type MasterPageGateProps = {
  isLoading?: boolean;
  label?: string;
  children: ReactNode;
};

/**
 * Shows a globally styled loader until CSS modules paint and initial data is ready.
 * Children still mount (hidden) so page CSS can load without FOUC.
 * Enter animation runs only when content becomes visible.
 */
export default function MasterPageGate({
  isLoading = false,
  label,
  children,
}: MasterPageGateProps) {
  const [stylesReady, setStylesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          setStylesReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  const showLoading = !stylesReady || isLoading;

  return (
    <>
      {showLoading ? <PageLoading label={label} /> : null}
      <div
        className={showLoading ? "masterPageGateHidden" : "pageContentEnter"}
        aria-hidden={showLoading || undefined}
      >
        {children}
      </div>
    </>
  );
}
