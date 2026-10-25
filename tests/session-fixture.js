/** Exercises the real SDK and app bootstrap with synthetic Auth/REST and tab storage. */

const nativeFetch = window.fetch.bind(window);
const sectionId = '20000000-0000-4000-8000-000000000001';
const user = { id: '00000000-0000-4000-8000-000000000001', app_metadata: {}, user_metadata: {} };
let releaseProfile;
let mockRequests = 0;
let boardReads = 0;
const checked = (id) => document.getElementById(id).checked;

// Controls survive browser reload; only synthetic fixture preferences use these keys.
for (const id of ['deny', 'fail', 'hold']) {
  const control = document.getElementById(id);
  control.checked = sessionStorage.getItem(`qa:session:${id}`) === 'true';
  control.onchange = () => sessionStorage.setItem(`qa:session:${id}`, String(control.checked));
}
if (new URLSearchParams(location.search).has('blocked')) {
  Object.defineProperty(window, 'sessionStorage', {
    get() {
      throw Error('QA storage unavailable');
    },
  });
}

/** Returns a bounded synthetic response compatible with the SDK's paginated reads. */
function response(data, status = 200) {
  const count = Array.isArray(data) ? data.length : 0;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Range': `0-${Math.max(0, count - 1)}/${count}`,
    },
  });
}

window.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (url.origin === location.origin) return nativeFetch(input);
  if (url.hostname !== 'vgciiqtwmxcdqppntgnt.supabase.co')
    throw Error('QA external request blocked');
  mockRequests++;
  if (url.pathname.endsWith('/token')) {
    const encode = (value) =>
      btoa(JSON.stringify(value)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
    const access = `${encode({ alg: 'HS256' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.synthetic`;
    return response({
      access_token: access,
      refresh_token: 'synthetic-only',
      token_type: 'bearer',
      expires_in: 3600,
      user,
    });
  }
  if (url.pathname.endsWith('/user'))
    return checked('fail')
      ? response({ message: 'Synthetic verification unavailable' }, 503)
      : response(user);
  if (url.pathname.endsWith('/logout')) return response({});
  if (url.pathname.endsWith('/admin_profiles')) {
    const profiles = checked('deny') ? [] : [{ active: true, role: 'admin' }];
    if (checked('hold'))
      await new Promise((resolve) => {
        releaseProfile = resolve;
      });
    return response(profiles);
  }
  if (url.pathname.endsWith('/app_usage'))
    return response({ storage_bytes: 0, database_bytes_estimate: 0 });
  if (url.pathname.endsWith('/boards')) return response([{ id: 'qa-board', title: 'Bảng QA' }]);
  if (url.pathname.endsWith('/sections'))
    return response([{ id: sectionId, title: 'Chủ đề QA', color: '#dcece5', sort_order: 0 }]);
  if (url.pathname.endsWith('/attachments')) return response([]);
  if (url.pathname.endsWith('/posts')) {
    boardReads++;
    return response([
      {
        id: 'qa-public',
        section_id: sectionId,
        title: 'PUBLIC QA',
        body: 'Synthetic',
        status: 'published',
        sort_order: 0,
      },
      {
        id: 'qa-private',
        section_id: sectionId,
        title: 'PRIVATE QA',
        body: 'Synthetic',
        status: 'draft',
        sort_order: 1,
      },
    ]);
  }
  throw Error('QA unexpected request blocked');
};

const { client, sessionPersistent } = await import('/src/services/client.js');
const main = await import('/src/main.js');
document.querySelector('#login').onclick = async () => {
  await client.auth.signInWithPassword({ email: 'qa@example.invalid', password: 'synthetic' });
  await main.refreshAuth();
};
document.querySelector('#expire').onclick = () => client.auth.signOut();
document.querySelector('#release').onclick = () => releaseProfile?.();
document.querySelector('#inspect').onclick = () => {
  let storedSessions = 0;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key.startsWith('khtn8:auth-key:') &&
        !sessionStorage.getItem(key).startsWith('khtn8:auth-key:')
      )
        storedSessions++;
    }
  } catch {
    /* Storage denial is an intentional fixture mode. */
  }
  document.querySelector('#evidence').textContent = JSON.stringify({
    sessionPersistent,
    storedSessions,
    boardReads,
    mockRequests,
    realSupabaseRequests: 0,
    authInLocalStorage: Object.keys(localStorage).some(
      (key) => key.startsWith('khtn8:auth-key:') || /^sb-.*-auth-token/.test(key),
    ),
    privateVisible: [...document.querySelectorAll('#app .post-card')].some((card) =>
      card.textContent.includes('PRIVATE QA'),
    ),
  });
};
