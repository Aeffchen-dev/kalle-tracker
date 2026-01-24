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

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('countdown_mode, walk_interval_hours')
      .eq('id', 'default')
      .single();

    if (settingsError) {
      console.error('Settings error:', settingsError);
    }

    const countdownMode = settingsData?.countdown_mode || 'count_up';
    const walkIntervalHours = settingsData?.walk_interval_hours || 4;

    // Fetch last walk event
    const { data: lastWalkData, error: walkError } = await supabase
      .from('events')
      .select('time')
      .in('type', ['walk', 'pipi', 'stuhlgang'])
      .order('time', { ascending: false })
      .limit(1)
      .single();

    if (walkError && walkError.code !== 'PGRST116') {
      console.error('Walk error:', walkError);
    }

    const lastWalkTime = lastWalkData?.time || null;
    const now = new Date();
    
    let displayText = '00min';
    let elapsedMinutes = 0;
    let remainingMinutes = 0;

    if (lastWalkTime) {
      const lastWalk = new Date(lastWalkTime);
      const diffMs = now.getTime() - lastWalk.getTime();
      elapsedMinutes = Math.floor(diffMs / 60000);
      const intervalMinutes = walkIntervalHours * 60;
      remainingMinutes = Math.max(0, intervalMinutes - elapsedMinutes);

      if (countdownMode === 'count_up') {
        // Count up from last walk
        const hours = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        displayText = hours > 0 
          ? `${hours}h ${mins.toString().padStart(2, '0')}min`
          : `${mins}min`;
      } else {
        // Count down to next walk
        if (remainingMinutes <= 0) {
          displayText = 'Jetzt!';
        } else {
          const hours = Math.floor(remainingMinutes / 60);
          const mins = remainingMinutes % 60;
          displayText = hours > 0 
            ? `${hours}h ${mins.toString().padStart(2, '0')}min`
            : `${mins}min`;
        }
      }
    }

    console.log('Timer status:', { countdownMode, displayText, elapsedMinutes, remainingMinutes });

    return new Response(
      JSON.stringify({
        success: true,
        countdown_mode: countdownMode,
        walk_interval_hours: walkIntervalHours,
        last_walk_time: lastWalkTime,
        elapsed_minutes: elapsedMinutes,
        remaining_minutes: remainingMinutes,
        display_text: displayText,
        is_overdue: remainingMinutes <= 0 && lastWalkTime !== null
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
