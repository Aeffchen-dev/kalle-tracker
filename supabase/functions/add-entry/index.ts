import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Support both GET (for Shortcuts) and POST
    let type: string;
    let time: string | undefined;
    let logged_by: string | undefined;
    let weight_value: number | undefined;
    let ph_value: string | undefined;
    let meal_timing: string | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      type = url.searchParams.get('type') || '';
      time = url.searchParams.get('time') || undefined;
      logged_by = url.searchParams.get('logged_by') || undefined;
      const weightParam = url.searchParams.get('weight_value');
      weight_value = weightParam ? parseFloat(weightParam) : undefined;
      ph_value = url.searchParams.get('ph_value') || undefined;
      meal_timing = url.searchParams.get('meal_timing') || undefined;
    } else {
      const body = await req.json();
      type = body.type || '';
      time = body.time;
      logged_by = body.logged_by;
      weight_value = body.weight_value;
      ph_value = body.ph_value;
      meal_timing = body.meal_timing;
    }

    // Validate type
    const validTypes = ['walk', 'pee', 'poop', 'food', 'weight', 'urin'];
    if (!type || !validTypes.includes(type)) {
      console.error('Invalid or missing type:', type);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use current time if not provided
    const eventTime = time || new Date().toISOString();

    console.log('Adding entry:', { type, time: eventTime, logged_by, weight_value, ph_value, meal_timing });

    const { data, error } = await supabase
      .from('events')
      .insert({
        type,
        time: eventTime,
        logged_by: logged_by || null,
        weight_value: weight_value || null,
        ph_value: ph_value || null,
        meal_timing: meal_timing || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Entry added successfully:', data);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type} logged successfully`,
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
