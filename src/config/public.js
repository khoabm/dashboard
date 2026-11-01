/**
 * Defines public Supabase client settings.
 * Secret or service-role keys must never be stored here.
 */

// Temporary QA-only override. Remove before merging this branch into develop.
// It cannot activate on the stable Pages hostname or outside this Pages project.
const previewHost = globalThis.location?.hostname || '';
const qaPreview =
  previewHost.endsWith('.student-dashboard-bcy.pages.dev') &&
  previewHost !== 'student-dashboard-bcy.pages.dev' &&
  new URLSearchParams(globalThis.location?.search || '').get('ai-v2') === '1';

export const config = {
  url: import.meta.env?.VITE_SUPABASE_URL || 'https://vgciiqtwmxcdqppntgnt.supabase.co',
  key:
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_A0kgJlsUnLFL_wrtJpkvtQ_GyBAf0UY',
  bucket: 'learning-resources',
  signedUrlSeconds: 60,
  assistantEndpoint:
    (qaPreview
      ? 'https://khtn8-assistant-v2-qa-20261101.joemckahn.workers.dev/chat'
      : import.meta.env?.VITE_BOARD_ASSISTANT_ENDPOINT ||
        'https://khtn8-board-assistant-mvp.joemckahn.workers.dev/chat'),
};
export const configured =
  config.url.startsWith('https://') && config.key.startsWith('sb_publishable_');
