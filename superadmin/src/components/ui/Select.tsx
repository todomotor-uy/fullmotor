type Option = string | { value: string; label: string }

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'size'> {
  options?: Option[]
  size?: 'sm' | 'md'
  placeholder?: string
  label?: string
  className?: string
  children?: React.ReactNode
}

export function Select({ children, options, size = 'md', placeholder, label, className = '', ...rest }: SelectProps) {
  const cls = ['tm-select', size === 'sm' ? 'tm-select--sm' : '', className].filter(Boolean).join(' ')
  const select = (
    <span className="tm-select-wrap">
      <select className={cls} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options
          ? options.map((o) => {
              const val = typeof o === 'string' ? o : o.value
              const lab = typeof o === 'string' ? o : o.label
              return <option key={val} value={val}>{lab}</option>
            })
          : children}
      </select>
      <span className="tm-select__chev" aria-hidden="true" />
    </span>
  )
  if (!label) return select
  return (
    <div className="tm-field">
      <span className="tm-field__label">{label}</span>
      {select}
    </div>
  )
}
