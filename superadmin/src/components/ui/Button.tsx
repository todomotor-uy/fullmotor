type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  iconOnly?: boolean
  className?: string
  children?: React.ReactNode
}

function cls({ variant = 'primary', size = 'md', block, iconOnly, className = '' }: ButtonBaseProps) {
  return [
    'tm-btn',
    `tm-btn--${size}`,
    variant !== 'primary' ? `tm-btn--${variant}` : '',
    block ? 'tm-btn--block' : '',
    iconOnly ? 'tm-btn--icon' : '',
    className,
  ].filter(Boolean).join(' ')
}

function Inner({ loading, iconLeft, iconRight, iconOnly, children }: ButtonBaseProps) {
  return (
    <>
      {loading && <span className="tm-btn__spinner" aria-hidden="true" />}
      {!loading && iconLeft}
      {!iconOnly && children}
      {!loading && iconRight}
    </>
  )
}

export function Button({
  variant, size, block, loading = false, disabled = false,
  iconLeft, iconRight, iconOnly, className, children, ...rest
}: ButtonBaseProps & { disabled?: boolean } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  return (
    <button type="button" className={cls({ variant, size, block, iconOnly, className })} disabled={disabled || loading} {...rest}>
      <Inner loading={loading} iconLeft={iconLeft} iconRight={iconRight} iconOnly={iconOnly}>{children}</Inner>
    </button>
  )
}
