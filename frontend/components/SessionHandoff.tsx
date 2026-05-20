"use client";

import { useEffect } from "react";
import { consumeSessionHandoff } from "@/lib/session";

export default function SessionHandoff() {
  useEffect(() => {
    consumeSessionHandoff();
  }, []);

  return null;
}
