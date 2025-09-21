"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function HeaderPortal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById("law-tabs-slot"));
  }, []);
  if (!el) return null;
  return createPortal(children, el);
}
