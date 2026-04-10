import { Suspense } from "react";
import HubMenu from "@/components/layout/HubMenu";

export default function HubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <HubMenu />
    </Suspense>
  );
}
