import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tables = ['events', 'settings', 'places', 'snacks', 'medicines', 'planned_walks', 'tagesplan'];
    const exportData: Record<string, unknown[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error fetching ${table}:`, error);
        exportData[table] = [];
      } else {
        exportData[table] = data || [];
      }
    }

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="kalle-export.json"',
        },
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
