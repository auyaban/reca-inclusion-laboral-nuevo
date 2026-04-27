"use client";

import { useEffect } from "react";
import { registerHubTabListener } from "@/lib/actaTabs";

export default function HubTabListener() {
  useEffect(() => registerHubTabListener("/hub"), []);

  return null;
}
