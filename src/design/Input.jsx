import { clsx } from 'clsx';
import { forwardRef, useId } from 'react';

// ============================================================
// Input / Textarea / Select — forma elementlari
// ------------------------------------------------------------
// Har biri label, hint va error props'larini qabul qiladi
// (form-field wrapper). Ichkaridagi `input`/`textarea`/`select`
// uchun ref ham uzatiladi.
//
// Namuna:
//   <Input label="Ism" placeholder="Familiya Ism" />
//   <Input label="Email" type="email" error="Email noto'g'ri" />
//   <Textarea label="Izoh" rows={4} hint="Maksimal 500 belgi" />
//   <Select label="Status">
//     <option>Yangi</option>
//     <option>Yopildi</option>
//   </Select>
// ============================================================

function FieldWrapper({ id, label, hint, error, required, children, className = '' }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const FIELD_BASE =
  'block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700 dark:placeholder:text-slate-500 dark:focus:ring-indigo-400';
const FIELD_ERROR = 'ring-rose-500 focus:ring-rose-500';

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    required = false,
    className = '',
    id: idProp,
    leftIcon: LeftIcon = null,
    rightAddon = null,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;

  const inputEl = (
    <input
      ref={ref}
      id={id}
      required={required}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={clsx(
        FIELD_BASE,
        LeftIcon && 'pl-10',
        rightAddon && 'pr-11',
        error && FIELD_ERROR,
        className,
      )}
      {...rest}
    />
  );

  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={required}>
      {LeftIcon || rightAddon ? (
        <div className="relative">
          {LeftIcon && (
            <LeftIcon
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          )}
          {inputEl}
          {rightAddon && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightAddon}</div>
          )}
        </div>
      ) : (
        inputEl
      )}
    </FieldWrapper>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required = false, rows = 3, className = '', id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={clsx(FIELD_BASE, 'resize-y', error && FIELD_ERROR, className)}
        {...rest}
      />
    </FieldWrapper>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, required = false, children, className = '', id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={clsx(FIELD_BASE, 'pr-10', error && FIELD_ERROR, className)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});

export default Input;
