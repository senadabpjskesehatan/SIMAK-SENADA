import * as XLSX from 'xlsx';
import { Ticket } from '../types';

/**
 * Standardizes header strings to match internal keys
 * Broad coverage for Indonesian BPJS & customer care spreadsheets
 */
export function normalizeColumnKey(header: string): string {
  if (!header || typeof header !== 'string') return '';
  const raw = header.trim().toLowerCase();
  const clean = raw.replace(/[^a-z0-9]/g, '');

  // 1. Nomor Tiket
  if (
    (clean.includes('nomor') && (clean.includes('tiket') || clean.includes('ticket') || clean.includes('no') || clean.includes('lapor') || clean.includes('aduan'))) ||
    clean === 'notiket' || clean === 'tiket' || clean === 'ticketid' || clean === 'id' ||
    clean === 'kodetiket' || clean === 'ticketno' || clean === 'ticketnumber' || clean === 'noticket' ||
    clean === 'nopendaftaran' || clean === 'idpengaduan' || clean === 'kodelayanan' ||
    clean === 'nolaporan' || clean === 'nopengaduan' || clean === 'idtiket' || clean === 'notkt' || clean === 'tkt' ||
    clean === 'no' || clean === 'nomor'
  ) {
    return 'nomorTiket';
  }

  // 2. Tanggal Tiket
  if (
    clean.includes('tanggal') || clean.includes('tgl') || clean.includes('date') ||
    clean === 'waktu' || clean === 'timestamp' || clean === 'waktulapor' || clean === 'tanggallapor' ||
    clean === 'createdat' || clean === 'tglinput' || clean === 'waktuinput' || clean === 'tgltransaksi' ||
    clean === 'periode'
  ) {
    return 'tanggalTiket';
  }

  // 3. Kategori (Informasi, Permintaan, Pengaduan)
  if (
    clean === 'kategori' || clean === 'category' || clean === 'kategoritiket' || clean === 'kategorilayanan' ||
    clean === 'jenistiket' || clean === 'jenispelayanan' || clean === 'klasifikasi' || clean === 'tipe' || clean === 'tipetiket' ||
    (clean.includes('kategori') && !clean.includes('sub') && !clean.includes('pokok')) ||
    (clean.includes('category') && !clean.includes('sub')) ||
    (clean.includes('jenis') && !clean.includes('sub') && !clean.includes('pokok'))
  ) {
    return 'kategori';
  }

  // 4. Pokok Masalah
  if (
    clean.includes('pokok') || clean.includes('mainissue') || clean.includes('rootcause') ||
    clean === 'masalah' || clean === 'permasalahan' || clean === 'pokokpermasalahan' ||
    clean === 'substansi' || clean === 'hal' || clean === 'isu' || clean === 'isumasalah' ||
    clean === 'topikutama' || clean === 'pokokmasalahpengaduan'
  ) {
    return 'pokokMasalah';
  }

  // 5. Topik Masalah
  if (
    clean.includes('topik') || clean.includes('subissue') || clean.includes('subkategori') ||
    clean === 'subtopik' || clean === 'submasalah' || clean === 'rincianmasalah' ||
    clean === 'detailmasalah' || clean === 'subkategorimasalah' ||
    clean === 'rincian' || clean === 'sub'
  ) {
    return 'topikMasalah';
  }

  // 6. Isi Keluhan / Pertanyaan
  if (
    clean.includes('keluhan') || clean.includes('complaint') || clean.includes('pertanyaan') ||
    clean.includes('pesan') || clean === 'uraiankeluhan' || clean === 'deskripsikeluhan' ||
    clean === 'keluhanpeserta' || clean === 'pertanyaanpeserta' || clean === 'uraian' ||
    clean === 'deskripsi' || clean === 'isi' || clean === 'detail' || clean === 'pesanpeserta' ||
    clean === 'komplain' || clean === 'keluhanmasyarakat' || clean === 'kronologis' ||
    clean === 'kronologi' || clean === 'kasus' || clean === 'kendala' || clean === 'isimasalah' ||
    clean === 'materi'
  ) {
    return 'isiKeluhan';
  }

  // 7. Isi Jawaban / Respons Petugas
  if (
    clean.includes('jawaban') || clean.includes('respons') || clean.includes('response') ||
    clean.includes('solusi') || clean.includes('penyelesaian') || clean.includes('tanggapan') ||
    clean.includes('tindaklanjut') || clean === 'jawabanpetugas' || clean === 'uraianjawaban' ||
    clean === 'feedback' || clean === 'feedbackpetugas' || clean === 'isijawabanpetugas' ||
    clean === 'responpetugas' || clean === 'tanggapanpetugas' || clean === 'solusipetugas' ||
    clean === 'keterangan' || clean === 'penjelasan' || clean === 'tindakan' || clean === 'hasil'
  ) {
    return 'isiJawaban';
  }

  // 8. Rating / Kepuasan
  if (
    clean.includes('rating') || clean.includes('skor') || clean.includes('kepuasan') ||
    clean.includes('bintang') || clean.includes('star') || clean.includes('csat') ||
    clean === 'nilaikepuasan' || clean === 'score' || clean === 'nilai' || clean === 'poin'
  ) {
    return 'rating';
  }

  // 9. Nama Petugas
  if (
    clean.includes('petugas') || clean.includes('agent') || clean.includes('pic') ||
    clean.includes('penjawab') || clean.includes('operator') || clean === 'namacs' ||
    clean === 'namapetugas' || clean === 'namaagent' || clean === 'namaoperator' ||
    clean === 'cs' || clean.includes('konselor') || clean === 'user' || clean === 'username' ||
    clean === 'namauser' || (clean === 'nama' && !clean.includes('peserta')) ||
    clean === 'staff' || clean === 'namastaff'
  ) {
    return 'namaPetugas';
  }

  return clean;
}

/**
 * Normalizes dates coming from Excel (numeric serial, ISO string, DD/MM/YYYY, etc.)
 */
export function normalizeDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);

  // If already Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().slice(0, 10);
    }
  }

  // If Excel numeric serial date (e.g. 45200)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback calculation
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
  }

  const str = String(val).trim();

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const matchDmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (matchDmy) {
    const d = matchDmy[1].padStart(2, '0');
    const m = matchDmy[2].padStart(2, '0');
    const y = matchDmy[3];
    return `${y}-${m}-${d}`;
  }

  // Try standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes rating value to integer 1-5
 */
export function normalizeRating(val: any): number {
  if (val === undefined || val === null || val === '') return 5;
  if (typeof val === 'number') {
    return Math.min(5, Math.max(1, Math.round(val)));
  }
  const cleanStr = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanStr);
  if (!isNaN(parsed) && parsed >= 1) {
    return Math.min(5, Math.max(1, Math.round(parsed)));
  }
  return 5;
}

/**
 * Automatically detects whether CSV uses comma (,), semicolon (;), or tab (\t)
 */
export function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r\n|\r|\n/).slice(0, 5).join('\n');
  const commaCount = (firstLines.match(/,/g) || []).length;
  const semiCount = (firstLines.match(/;/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  return ',';
}

/**
 * Normalizes any category string into the official 3 BPJS categories:
 * 'Informasi' | 'Permintaan' | 'Pengaduan'
 */
export function cleanCategory(val: any): string {
  if (!val) return 'Informasi';
  const str = String(val).trim();
  const lower = str.toLowerCase();

  // 1. Direct exact matches
  if (lower === 'permintaan') return 'Permintaan';
  if (lower === 'informasi') return 'Informasi';
  if (lower === 'pengaduan') return 'Pengaduan';

  // 2. StartsWith match (e.g. Permintaan Pelayanan, Pengaduan Tarif)
  if (lower.startsWith('permintaan') || lower.startsWith('permohonan')) return 'Permintaan';
  if (lower.startsWith('pengaduan') || lower.startsWith('keluhan') || lower.startsWith('komplain')) return 'Pengaduan';
  if (lower.startsWith('informasi') || lower.startsWith('info')) return 'Informasi';

  // 3. Includes keyword match
  if (lower.includes('minta') || lower.includes('request') || lower.includes('permohonan')) return 'Permintaan';
  if (lower.includes('aduan') || lower.includes('keluh') || lower.includes('komplain') || lower.includes('complaint')) return 'Pengaduan';
  if (lower.includes('info')) return 'Informasi';

  if (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return 'Informasi';
}

/**
 * Converts 2D array of rows (first row is headers) into structured Ticket list
 */
export async function rowsToTickets(
  rows: any[][],
  sourceName = 'excel',
  onProgress?: (percent: number, stepText: string) => void
): Promise<{ data: Ticket[]; headers: string[]; rawCount: number }> {
  if (!rows || rows.length < 2) {
    return { data: [], headers: [], rawCount: 0 };
  }

  // Smart Header Row Detection: Find the row among first 6 rows that best matches standard keys
  let headerRowIndex = 0;
  let maxMatchedKeys = 0;
  const standardKeySet = new Set([
    'nomorTiket', 'tanggalTiket', 'kategori', 'pokokMasalah', 'topikMasalah',
    'isiKeluhan', 'isiJawaban', 'rating', 'namaPetugas'
  ]);

  for (let r = 0; r < Math.min(6, rows.length); r++) {
    const candidateHeaders = (rows[r] || []).map((h) => String(h || '').trim());
    const matched = candidateHeaders.map(normalizeColumnKey).filter((k) => standardKeySet.has(k));
    if (matched.length > maxMatchedKeys) {
      maxMatchedKeys = matched.length;
      headerRowIndex = r;
    }
  }

  // If at least 1 key matched, use that row as header; otherwise fallback to row 0
  const rawHeaders = (rows[headerRowIndex] || []).map((h) => String(h || '').trim());
  const mappedKeys = rawHeaders.map(normalizeColumnKey);

  const tickets: Ticket[] = [];
  const startRow = maxMatchedKeys > 0 ? headerRowIndex + 1 : 1;

  for (let r = startRow; r < rows.length; r++) {
    // Yield to UI every 100 rows
    if (r % 100 === 0) {
        onProgress?.(85 + Math.round(((r - startRow) / (rows.length - startRow)) * 10), `Memproses baris ${r}/${rows.length}...`);
        await new Promise(r => setTimeout(r, 0));
    }
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    const item: Partial<Ticket> = {
      sampled: false,
    };

    rawHeaders.forEach((_, idx) => {
      const key = mappedKeys[idx];
      const val = row[idx];

      if (key === 'nomorTiket') {
        item.nomorTiket = String(val || '').trim();
      } else if (key === 'tanggalTiket') {
        item.tanggalTiket = normalizeDate(val);
      } else if (key === 'kategori') {
        item.kategori = cleanCategory(val);
      } else if (key === 'pokokMasalah') {
        item.pokokMasalah = String(val || '').trim();
      } else if (key === 'topikMasalah') {
        item.topikMasalah = String(val || '').trim();
      } else if (key === 'isiKeluhan') {
        item.isiKeluhan = String(val || '').trim();
      } else if (key === 'isiJawaban') {
        item.isiJawaban = String(val || '').trim();
      } else if (key === 'rating') {
        item.rating = normalizeRating(val);
      } else if (key === 'namaPetugas') {
        item.namaPetugas = String(val || '').trim();
      }
    });

    // Fallback heuristic: If headers didn't match isiKeluhan / isiJawaban,
    // find any long text strings in the row
    if (!item.isiKeluhan || !item.isiJawaban) {
      const textCols: string[] = [];
      row.forEach((cell, idx) => {
        const str = String(cell || '').trim();
        const k = mappedKeys[idx];
        if (k !== 'nomorTiket' && k !== 'tanggalTiket' && k !== 'namaPetugas' && str.length > 15) {
          textCols.push(str);
        }
      });
      if (!item.isiKeluhan && textCols.length > 0) item.isiKeluhan = textCols[0];
      if (!item.isiJawaban && textCols.length > 1) item.isiJawaban = textCols[1];
    }

    // Fallback for nomor tiket
    if (!item.nomorTiket) {
      const padNum = String(tickets.length + 1).padStart(4, '0');
      item.nomorTiket = `TKT-${new Date().getFullYear()}-${padNum}`;
    }

    // Accept all rows that have data or default generated nomorTiket
    tickets.push({
      nomorTiket: item.nomorTiket,
      tanggalTiket: item.tanggalTiket || new Date().toISOString().slice(0, 10),
      kategori: cleanCategory(item.kategori || 'Informasi'),
      pokokMasalah: item.pokokMasalah || 'Pelayanan Faskes',
      topikMasalah: item.topikMasalah || 'Layanan Umum',
      isiKeluhan: item.isiKeluhan || 'Pertanyaan/keluhan peserta belum terisi lengkap dalam baris spreadsheet.',
      isiJawaban: item.isiJawaban || 'Petugas telah memberikan respons penyelesaian terkait kendala peserta.',
      rating: item.rating ?? 5,
      namaPetugas: item.namaPetugas || 'Petugas Layanan',
      sampled: false,
    });
  }

  return {
    data: tickets,
    headers: rawHeaders,
    rawCount: rows.length - 1,
  };
}

/**
 * Converts array of key-value objects (e.g. from JSON web service or Apps Script) into structured Ticket list
 */
export function objectsToTickets(
  items: Record<string, any>[]
): { data: Ticket[]; headers: string[]; rawCount: number } {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { data: [], headers: [], rawCount: 0 };
  }

  const headerSet = new Set<string>();
  items.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((k) => headerSet.add(k));
    }
  });
  const rawHeaders = Array.from(headerSet);

  const tickets: Ticket[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const mapped: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      const normKey = normalizeColumnKey(k);
      mapped[normKey] = v;
    }

    const nomorTiket =
      String(mapped.nomorTiket || item.id || item.no || '').trim() ||
      `TKT-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(4, '0')}`;
    const isiKeluhan = String(
      mapped.isiKeluhan || item.keluhan || item.pertanyaan || item.pesan || item.uraian || ''
    ).trim();
    const isiJawaban = String(
      mapped.isiJawaban || item.jawaban || item.respons || item.solusi || item.tanggapan || ''
    ).trim();
    const namaPetugas = String(
      mapped.namaPetugas || item.petugas || item.agent || item.cs || 'Petugas Layanan'
    ).trim();
    const kategori = cleanCategory(mapped.kategori || item.jenis || '');

    tickets.push({
      nomorTiket,
      tanggalTiket: normalizeDate(mapped.tanggalTiket || item.tanggal || item.tgl),
      kategori,
      pokokMasalah: String(mapped.pokokMasalah || item.masalah || 'Pelayanan Faskes').trim(),
      topikMasalah: String(mapped.topikMasalah || item.topik || 'Layanan Umum').trim(),
      isiKeluhan: isiKeluhan || 'Pertanyaan/keluhan peserta tercatat dalam webservice.',
      isiJawaban: isiJawaban || 'Petugas telah memberikan respons penyelesaian kendala peserta.',
      rating: normalizeRating(mapped.rating ?? item.rating ?? item.skor),
      namaPetugas: namaPetugas || 'Petugas Layanan',
      sampled: false,
    });
  }

  return {
    data: tickets,
    headers: rawHeaders,
    rawCount: items.length,
  };
}

/**
 * Parses Google Visualization (GViz) JSON responses (e.g., google.visualization.Query.setResponse)
 */
export async function parseGVizResponse(text: string): Promise<{ data: Ticket[]; headers: string[]; rawCount: number }> {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return { data: [], headers: [], rawCount: 0 };
    }
    const jsonStr = text.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    const table = parsed?.table;
    if (!table) return { data: [], headers: [], rawCount: 0 };

    const cols = (table.cols || []).map((c: any) => c?.label || c?.id || '');
    const rows: any[][] = [cols];
    for (const r of table.rows || []) {
      const rowCells = (r?.c || []).map((cell: any) => cell?.f ?? cell?.v ?? '');
      rows.push(rowCells);
    }
    return await rowsToTickets(rows, 'gviz');
  } catch (e) {
    console.warn('GViz parse error:', e);
    return { data: [], headers: [], rawCount: 0 };
  }
}

/**
 * Robust, universal parser that handles:
 * - JSON responses from Google Apps Script Web Apps / Web Services
 * - Google Visualization API responses (tqx=out:json)
 * - CSV with quotes, escaped quotes, newlines, and auto-detected delimiter
 * - SheetJS XLSX/CSV fallbacks
 */
export async function parseCSV(csvText: string): Promise<{ data: Ticket[]; headers: string[]; rawCount: number }> {
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    return { data: [], headers: [], rawCount: 0 };
  }

  const trimmed = csvText.trim();

  // 1. Check for Google Visualization JSON format
  if (trimmed.includes('google.visualization') || trimmed.startsWith('/*O_o*/')) {
    const gvizRes = await parseGVizResponse(trimmed);
    if (gvizRes.data.length > 0) {
      return gvizRes;
    }
  }

  // 2. Check for JSON format (Common for Google Apps Script Web App Webservice / REST APIs)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsedJson = JSON.parse(trimmed);

      // 2a. Direct array of objects: [{ nomorTiket: '...', ... }]
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        if (typeof parsedJson[0] === 'object' && !Array.isArray(parsedJson[0])) {
          const res = objectsToTickets(parsedJson);
          if (res.data.length > 0) return res;
        } else if (Array.isArray(parsedJson[0])) {
          // 2D Array: [['Nomor Tiket', ...], ['T-01', ...]]
          const res = await rowsToTickets(parsedJson, 'json-2d');
          if (res.data.length > 0) return res;
        }
      }

      // 2b. Object wrapper: { data: [...] } or { records: [...] } or { tickets: [...] }
      if (parsedJson && typeof parsedJson === 'object') {
        const potentialArrays = [
          parsedJson.data,
          parsedJson.records,
          parsedJson.tickets,
          parsedJson.rows,
          parsedJson.values,
          parsedJson.result,
          parsedJson.items,
        ];

        for (const arr of potentialArrays) {
          if (Array.isArray(arr) && arr.length > 0) {
            if (typeof arr[0] === 'object' && !Array.isArray(arr[0])) {
              const res = objectsToTickets(arr);
              if (res.data.length > 0) return res;
            } else if (Array.isArray(arr[0])) {
              const res = await rowsToTickets(arr, 'json-wrapper-2d');
              if (res.data.length > 0) return res;
            }
          }
        }
      }
    } catch {
      // Not valid JSON, continue with CSV parsing
    }
  }

  // 3. Ultra-fast native CSV parser
  try {
    const delimiter = detectDelimiter(trimmed);
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    const len = trimmed.length;

    for (let i = 0; i < len; i++) {
      const char = trimmed[i];
      const nextChar = trimmed[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.length > 0 && currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
    }

    let fastResult: { data: Ticket[]; headers: string[]; rawCount: number } | null = null;
    if (rows.length >= 2) {
      fastResult = await rowsToTickets(rows, 'fast-csv');
    }

    // 4. Also run SheetJS (XLSX) to ensure RFC 4180 multiline cells and complex CSVs are fully captured
    let xlsxResult: { data: Ticket[]; headers: string[]; rawCount: number } | null = null;
    try {
      const workbook = XLSX.read(trimmed, { type: 'string', raw: false });
      const sheetName = workbook.SheetNames[0];
      if (sheetName) {
        const sheet = workbook.Sheets[sheetName];
        const sheetRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (sheetRows && sheetRows.length >= 2) {
          xlsxResult = await rowsToTickets(sheetRows, 'xlsx-csv');
        }
      }
    } catch (xlsxErr) {
      console.warn('XLSX.read CSV error:', xlsxErr);
    }

    // Compare and pick whichever parser captured MORE valid tickets (eliminating any gap)
    const fastCount = fastResult?.data?.length || 0;
    const xlsxCount = xlsxResult?.data?.length || 0;

    if (xlsxCount >= fastCount && xlsxCount > 0 && xlsxResult) {
      return xlsxResult;
    }
    if (fastCount > 0 && fastResult) {
      return fastResult;
    }
  } catch (err) {
    console.warn('CSV parsing exception, attempting SheetJS fallback:', err);
    try {
      const workbook = XLSX.read(trimmed, { type: 'string', raw: false });
      const sheetName = workbook.SheetNames[0];
      if (sheetName) {
        const sheet = workbook.Sheets[sheetName];
        const sheetRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (sheetRows && sheetRows.length >= 2) {
          return await rowsToTickets(sheetRows, 'xlsx-fallback');
        }
      }
    } catch {}
  }

  return { data: [], headers: [], rawCount: 0 };
}

/**
 * Parses an Excel file (.xlsx, .xls) directly from the browser using SheetJS
 */
export async function parseExcelFile(
  file: File,
  onProgress?: (percent: number, stepText: string) => void
): Promise<{ data: Ticket[]; headers: string[]; rawCount: number }> {
  onProgress?.(15, 'Membaca berkas binary Excel...');

  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(35, 'Mengekstrak lembar kerja (Worksheet)...');

  // Small delay so React UI can paint progress smoothly
  await new Promise((r) => setTimeout(r, 60));

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Berkas Excel tidak memiliki sheet/lembar kerja yang valid.');
  }

  onProgress?.(60, `Membaca lembar kerja "${sheetName}"...`);
  await new Promise((r) => setTimeout(r, 60));

  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  onProgress?.(85, 'Memetakan 9 kolom standar & menstandarisasi data tiket...');
  await new Promise((r) => setTimeout(r, 60));

  const result = await rowsToTickets(rows, file.name, (p, t) => onProgress?.(p, t));

  onProgress?.(100, `Berhasil memproses ${result.data.length} tiket.`);
  return result;
}

/**
 * Generates sample Google Sheet / Excel CSV text for template download
 */
export function generateSampleGoogleSheetCSV(): string {
  return [
    'nomor tiket,tanggal tiket,kategori,pokok masalah,topik masalah,isi keluhan,isi jawaban,rating,nama petugas',
    'TKT-2025-0001,2025-01-10,Informasi,Pelayanan Faskes,Syarat Pendaftaran Faskes Tingkat Pertama,Peserta menanyakan persyaratan pendaftaran fasilitas kesehatan tingkat pertama bagi peserta baru mandiri.,Petugas menjelaskan berkas persyaratan meliputi KTP dan KK serta memilih faskes terdekat melalui aplikasi Mobile JKN.,5,DINDA MUTIA HIDAYATI',
    'TKT-2025-0002,2025-01-11,Permintaan,Perubahan Data,Penambahan Anggota Keluarga Bayi Baru Lahir,Peserta mengajukan permohonan pendaftaran bayi baru lahir untuk dimasukkan ke dalam kartu keluarga BPJS Kesehatan.,Petugas memverifikasi surat keterangan lahir dan NIK ibu kandung serta memproses penambahan anggota keluarga.,5,WIDURI PUTRI NINGSIH',
    'TKT-2025-0003,2025-01-12,Pengaduan,Antrean Faskes,Kendala Antrean Poli Spesialis di Rumah Sakit,Peserta mengeluhkan waktu tunggu antrean poli spesialis penyakit dalam yang melebihi 3 jam tanpa kejelasan.,Petugas segera berkoordinasi dengan petugas BPJS Satu di RS terkait untuk percepatan pemanggilan antrean peserta.,4,PUTRI VADIA DHAMAYANTI',
    'TKT-2025-0004,2025-01-13,Informasi,Iuran & Pembayaran,Tata Cara Pembayaran Autodebet Bank,Peserta menanyakan cara mengaktifkan autodebet pembayaran iuran BPJS Kesehatan melalui Bank Mandiri.,Petugas memberikan panduan langkah pendaftaran autodebet melalui menu Mobile JKN dan mesin ATM.,5,DINDA MUTIA HIDAYATI',
    'TKT-2025-0005,2025-01-14,Permintaan,Administrasi Kepesertaan,Perubahan Fasilitas Kesehatan Tingkat Pertama,Peserta mengajukan permohonan pindah Faskes Tingkat Pertama karena telah berpindah domisili tempat tinggal.,Petugas memvalidasi data kepesertaan dan memproses perubahan FKTP yang mulai berlaku per tanggal 1 bulan berikutnya.,5,WIDURI PUTRI NINGSIH',
    'TKT-2025-0006,2025-01-15,Pengaduan,Klaim & Biaya,Tagihan Iur Biaya Tambahan Obat di Rumah Sakit,Peserta rawat inap mengeluhkan diminta membeli obat di luar rumah sakit padahal masuk dalam plafon JKN.,Petugas melakukan konfirmasi ke instalasi farmasi rumah sakit dan memastikan obat dijamin penuh tanpa iur biaya.,4,PUTRI VADIA DHAMAYANTI',
  ].join('\n');
}
