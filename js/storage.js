/* İlerleme kaydı: tarayıcı belleği kapalıysa oyun yine çalışır, sadece kayıt tutulmaz. */
const Store = (() => {
  const KEY = 'hayalet-ve-insan:v1';
  let data = { unlocked: 1 };

  function init() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Number.isFinite(d.unlocked) && d.unlocked >= 1) data = { unlocked: Math.floor(d.unlocked) };
      }
    } catch (e) { /* kayıt okunamadı, varsayılanla devam */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* yazılamadı */ }
  }

  return {
    init,
    get unlocked() { return data.unlocked; },
    unlock(count) { if (count > data.unlocked) { data.unlocked = count; save(); } },
    reset() { data = { unlocked: 1 }; save(); }
  };
})();
