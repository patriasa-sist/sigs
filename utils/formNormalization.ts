/**
 * Form Normalization Utilities
 * ===========================
 * Functions to normalize and validate form data before submission
 * All client data must be normalized per database schema requirements
 */

/**
 * Normalizes text fields: uppercase and trim whitespace
 * Used for names, addresses, and all text fields
 * @param value - Text to normalize
 * @returns Normalized text (uppercase, trimmed) or empty string if null/undefined
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toUpperCase();
}

/**
 * Normalizes email: lowercase and trim whitespace
 * @param value - Email to normalize
 * @returns Normalized email (lowercase, trimmed) or empty string if null/undefined
 */
export function normalizeEmail(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

/**
 * Cleans phone number: extracts only numeric digits
 * Removes all non-numeric characters (spaces, dashes, parentheses, etc.)
 * @param value - Phone number to clean
 * @returns String with only numeric digits or empty string if null/undefined
 */
export function cleanPhone(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[^0-9]/g, '');
}

/**
 * Normalizes document number: uppercase, trim, remove special characters
 * @param value - Document number to normalize
 * @returns Normalized document number or empty string if null/undefined
 */
export function normalizeDocument(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Validates email format using regex
 * @param email - Email to validate
 * @returns true if valid email format, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates that a string contains only numbers and meets minimum length
 * @param value - String to validate
 * @param minLength - Minimum number of digits required
 * @returns true if valid, false otherwise
 */
export function validateMinDigits(value: string, minLength: number): boolean {
  if (!value) return false;
  const cleaned = cleanPhone(value);
  return cleaned.length >= minLength && /^\d+$/.test(cleaned);
}

/**
 * Validates document number minimum length
 * @param value - Document number to validate
 * @param minLength - Minimum length required (default: 6)
 * @returns true if valid, false otherwise
 */
export function validateDocumentLength(value: string, minLength: number = 6): boolean {
  if (!value) return false;
  const normalized = normalizeDocument(value);
  return normalized.length >= minLength;
}

/**
 * Validates NIT (tax identification number)
 * Must be only numbers and at least 7 digits
 * @param nit - NIT to validate
 * @returns true if valid, false otherwise
 */
export function validateNIT(nit: string): boolean {
  return validateMinDigits(nit, 7);
}

/**
 * Maps income level dropdown value to numeric value
 * @param level - Income level ('bajo', 'medio', 'alto')
 * @returns Numeric value (2000, 5000, or 10000)
 */
export function mapIncomeLevelToValue(level: 'bajo' | 'medio' | 'alto'): number {
  const mapping = {
    bajo: 2000,
    medio: 5000,
    alto: 10000,
  };
  return mapping[level];
}

/**
 * Maps numeric income value to dropdown level
 * @param value - Numeric income value
 * @returns Income level label ('bajo', 'medio', 'alto') or undefined
 */
export function mapIncomeValueToLevel(value: number): 'bajo' | 'medio' | 'alto' | undefined {
  if (value <= 2000) return 'bajo';
  if (value <= 5000) return 'medio';
  if (value <= 10000) return 'alto';
  return undefined;
}

/**
 * Normalizes all text fields in an object
 * Recursively processes nested objects and arrays
 * @param obj - Object to normalize
 * @param fieldsToNormalize - Array of field names to normalize as text
 * @param emailFields - Array of field names to normalize as email
 * @param phoneFields - Array of field names to clean as phone numbers
 * @returns Normalized object
 */
export function normalizeFormData<T extends Record<string, any>>(
  obj: T,
  fieldsToNormalize: string[] = [],
  emailFields: string[] = [],
  phoneFields: string[] = []
): T {
  const normalized = { ...obj };

  for (const key in normalized) {
    const value = normalized[key];

    // Skip null/undefined
    if (value === null || value === undefined) continue;

    // Normalize text fields
    if (fieldsToNormalize.includes(key) && typeof value === 'string') {
      normalized[key] = normalizeText(value) as any;
    }

    // Normalize email fields
    if (emailFields.includes(key) && typeof value === 'string') {
      normalized[key] = normalizeEmail(value) as any;
    }

    // Clean phone fields
    if (phoneFields.includes(key) && typeof value === 'string') {
      normalized[key] = cleanPhone(value) as any;
    }

    // Recursively normalize nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      normalized[key] = normalizeFormData(value, fieldsToNormalize, emailFields, phoneFields) as any;
    }

    // Recursively normalize arrays
    if (Array.isArray(value)) {
      normalized[key] = value.map((item) => {
        if (typeof item === 'object') {
          return normalizeFormData(item, fieldsToNormalize, emailFields, phoneFields);
        }
        return item;
      }) as any;
    }
  }

  return normalized;
}

/**
 * Normalizes natural client form data
 * Applies all normalization rules for natural client fields
 * @param data - Natural client form data
 * @returns Normalized data
 */
export function normalizeNaturalClientData<T extends Record<string, any>>(data: T): T {
  const textFields = [
    'primer_nombre',
    'segundo_nombre',
    'primer_apellido',
    'segundo_apellido',
    'tipo_documento',
    'numero_documento',
    'extension_ci',
    'nacionalidad',
    'estado_civil',
    'direccion',
    'profesion_oficio',
    'actividad_economica',
    'lugar_trabajo',
    'pais_residencia',
    'genero',
    'cargo',
    'domicilio_comercial',
  ];

  const emailFields = ['correo_electronico'];
  const phoneFields = ['celular', 'nit'];

  return normalizeFormData(data, textFields, emailFields, phoneFields);
}

/**
 * Normalizes juridic client form data
 * Applies all normalization rules for juridic client fields
 * @param data - Juridic client form data
 * @returns Normalized data
 */
export function normalizeJuridicClientData<T extends Record<string, any>>(data: T): T {
  const textFields = [
    'razon_social',
    'tipo_sociedad',
    'tipo_documento',
    'matricula_comercio',
    'pais_constitucion',
    'direccion_legal',
    'actividad_economica',
  ];

  const emailFields = ['correo_electronico'];
  const phoneFields = ['nit', 'telefono'];

  return normalizeFormData(data, textFields, emailFields, phoneFields);
}

/**
 * Normalizes unipersonal client form data
 * Applies all normalization rules for unipersonal client fields
 * @param data - Unipersonal client form data
 * @returns Normalized data
 */
export function normalizeUnipersonalClientData<T extends Record<string, any>>(data: T): T {
  const textFields = [
    // Personal data (natural client fields)
    'primer_nombre',
    'segundo_nombre',
    'primer_apellido',
    'segundo_apellido',
    'tipo_documento',
    'numero_documento',
    'extension_ci',
    'nacionalidad',
    'estado_civil',
    'direccion',
    'profesion_oficio',
    'actividad_economica',
    'lugar_trabajo',
    'pais_residencia',
    'genero',
    'cargo',
    // Commercial data (unipersonal fields)
    'razon_social',
    'matricula_comercio',
    'domicilio_comercial',
    'actividad_economica_comercial',
    'nombre_propietario',
    'apellido_propietario',
    'extension_propietario',
    'nacionalidad_propietario',
    'nombre_representante',
    'extension_representante',
  ];

  const emailFields = ['correo_electronico', 'correo_electronico_comercial'];
  const phoneFields = [
    'celular',
    'nit',
    'telefono_comercial',
    'documento_propietario',
    'ci_representante',
  ];

  return normalizeFormData(data, textFields, emailFields, phoneFields);
}

/**
 * Normalizes legal representative data
 * Applies all normalization rules for legal representative fields
 * @param data - Legal representative form data
 * @returns Normalized data
 */
export function normalizeLegalRepresentativeData<T extends Record<string, any>>(data: T): T {
  const textFields = [
    'primer_nombre',
    'segundo_nombre',
    'primer_apellido',
    'segundo_apellido',
    'tipo_documento',
    'numero_documento',
    'extension',
    'cargo',
  ];

  const emailFields = ['correo_electronico'];
  const phoneFields = ['telefono'];

  return normalizeFormData(data, textFields, emailFields, phoneFields);
}

/**
 * Normalizes partner/spouse data
 * Applies all normalization rules for partner fields
 * @param data - Partner form data
 * @returns Normalized data
 */
export function normalizePartnerData<T extends Record<string, any>>(data: T): T {
  const textFields = [
    'primer_nombre',
    'segundo_nombre',
    'primer_apellido',
    'segundo_apellido',
    'direccion',
    'profesion_oficio',
    'actividad_economica',
    'lugar_trabajo',
  ];

  const emailFields = ['correo_electronico'];
  const phoneFields = ['celular'];

  return normalizeFormData(data, textFields, emailFields, phoneFields);
}

/**
 * Formats date to DD-MM-YYYY string
 * @param date - Date object or string
 * @returns Formatted date string (DD-MM-YYYY) or empty string if invalid
 */
export function formatDateDDMMYYYY(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Parses DD-MM-YYYY string to Date object
 * @param dateString - Date string in DD-MM-YYYY format
 * @returns Date object or null if invalid
 */
export function parseDateDDMMYYYY(dateString: string): Date | null {
  if (!dateString) return null;

  const parts = dateString.split('-');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);

  // Validate that the date is valid
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
}
