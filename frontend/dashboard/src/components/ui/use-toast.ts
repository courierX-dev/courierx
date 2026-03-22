import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastOptions) => {
      if (variant === "destructive") {
        sonnerToast.error(title, { description })
      } else if (variant === "success") {
        sonnerToast.success(title, { description })
      } else {
        sonnerToast(title, { description })
      }
    },
  }
}
