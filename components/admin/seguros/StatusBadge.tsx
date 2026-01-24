"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  activo: boolean;
  showIcon?: boolean;
}

export function StatusBadge({ activo, showIcon = true }: StatusBadgeProps) {
  return (
    <Badge
      variant={activo ? "default" : "secondary"}
      className={`flex items-center gap-1 w-fit ${
        activo
          ? "bg-green-100 text-green-800 hover:bg-green-100"
          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
      }`}
    >
      {showIcon &&
        (activo ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        ))}
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  );
}
