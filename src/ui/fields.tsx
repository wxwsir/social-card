/** 编辑器通用表单控件：把原生 input 包一层统一的标签与样式类。 */

import type { ChangeEvent, ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function TextAreaField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <Field label={label}>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    </Field>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

interface CheckboxFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="field checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

/** 逗号 / 换行分隔的多值输入，对外是数组。 */
export function TagField({ label, value, onChange, placeholder }: Omit<TextFieldProps, 'value' | 'onChange'> & { value: string[]; onChange: (value: string[]) => void }) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value.join('，')}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(/[,，\n]/)
              .map((part) => part.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  )
}

export function Collapse({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="collapse">
      <summary>{title}</summary>
      <div className="collapse-body">{children}</div>
    </details>
  )
}
