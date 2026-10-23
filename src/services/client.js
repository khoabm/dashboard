import {createClient} from '@supabase/supabase-js';
import {config, configured} from '../config/public.js';
// Sessions stay in memory: no refresh token is duplicated in browser draft storage.
export const client = configured ? createClient(config.url, config.key, {auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:true}}) : null;
export function requireClient() { if(!client) throw Error('Chưa cấu hình Supabase. Xem README để thiết lập URL và publishable key.'); return client; }
export async function result(query) { const {data,error}=await query; if(error) throw error; return data; }
