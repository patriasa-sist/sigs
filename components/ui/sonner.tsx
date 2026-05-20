"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      closeButton
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Error/success/info-specific tokens so type-styled toasts are readable
          "--error-bg": "color-mix(in oklab, var(--destructive) 8%, var(--popover))",
          "--error-text": "var(--destructive)",
          "--error-border": "color-mix(in oklab, var(--destructive) 30%, transparent)",
          "--success-bg": "color-mix(in oklab, var(--primary) 8%, var(--popover))",
          "--success-text": "var(--primary)",
          "--success-border": "color-mix(in oklab, var(--primary) 30%, transparent)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Sonner aplica opacidad reducida al description por defecto — la forzamos para mejor lectura
          description: "!opacity-100 !text-current text-sm leading-snug",
          title: "font-semibold text-sm",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
