interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  if (children) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
