// Saving files: an ordinary browser download of the file's contents, made in memory.
(function (root) {
  const PumpIt = root.PumpIt;
  const { toast } = PumpIt.ui.dialogs;
  const { t } = PumpIt.i18n;

  function saveFile(filename, blob) {
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
