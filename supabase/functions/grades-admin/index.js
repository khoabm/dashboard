/** Verified teacher endpoint. Deployment and real secrets are separate acceptance gates. */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createEdgeRuntime } from '../_shared/runtime.js';

Deno.serve(createEdgeRuntime('admin', (name) => Deno.env.get(name), createClient));
