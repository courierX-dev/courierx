import Link from "next/link"
import { Zap, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">CourierX</span>
      </Link>

      <div className="w-full max-w-sm text-center space-y-5">
        {/* Icon */}
        <div className="mx-auto h-12 w-12 rounded-full border border-border bg-muted/30 flex items-center justify-center">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">Check your inbox</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We sent a verification link to your email address.
            Click it to activate your account.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button variant="outline" size="sm" className="w-full">
            Resend verification email
          </Button>
          <p className="text-xs text-muted-foreground">
            Wrong address?{" "}
            <Link
              href="/signup"
              className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              Go back to sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
