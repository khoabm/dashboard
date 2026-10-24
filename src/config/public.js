/**
 * Defines public Supabase client settings.
 * Secret or service-role keys must never be stored here.
 */

export const config = {
  url: import.meta.env?.VITE_SUPABASE_URL || 'https://vgciiqtwmxcdqppntgnt.supabase.co',
  key:
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_A0kgJlsUnLFL_wrtJpkvtQ_GyBAf0UY',
  bucket: 'learning-resources',
  signedUrlSeconds: 60,
};
export const configured =
  config.url.startsWith('https://') && config.key.startsWith('sb_publishable_');
