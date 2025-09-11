// utils/pucMapping.ts - PUC code to ramo mapping using pre-fetched data

import { createClient } from "@/utils/supabase/client";
import { RamoMappingData } from "@/types/insurance";

// Fallback ramo mappings in case database is unavailable (complete set from DB)
const FALLBACK_RAMO_MAPPINGS: RamoMappingData[] = [
  // Ramos padre
  { id: 1, codigo: "91", nombre: "Seguros Generales", es_ramo_padre: true, activo: true },
  { id: 2, codigo: "92", nombre: "Seguros de Fianzas", es_ramo_padre: true, activo: true },
  { id: 3, codigo: "93", nombre: "Seguros de Personas", es_ramo_padre: true, activo: true },
  { id: 4, codigo: "94", nombre: "Seguros Obligatorios", es_ramo_padre: true, activo: true },
  
  // Seguros Generales (91xx)
  { id: 6, codigo: "9101", nombre: "Incendio y aliados", es_ramo_padre: false, activo: true },
  { id: 7, codigo: "9102", nombre: "Robo", es_ramo_padre: false, activo: true },
  { id: 8, codigo: "9103", nombre: "Transportes", es_ramo_padre: false, activo: true },
  { id: 9, codigo: "9104", nombre: "Naves o embarcaciones", es_ramo_padre: false, activo: true },
  { id: 10, codigo: "9105", nombre: "Automotores", es_ramo_padre: false, activo: true },
  { id: 11, codigo: "9106", nombre: "Aeronavegación", es_ramo_padre: false, activo: true },
  { id: 12, codigo: "9107", nombre: "Ramos técnicos", es_ramo_padre: false, activo: true },
  { id: 13, codigo: "9108", nombre: "Responsabilidad civil", es_ramo_padre: false, activo: true },
  { id: 14, codigo: "9109", nombre: "Riesgos varios misceláneos", es_ramo_padre: false, activo: true },
  { id: 15, codigo: "9110", nombre: "Agropecuario", es_ramo_padre: false, activo: true },
  { id: 16, codigo: "9111", nombre: "Salud o enfermedad", es_ramo_padre: false, activo: true },
  { id: 17, codigo: "9112", nombre: "Accidentes personales", es_ramo_padre: false, activo: true },
  
  // Seguros de Fianzas (92xx)
  { id: 18, codigo: "9221", nombre: "Seriedad de propuesta", es_ramo_padre: false, activo: true },
  { id: 19, codigo: "9222", nombre: "Cumplimiento de obra", es_ramo_padre: false, activo: true },
  { id: 20, codigo: "9223", nombre: "Buena ejecución de obra", es_ramo_padre: false, activo: true },
  { id: 21, codigo: "9224", nombre: "Cumplimiento de servicios", es_ramo_padre: false, activo: true },
  { id: 22, codigo: "9225", nombre: "Cumplimiento de suministros", es_ramo_padre: false, activo: true },
  { id: 23, codigo: "9226", nombre: "Inversión de anticipos", es_ramo_padre: false, activo: true },
  { id: 24, codigo: "9227", nombre: "Fidelidad de empleados", es_ramo_padre: false, activo: true },
  { id: 25, codigo: "9228", nombre: "Créditos", es_ramo_padre: false, activo: true },
  { id: 26, codigo: "9229", nombre: "Cumplimiento de Obligaciones Aduaneras", es_ramo_padre: false, activo: true },
  { id: 27, codigo: "9230", nombre: "Cumplimiento de Obligaciones Legales y Contractuales de Telecomunicaciones", es_ramo_padre: false, activo: true },
  
  // Seguros de Personas (93xx)
  { id: 28, codigo: "9341", nombre: "Vida individual largo plazo", es_ramo_padre: false, activo: true },
  { id: 29, codigo: "9342", nombre: "Vida individual corto plazo", es_ramo_padre: false, activo: true },
  { id: 30, codigo: "9343", nombre: "Rentas", es_ramo_padre: false, activo: true },
  { id: 31, codigo: "9344", nombre: "Defunción o sepelio largo plazo", es_ramo_padre: false, activo: true },
  { id: 32, codigo: "9345", nombre: "Defunción o sepelio corto plazo", es_ramo_padre: false, activo: true },
  { id: 33, codigo: "9346", nombre: "Vida en grupo corto plazo", es_ramo_padre: false, activo: true },
  { id: 34, codigo: "9347", nombre: "Salud o enfermedad", es_ramo_padre: false, activo: true },
  { id: 35, codigo: "9348", nombre: "Desgravamen hipotecario largo plazo", es_ramo_padre: false, activo: true },
  { id: 36, codigo: "9349", nombre: "Desgravamen hipotecario corto plazo", es_ramo_padre: false, activo: true },
  { id: 37, codigo: "9350", nombre: "Accidentes personales", es_ramo_padre: false, activo: true },
  
  // Seguros Obligatorios (94xx)
  { id: 38, codigo: "9455", nombre: "Accidentes de tránsito", es_ramo_padre: false, activo: true },
  
  // Otros seguros (95xx, 96xx, etc.)
  { id: 39, codigo: "9505", nombre: "Servicios de Pre-Pago", es_ramo_padre: false, activo: true },
  { id: 40, codigo: "9561", nombre: "Salud o enfermedad", es_ramo_padre: false, activo: true },
  { id: 41, codigo: "9562", nombre: "Defunción o sepelio", es_ramo_padre: false, activo: true },
  { id: 42, codigo: "9674", nombre: "Vitalicios", es_ramo_padre: false, activo: true },
];

/**
 * Fetch all tipos_seguros from database - called ONCE during Excel upload
 * Uses server-side API route with better authentication handling
 */
export async function fetchRamoMappingData(): Promise<RamoMappingData[]> {
  try {
    console.log('🔍 Attempting to fetch ramo mapping data via API...');
    
    // Use server-side API route instead of direct client-side database call
    const response = await fetch('/api/ramo-mappings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    console.log('📡 API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error || 'Unknown error'
      });
      
      if (errorData.fallback) {
        console.log('📋 Server recommended using fallback mappings');
      }
      
      console.log('📋 Using fallback mappings due to API error');
      return FALLBACK_RAMO_MAPPINGS;
    }

    const apiResult = await response.json();
    console.log('📊 API response:', {
      success: apiResult.success,
      count: apiResult.count || 0,
      hasData: !!apiResult.data
    });

    if (!apiResult.success || !apiResult.data || apiResult.data.length === 0) {
      console.warn('⚠️ API returned no data, using fallback ramo mappings');
      console.log('📋 Total fallback mappings available:', FALLBACK_RAMO_MAPPINGS.length);
      return FALLBACK_RAMO_MAPPINGS;
    }

    const result: RamoMappingData[] = apiResult.data;
    console.log(`✅ Successfully fetched ${result.length} ramo mappings from API`);
    console.log('📋 Sample codes from API:', result.slice(0, 5).map(r => r.codigo).join(', '));
    
    return result;
    
  } catch (error) {
    console.error('💥 Exception fetching ramo mapping data via API:', error);
    console.log('📋 Using fallback ramo mappings due to exception');
    console.log('📋 Total fallback mappings available:', FALLBACK_RAMO_MAPPINGS.length);
    return FALLBACK_RAMO_MAPPINGS;
  }
}

/**
 * Extract ramo code from PUC
 * PUC format: XXYYZZ where XX=master (91), YY=ramo (05), ZZ=product (47)
 * Returns the first 4 digits for database lookup
 * 
 * @param puc - 6-digit PUC code (e.g., "910547")
 * @returns 4-digit ramo code (e.g., "9105") or null if invalid
 */
export function extractRamoCodeFromPUC(puc: string): string | null {
  if (!puc || typeof puc !== 'string') {
    return null;
  }

  // Clean and validate PUC format
  const cleanPuc = puc.replace(/\D/g, ''); // Remove non-digits
  
  if (cleanPuc.length !== 6) {
    console.warn(`Invalid PUC format: ${puc}. Expected 6 digits, got ${cleanPuc.length}`);
    return null;
  }

  // Extract first 4 digits for ramo lookup
  return cleanPuc.substring(0, 4);
}

/**
 * Map PUC code to ramo name using pre-fetched data
 * 
 * @param puc - 6-digit PUC code (e.g., "910547")
 * @param ramoMappingData - Pre-fetched ramo mapping data
 * @returns Ramo name (e.g., "Automotores") or null if not found
 */
export function mapPUCToRamo(puc: string, ramoMappingData: RamoMappingData[]): string | null {
  const ramoCode = extractRamoCodeFromPUC(puc);
  
  if (!ramoCode) {
    console.warn(`❌ Invalid PUC format: ${puc}`);
    return null;
  }

  console.log(`🔍 Mapping PUC ${puc} → code ${ramoCode}`);
  
  const matchedRamo = ramoMappingData.find(ramo => ramo.codigo === ramoCode);
  
  if (matchedRamo) {
    console.log(`✅ Mapped ${puc} (${ramoCode}) → "${matchedRamo.nombre}"`);
    return matchedRamo.nombre;
  }

  console.warn(`⚠️ No ramo found for PUC ${puc} (code: ${ramoCode})`);
  console.log(`📋 Available codes:`, ramoMappingData.map(r => r.codigo).slice(0, 10).join(', '), '...');
  return null;
}

/**
 * Get the effective ramo name for a record using pre-fetched data
 * Priority: ramoOverride > PUC mapping > default fallback
 * 
 * @param puc - PUC code from Excel
 * @param ramoOverride - Manual override value
 * @param ramoMappingData - Pre-fetched ramo mapping data
 * @returns Effective ramo name
 */
export function getEffectiveRamo(
  puc?: string, 
  ramoOverride?: string,
  ramoMappingData: RamoMappingData[] = []
): string {
  console.log(`🎯 Getting effective ramo for PUC: ${puc}, Override: ${ramoOverride || 'none'}, MappingData: ${ramoMappingData.length} items`);

  // 1. Manual override has highest priority
  if (ramoOverride && ramoOverride.trim()) {
    console.log(`✅ Using manual override: "${ramoOverride.trim()}"`);
    return ramoOverride.trim();
  }

  // 2. Try PUC mapping
  if (puc && ramoMappingData.length > 0) {
    const mappedRamo = mapPUCToRamo(puc, ramoMappingData);
    if (mappedRamo) {
      console.log(`✅ Using PUC mapping: "${mappedRamo}"`);
      return mappedRamo;
    }
  } else if (!puc) {
    console.log(`⚠️ No PUC code provided`);
  } else if (ramoMappingData.length === 0) {
    console.log(`⚠️ No ramo mapping data available`);
  }

  // 3. Default fallback (no original ramo column anymore)
  console.log(`🔄 Using default fallback: "Seguros Generales"`);
  return 'Seguros Generales';
}

/**
 * Validate PUC format and provide user feedback
 * 
 * @param puc - PUC code to validate
 * @returns Validation result with feedback
 */
export function validatePUC(puc: string): { valid: boolean; message?: string } {
  if (!puc || typeof puc !== 'string') {
    return { valid: false, message: 'PUC es requerido' };
  }

  const cleanPuc = puc.replace(/\D/g, '');
  
  if (cleanPuc.length !== 6) {
    return { 
      valid: false, 
      message: `PUC debe tener 6 dígitos. Recibido: ${cleanPuc.length} dígitos` 
    };
  }

  // Check if it starts with known master codes (add more as needed)
  const masterCode = cleanPuc.substring(0, 2);
  const knownMasterCodes = ['91']; // Add more as they become available
  
  if (!knownMasterCodes.includes(masterCode)) {
    return { 
      valid: false, 
      message: `Código maestro desconocido: ${masterCode}. Códigos conocidos: ${knownMasterCodes.join(', ')}` 
    };
  }

  return { valid: true };
}