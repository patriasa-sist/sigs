'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';

interface SameAsCheckboxProps {
  /**
   * Unique ID for the checkbox
   */
  id: string;

  /**
   * Label text to display next to checkbox
   * Example: "Mismo que dirección personal"
   */
  label: string;

  /**
   * Whether the checkbox is currently checked
   */
  checked: boolean;

  /**
   * Callback when checkbox state changes
   */
  onCheckedChange: (checked: boolean) => void;

  /**
   * Value from the source field to copy
   */
  sourceValue: string | number | Date | undefined;

  /**
   * Callback to update the target field value
   * This will be called with sourceValue when checkbox is checked
   */
  onCopyValue: (value: string | number | Date | undefined) => void;

  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;

  /**
   * Additional className for styling
   */
  className?: string;

  /**
   * Helper text to display below the checkbox
   */
  helperText?: string;
}

/**
 * SameAsCheckbox Component
 *
 * A reusable checkbox component that copies a value from a source field
 * to a target field and disables the target field while checked.
 *
 * Usage:
 * ```tsx
 * <SameAsCheckbox
 *   id="same-as-direccion"
 *   label="Mismo que dirección personal"
 *   checked={useSameAsDireccion}
 *   onCheckedChange={setUseSameAsDireccion}
 *   sourceValue={watch('direccion')}
 *   onCopyValue={(value) => setValue('domicilio_comercial', value)}
 * />
 * ```
 */
export function SameAsCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
  sourceValue,
  onCopyValue,
  disabled = false,
  className = '',
  helperText,
}: SameAsCheckboxProps) {
  // Copy value when checkbox is checked
  useEffect(() => {
    if (checked && sourceValue !== undefined) {
      onCopyValue(sourceValue);
    }
  }, [checked, sourceValue, onCopyValue]);

  // Also copy immediately when source value changes while checked
  useEffect(() => {
    if (checked && sourceValue !== undefined) {
      onCopyValue(sourceValue);
    }
  }, [sourceValue, checked, onCopyValue]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
        <Label
          htmlFor={id}
          className="text-sm font-normal cursor-pointer select-none"
        >
          {label}
        </Label>
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground ml-6">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Example usage with React Hook Form:
 *
 * ```tsx
 * const { watch, setValue } = useForm();
 * const [useSameAs, setUseSameAs] = useState(false);
 *
 * <SameAsCheckbox
 *   id="same-as-example"
 *   label="Mismo que campo origen"
 *   checked={useSameAs}
 *   onCheckedChange={setUseSameAs}
 *   sourceValue={watch('sourceField')}
 *   onCopyValue={(value) => setValue('targetField', value, { shouldValidate: true })}
 * />
 *
 * <Input
 *   {...register('targetField')}
 *   disabled={useSameAs}
 * />
 * ```
 */
