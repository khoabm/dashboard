/** Coordinates route history and administrator entry without DOM, SDK or network dependencies. */

/** Waits for existing Auth work before acting; stale routes/sessions cannot open a login dialog. */
export function createAdminEntry({ ready, state, login, notify }) {
  let pending = false;
  return async () => {
    if (pending) return;
    pending = true;
    const generation = state().generation;
    try {
      await ready();
      const current = state();
      if (!current.active || current.generation !== generation) return;
      if (current.checking || current.failed)
        notify('Chưa thể xác minh phiên đăng nhập. Hãy thử lại trên bảng học liệu.', true);
      else if (current.admin) notify('Bạn đang ở chế độ quản trị.');
      else login();
    } finally {
      pending = false;
    }
  };
}

/**
 * Restores rejected traversals by their existing history position, never by adding an entry.
 * The caller owns route validation/rendering; history state contains only a scope and integer position.
 */
export function createRouteNavigation({ history, location, prepare, show, initialPath, newScope }) {
  const marker = '__khtn8Route';
  const previous = history.state?.[marker];
  let scope = previous?.scope || newScope(),
    position = Number.isSafeInteger(previous?.position) ? previous.position : 0,
    path = initialPath,
    generation = 0,
    restoring = false,
    preparation = null,
    preparationTarget = null;

  const stamp = (value, index) => ({
    ...(value && typeof value === 'object' ? value : {}),
    [marker]: { scope, position: index },
  });
  history.replaceState(stamp(history.state, position), '', path);

  /** Shares a pending guard only for the same target, never a stay-on-Board approval for an exit. */
  function allowed(target) {
    if (!preparation || preparationTarget !== target) {
      preparationTarget = target;
      const pending = Promise.resolve()
        .then(() => prepare(target))
        .catch(() => false)
        .finally(() => {
          if (preparation === pending) preparation = null;
        });
      preparation = pending;
    }
    return preparation;
  }

  return {
    async navigate(target) {
      if (preparation || restoring) return false;
      const ticket = ++generation;
      const accepted = await allowed(target);
      if (ticket !== generation || !accepted) return false;
      if (location.pathname !== target) {
        position++;
        history.pushState(stamp(null, position), '', target);
      }
      path = target;
      await show(target);
      return ticket === generation;
    },
    async pop(value) {
      const target = location.pathname;
      const entry = value?.[marker];
      const tracked = entry?.scope === scope && Number.isSafeInteger(entry.position);
      if (restoring) {
        if (tracked && entry.position === position) {
          restoring = false;
          return false;
        }
        if (tracked) {
          history.go(position - entry.position);
          return false;
        }
        restoring = false;
      }
      const ticket = ++generation;
      const accepted = await allowed(target);
      if (ticket !== generation) return false;
      if (!accepted) {
        if (tracked && entry.position !== position) {
          restoring = true;
          history.go(position - entry.position);
        } else {
          // Pre-upgrade/unowned entries have no reliable delta; repair the URL without growing history.
          scope = newScope();
          position = 0;
          history.replaceState(stamp(value, position), '', path);
        }
        return false;
      }
      if (tracked) position = entry.position;
      else {
        scope = newScope();
        position = 0;
        history.replaceState(stamp(value, position), '', target);
      }
      path = target;
      await show(target);
      return ticket === generation;
    },
  };
}
