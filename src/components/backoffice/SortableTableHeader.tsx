import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

type SortableTableHeaderProps = {
  label: string;
  href: string;
  active: boolean;
  direction: SortDirection;
  className?: string;
};

export default function SortableTableHeader({
  label,
  href,
  active,
  direction,
  className,
}: SortableTableHeaderProps) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  const ariaLabel = active
    ? `${label} orden ${direction === "asc" ? "ascendente" : "descendente"}`
    : `${label} ordenar`;

  return (
    <th className={cn("px-4 py-3", className)} scope="col">
      <Link
        href={href}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-1.5 rounded text-left font-semibold hover:text-reca-800 focus:outline-none focus:ring-2 focus:ring-reca/20",
          active ? "text-reca-800" : "text-gray-700"
        )}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </th>
  );
}
