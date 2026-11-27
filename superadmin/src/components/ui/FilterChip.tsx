interface FilterChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  active?: boolean
  count?: number | string
  icon?: React.ReactNode
  className?: string
}

export function FilterChip({ children, active = false, count, icon, className = '', ...rest }: FilterChipProps) {
  const cls = ['tm-chip', active ? 'tm-chip--active' : '', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} aria-pressed={active} {...rest}>
      {icon && <span className="tm-chip__ico">{icon}</span>}
      {children}
      {count != null && <span className="tm-chip__count">{count}</span>}
    </button>
  )
}
