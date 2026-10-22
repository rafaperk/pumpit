// Minimal .xlsx (Office Open XML) writer with no dependencies: uncompressed ZIP + XML.
// Bold header with a fill, thin borders, real numbers with a fixed format and row 1 frozen; one sheet or several.
(function (root) {
  const PumpIt = root.PumpIt;

  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  function zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const x = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

  // a sheet name Excel accepts: no \ / ? * [ ] :, at most 31 characters, not used by another sheet
  function sheetNames(list) {
    const names = [];
    for (const s of list) {
      const base = String(s.name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
      let n = base;
      for (let k = 2; names.includes(n); k++) n = `${base.slice(0, 26)} (${k})`;
      names.push(n);
    }
    return names;
  }

  // a worksheet: the header in row 1 (frozen, with a filter), then the rows
  function sheetXml({ columns, rows }, numXf, selected) {
    const head = `<row r="1" ht="32" customHeight="1">${columns.map((c, i) => `<c r="${colName(i)}1" t="inlineStr" s="1"><is><t>${x(c.header)}</t></is></c>`).join('')}</row>`;
    const body = rows.map((row, ri) => {
      const r = ri + 2;
      return `<row r="${r}">${row.map((v, ci) => {
        const ref = colName(ci) + r, c = columns[ci];
        if (typeof v === 'number' && Number.isFinite(v) && c.format !== 'text') return `<c r="${ref}" s="${numXf(c.format)}"><v>${v}</v></c>`;
        return `<c r="${ref}" t="inlineStr" s="2"><is><t>${x(v ?? '')}</t></is></c>`;
      }).join('')}</row>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView${selected ? ' tabSelected="1"' : ''} workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 14}" customWidth="1"/>`).join('')}</cols>
<sheetData>${head}${body}</sheetData>
<autoFilter ref="A1:${colName(columns.length - 1)}${rows.length + 1}"/>
</worksheet>`;
  }

  // sheets: [{ name, columns: [{ header, width, format: 'text' | a number format such as '0.00' }], rows: arrays of
  // values }]; a single sheet may also be given as { sheet (its name), columns, rows }
  function workbook({ sheets, sheet = 'Sheet1', columns, rows }) {
    const list = sheets || [{ name: sheet, columns, rows }];
    const fmts = [...new Set(list.flatMap((s) => s.columns.map((c) => c.format)).filter((f) => f && f !== 'text'))];
    const fmtId = (f) => 164 + fmts.indexOf(f);
    // styles: 0 default, 1 header, 2 text with border, 3.. numbers with border (one per format)
    const numXf = (f) => 3 + fmts.indexOf(f);
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="${fmts.length}">${fmts.map((f) => `<numFmt numFmtId="${fmtId(f)}" formatCode="${x(f)}"/>`).join('')}</numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A6A86"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFB7C4CB"/></left><right style="thin"><color rgb="FFB7C4CB"/></right><top style="thin"><color rgb="FFB7C4CB"/></top><bottom style="thin"><color rgb="FFB7C4CB"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${3 + fmts.length}">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
${fmts.map((f) => `<xf numFmtId="${fmtId(f)}" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>`).join('\n')}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    const names = sheetNames(list);
    // the range of the filter of a sheet, for its defined name ('Sheet name'!$A$1:$C$9, a quote doubled)
    const range = (s, i) => `'${names[i].replace(/'/g, "''")}'!$A$1:$${colName(s.columns.length - 1)}$${s.rows.length + 1}`;
    const WS = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
    const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    return zip([
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${list.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${WS}"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${list.map((s, i) => `<sheet name="${x(names[i])}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames>${list.map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${x(range(s, i))}</definedName>`).join('')}</definedNames></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${list.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: styles },
      ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s, numXf, i === 0) })),
    ]);
  }

  PumpIt.ui.xlsx = { workbook, crc32 };
})(typeof window !== 'undefined' ? window : globalThis);
