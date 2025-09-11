// app/api/ramo-mappings/route.ts - Server-side API to fetch ramo mappings
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RamoMappingData } from '@/types/insurance';

export async function GET() {
  try {
    console.log('🔍 Server-side: Fetching ramo mapping data from database...');
    
    const supabase = await createClient();
    
    // Check authentication on server side
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Server-side authentication failed:', authError?.message || 'No user');
      return NextResponse.json({ 
        error: 'Authentication required',
        fallback: true 
      }, { status: 401 });
    }

    console.log('✅ Server-side user authenticated:', user.email);

    // Query the database with server-side client
    const { data, error } = await supabase
      .from('tipos_seguros')
      .select('id, codigo, nombre, es_ramo_padre, activo')
      .eq('activo', true)
      .order('codigo');

    if (error) {
      console.error('❌ Server-side database error:', error);
      return NextResponse.json({ 
        error: error.message,
        fallback: true 
      }, { status: 500 });
    }

    const result: RamoMappingData[] = data || [];
    console.log(`✅ Server-side: Successfully fetched ${result.length} ramo mappings`);

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length
    });

  } catch (error) {
    console.error('💥 Server-side exception:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      fallback: true 
    }, { status: 500 });
  }
}