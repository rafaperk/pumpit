// Saving files. On the published page it uses the viewer's downloads capability; from a local file, a plain
// download link.
(function (root) {
  const PumpIt = root.PumpIt;
  const { toast } = PumpIt.ui.dialogs;
  const { t } = PumpIt.i18n;

  async function saveFile(filename, blob) {
    let dl = null;
    try { dl = root.claude && root.claude.use ? await root.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename, data: blob }); toast(t('app.files.saved', { name: filename })); }
      catch (e) { toast(e && e.code === 'declined' ? t('app.files.cancelled') : t('app.files.cannotSave')); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(t('app.files.started', { name: filename }));
  }

  // file name made of safe characters
  const safeName = (s) => (s || t('app.files.defaultName')).replace(/[^\w\-. ]+/g, '_').trim() || t('app.files.defaultName');

  PumpIt.ui.download = { saveFile, safeName };
})(typeof window !== 'undefined' ? window : globalThis);
