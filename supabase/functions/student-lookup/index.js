/** Anonymous pair/capability endpoint; all sensitive reads follow a committed DB limiter. */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createEdgeRuntime } from '../_shared/runtime.js';

Deno.serve(createEdgeRuntime('student', (name) => Deno.env.get(name), createClient));
