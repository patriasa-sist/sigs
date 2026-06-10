"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type NavButtonProps = React.ComponentProps<typeof Button> & {
  /** Ruta a la que navegar al hacer click. */
  href: string;
};

/**
 * Botón de navegación que se bloquea y muestra un spinner mientras la
 * navegación está en curso, evitando dobles clicks. Usa useTransition: el
 * estado `isPending` se mantiene hasta que la nueva ruta termina de cargar.
 */
function NavButton({ href, children, disabled, onClick, ...props }: NavButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      {...props}
      disabled={disabled || isPending}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        startTransition(() => router.push(href));
      }}
    >
      {isPending ? <Loader2 className="animate-spin" /> : children}
    </Button>
  );
}

export { NavButton };
