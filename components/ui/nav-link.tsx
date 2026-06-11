"use client";

import * as React from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type NavLinkProps = React.ComponentProps<typeof Button> & {
  /** Ruta a la que navegar. */
  href: string;
};

/** Reemplaza los hijos por un spinner mientras la navegación del Link está en curso. */
function NavLinkContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="animate-spin" /> : <>{children}</>;
}

/**
 * Botón de navegación que conserva la semántica de enlace real (abrir en
 * pestaña nueva, click central, prefetch de Next) y muestra un spinner
 * mientras la navegación está en curso vía `useLinkStatus`. Preferir sobre
 * NavButton cuando la acción es navegación pura.
 */
function NavLink({ href, children, ...props }: NavLinkProps) {
  return (
    <Button asChild {...props}>
      <Link href={href}>
        <NavLinkContent>{children}</NavLinkContent>
      </Link>
    </Button>
  );
}

export { NavLink };
