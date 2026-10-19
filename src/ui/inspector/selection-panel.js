// Inspector panel for a multiple selection: group actions and the list of selected objects.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, I = UI.inspector;
  const F = UI.format;
  const { el, section } = UI.forms;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  I.panels.selection = (host) => {
    const keys = [...app.selSet];
    const nj = keys.filter((k) => k[0] === 'j').length, np = keys.length - nj;
    I.head(host, t('inspector.selection.title', { n: keys.length }), '', t('inspector.selection.meta', { junctions: nj, pipes: np }));
    const s = section(t('inspector.selection.actions'), { info: t('inspector.selection.hint') });
    const row = el('div', { class: 'btn-row' });
    const mk = (label, fn) => { const b = el('button', { class: 'btn small', type: 'button' }, F.esc(label)); b.addEventListener('click', fn); row.appendChild(b); };
    mk(t('inspector.selection.copy'), () => app.copySelection());
    if (app.clipboard) mk(t('inspector.selection.paste'), () => app.paste());
    mk(t('inspector.selection.delete'), () => app.deleteSelection());
    s.appendChild(row);
    host.appendChild(s);
    const list = section(t('inspector.selection.selected'));
    list.appendChild(el('p', { class: 'hint' }, keys.map((k) => (k[0] === 'p' ? 'P' : 'J') + k.slice(2)).join(', ')));
    host.appendChild(list);
  };
})(typeof window !== 'undefined' ? window : globalThis);
