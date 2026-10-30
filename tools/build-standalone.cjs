// Builds dist/PumpIt.html: the whole app in one file, for people who only want to open it. Usage: npm run build
//   0. the tests run first (npm test), and the file is built only when they pass;
//   1. the stylesheets and scripts listed in index.html are copied into it in the same order, one <style> or <script>
//      per file, so the page runs as index.html does;
//   2. the Google Fonts it links (IBM Plex) go inside as data, with their licence (tools/OFL-IBM-Plex.txt), so the
//      file keeps its fonts offline. They are fetched on every build and kept in dist/fonts/ for a build without a
//      connection;
//   3. the file stays offline and asks for nothing: a source that names a network API, loads or opens a web address
//      or asks for a device or a permission stops the build, and a Content-Security-Policy at the top of the page
//      makes the browser refuse every connection and run only the page's own scripts, known by their SHA-256;
//   4. dist/PumpIt.sha256.txt holds the SHA-256 of the file, for whoever receives it to check their copy.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'PumpIt.html');
const SUM = path.join(DIST, 'PumpIt.sha256.txt');
const KEPT = path.join(DIST, 'fonts');
// Google Fonts answers a recent browser with woff2 files split by alphabet (unicode-range)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// what would take the page to the network: its APIs, and a web address given to a link, a resource or a form (an XML
// namespace is a name, not an address, and may stay)
const NETWORK = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bEventSource\b/, /\bsendBeacon\b/, /\bRTCPeerConnection\b/,
  /\bimportScripts\b/, /\bserviceWorker\b/, /\bwindow\.open\s*\(/, /\b(?:href|src|action)\s*=\s*["'`]?\s*(?:https?|ftp|wss?):/i];
// what would ask the browser for a device or a permission (writing to the clipboard needs none)
const PERMISSIONS = [/\bgetUserMedia\b/, /\bgetDisplayMedia\b/, /\bgeolocation\b/, /\bNotification\.requestPermission\b/, /\bnew Notification\b/,
  /\bclipboard\.read/, /\bnavigator\.(?:usb|bluetooth|serial|hid|mediaDevices)\b/];

// a file of the app, refused if it holds text that would close its <style> or <script> early, reach the network or
// ask for a permission; its line ends become LF, as the browser reads them, so the hash of a script is the one the
// browser computes
function source(file, ...forbidden) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n?/g, '\n');
  for (const s of forbidden) if (text.toLowerCase().includes(s)) throw new Error(`${file} contains ${s}, which would break it inline`);
  const at = (m) => `${m[0]} on line ${text.slice(0, m.index).split('\n').length}`;
  for (const re of NETWORK) { const m = re.exec(text); if (m) throw new Error(`${file} reaches for the network (${at(m)}); the file must stay offline`); }
  for (const re of PERMISSIONS) { const m = re.exec(text); if (m) throw new Error(`${file} asks for a device or a permission (${at(m)}); the file asks for none`); }
  return text.endsWith('\n') ? text : text + '\n';
}

// the policy of the page: nothing loaded from outside, no connection, no form sent, and of the scripts only its own.
// The script hashes go last, so the start of the line reads as the rule.
function policy(html) {
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  return ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "object-src 'none'", "style-src 'unsafe-inline'",
    'font-src data:', 'img-src data: blob:', `script-src ${hashes.join(' ')}`].join('; ');
}

// a file from Google Fonts; without a connection, the copy kept by the last build
async function fetchKept(url, name, binary) {
  const kept = path.join(KEPT, name);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    fs.mkdirSync(KEPT, { recursive: true });
    fs.writeFileSync(kept, data);
    return data;
  } catch (e) {
    if (!fs.existsSync(kept)) throw new Error(`cannot fetch ${url} (${e.message}), and dist/fonts/ has no copy of it`);
    console.log(`  ${name}: the copy in dist/fonts/ (${e.message})`);
    return fs.readFileSync(kept, binary ? null : 'utf8');
  }
}

// the @font-face rules of the Google Fonts stylesheet, each file as data. Google lists a variable font (IBM Plex Sans)
// once per weight with the same file: it goes in once, with those weights as a range.
async function embeddedFonts(href) {
  const css = await fetchKept(href, 'fonts.css');
  const faces = new Map(); // file URL → { subset, d: descriptors, weights }
  for (const [, subset, body] of css.matchAll(/(?:\/\* ([\w-]+) \*\/\s*)?@font-face \{([^}]*)\}/g)) {
    const d = Object.fromEntries([...body.matchAll(/^\s*([\w-]+):\s*(.+?);\s*$/gm)].map((m) => [m[1], m[2]]));
    // a file of its own (…/name.woff2) or, as Google sometimes answers for a family, a kit address (…/l/font?kit=…)
    const url = (/^url\((https:[^)]+)\) format\('woff2'\)$/.exec(d.src) || [])[1];
    if (!url) throw new Error(`a font that is not one woff2 file: ${d.src}`);
    const face = faces.get(url);
    if (!face) { faces.set(url, { subset, d, weights: [d['font-weight']] }); continue; }
    const rest = (o) => JSON.stringify({ ...o, 'font-weight': '' });
    if (rest(face.d) !== rest(d)) throw new Error(`${url} is listed with other descriptors than its weight`);
    face.weights.push(d['font-weight']);
  }
  if (!faces.size) throw new Error('the Google Fonts stylesheet has no @font-face rule');
  const rules = [];
  for (const [url, { subset, d, weights }] of faces) {
    const file = await fetchKept(url, url.replace(/^https:\/\/fonts\.gstatic\.com\/(s\/)?/, '').replace(/[^\w.-]+/g, '_'), true);
    const w = weights.flatMap((x) => x.split(/\s+/)).map(Number), lo = Math.min(...w), hi = Math.max(...w);
    const all = { ...d, 'font-weight': lo === hi ? String(lo) : `${lo} ${hi}`, src: `url(data:font/woff2;base64,${file.toString('base64')}) format('woff2')` };
    rules.push(`${subset ? `/* ${subset} */\n` : ''}@font-face {\n${Object.entries(all).map(([k, v]) => `  ${k}: ${v};\n`).join('')}}\n`);
  }
  const licence = fs.readFileSync(path.join(__dirname, 'OFL-IBM-Plex.txt'), 'utf8').trim();
  if (licence.includes('*/')) throw new Error('the font licence would close its CSS comment');
  // the comment names no address, so that nobody reading the file takes it for a request
  return { css: `/* IBM Plex, from Google Fonts, embedded in this file when it was built: the page loads them from no server.\n\n${licence}\n*/\n${rules.join('')}`, files: faces.size };
}

// the commit the file is built from, whether the files of the app had changes not committed yet, and the day of the
// build where it was built (not in UTC, which in Brazil turns to the next day in the evening)
function stamp() {
  const now = new Date(), two = (n) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  try {
    const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const changed = git('status', '--porcelain', '--', 'index.html', 'src') ? ' with changes not committed' : '';
    return `Pump It ${git('rev-parse', '--short', 'HEAD')}${changed}, built ${day}`;
  } catch (e) {
    return `Pump It, built ${day}`;
  }
}

// the tests come first: a file is built only from code that passes them
function test() {
  try {
    execSync('npm test', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('npm test: passed');
  } catch (e) {
    process.stdout.write(e.stdout || '');
    process.stderr.write(e.stderr || '');
    throw new Error('the tests failed, so no file was built');
  }
}

async function main() {
  test();
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const link = /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)">/.exec(html);
  if (!link) throw new Error('index.html no longer links the Google Fonts stylesheet');
  const fonts = await embeddedFonts(link[1].replace(/&amp;/g, '&'));
  let sheets = 0, scripts = 0;
  html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.[^"]+"( crossorigin)?>\n/g, '')
    .replace(link[0], () => `<style>\n${fonts.css}</style>`)
    .replace(/<link rel="stylesheet" href="(src\/[^"]+\.css)">/g, (m, file) => { sheets++; return `<style>/* ${file} */\n${source(file, '</style')}</style>`; })
    .replace(/<script src="(src\/[^"]+\.js)" charset="utf-8"><\/script>/g, (m, file) => { scripts++; return `<script>// ${file}\n${source(file, '</script', '<!--')}</script>`; });
  // every file the page loads is inside now, every script is one the policy lists, and the page itself (index.html)
  // reaches for no web address either
  const left = html.match(/<script src=[^>]*>|<link [^>]*>|url\(https?:[^)]*\)/g);
  if (left) throw new Error(`still loaded from outside: ${left.join(', ')}`);
  const odd = html.match(/<script(?!>)[^>]*>/g);
  if (odd) throw new Error(`scripts the policy would not list: ${odd.join(', ')}`);
  for (const re of NETWORK) { const m = re.exec(html); if (m) throw new Error(`index.html reaches for the network (${m[0]}); the file must stay offline`); }
  html = html.replace('<meta charset="utf-8">\n', () => '<meta charset="utf-8">\n'
    + `<!-- ${stamp()} by tools/build-standalone.cjs from index.html and src/: change those, not this file -->\n`
    + '<!-- Security policy: the browser loads nothing from outside, connects nowhere, sends no form and runs only the scripts of this file, known by their SHA-256 -->\n'
    + `<meta http-equiv="Content-Security-Policy" content="${policy(html)}">\n`);
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(OUT, html);
  const sum = crypto.createHash('sha256').update(html, 'utf8').digest('hex').toUpperCase();
  fs.writeFileSync(SUM, `${sum}  PumpIt.html\n`);
  console.log(`${path.relative(ROOT, OUT)}: ${sheets} stylesheets, ${scripts} scripts and ${fonts.files} font files, ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB`);
  console.log(`SHA-256 ${sum} (${path.relative(ROOT, SUM)})`);
}

main().catch((e) => { console.error('build failed: ' + e.message); process.exit(1); });
