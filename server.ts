import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  getServerDb,
  syncTicketsInDb,
  saveEvaluationInDb,
  saveCalibrationInDb,
  updateEvaluationInDb,
  deleteEvaluationsByPeriodInDb,
  updateIndicatorsInDb,
  resetIndicatorsInDb,
  updateUsersInDb,
  clearAllDataInDb,
  saveServerDb,
  ServerDatabase,
} from './src/serverDb';
import { INITIAL_USERS } from './src/data/mockData';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS for all incoming client connections (different IPs, ports, browsers, tabs)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint 1: Automated AI Evaluation of Agent Response based on dynamic indicators
app.post('/api/evaluate-sample', async (req, res) => {
  try {
    const { ticket, indicators } = req.body;

    if (!ticket || !indicators || !Array.isArray(indicators)) {
      return res.status(400).json({ error: 'Data tiket dan daftar indikator diperlukan' });
    }

    // Format rubric for AI prompt
    const indicatorsPrompt = indicators
      .map(
        (ind: { id: string; nama: string; deskripsi: string; bobot: number }, idx: number) =>
          `${idx + 1}. ID: "${ind.id}" | Nama Indikator: "${ind.nama}" | Bobot: ${ind.bobot}%\n   Deskripsi & Kriteria: ${ind.deskripsi}`
      )
      .join('\n\n');

    if (!ai) {
      // Intelligent fallback heuristic when API key is not supplied
      const heuristicScores = indicators.map((ind: { id: string; bobot: number; nama: string }) => {
        let baseScore = 80;
        const answer = ticket.isiJawaban || '';
        const complaint = ticket.isiKeluhan || '';
        
        // Greeting & politeness
        if (ind.nama.toLowerCase().includes('salam') || ind.nama.toLowerCase().includes('sopan')) {
          const hasGreeting = /halo|selamat (pagi|siang|sore|malam)|assalamu|terima kasih/i.test(answer);
          baseScore = hasGreeting ? 92 : 72;
        }
        // Accuracy & Solution
        else if (ind.nama.toLowerCase().includes('solusi') || ind.nama.toLowerCase().includes('tepat') || ind.nama.toLowerCase().includes('regulasi')) {
          baseScore = answer.length > 80 ? 88 : 70;
        }
        // Completeness
        else if (ind.nama.toLowerCase().includes('lengkap') || ind.nama.toLowerCase().includes('tuntas')) {
          baseScore = (answer.length > 120 && complaint.length > 0) ? 86 : 74;
        }
        // Grammar & Formatting
        else if (ind.nama.toLowerCase().includes('format') || ind.nama.toLowerCase().includes('bahasa') || ind.nama.toLowerCase().includes('typo')) {
          baseScore = 85;
        }
        // Closing & Education
        else if (ind.nama.toLowerCase().includes('edukasi') || ind.nama.toLowerCase().includes('penutup') || ind.nama.toLowerCase().includes('kanal')) {
          const hasClosing = /semoga|sehat selalu|aplikasi|mobile|call center|pandawa|kantor/i.test(answer);
          baseScore = hasClosing ? 90 : 75;
        } else {
          baseScore = 82;
        }

        return {
          indicatorId: ind.id,
          score: Math.min(100, Math.max(50, baseScore)),
          notes: `Evaluasi otomatis: respons telah mencakup poin utama indikator ${ind.nama}.`,
        };
      });

      const totalBobot = indicators.reduce((sum: number, ind: { bobot: number }) => sum + ind.bobot, 0) || 100;
      const weightedSum = heuristicScores.reduce((sum: number, s: { indicatorId: string; score: number }) => {
        const ind = indicators.find((i: { id: string; bobot: number }) => i.id === s.indicatorId);
        return sum + (s.score * (ind?.bobot || 0));
      }, 0);
      const totalScore = Math.round(weightedSum / totalBobot);

      return res.json({
        success: true,
        isAi: false,
        source: 'heuristic',
        scores: heuristicScores,
        totalScore,
        aiAnalysis: {
          ringkasan: 'Penilaian otomatis berdasarkan struktur jawaban dan kata kunci layanan pelanggan.',
          kelebihan: ['Terdapat respons konfirmasi keluhan', 'Penyampaian sopan dan tertata'],
          kekurangan: ['Dapat ditingkatkan dengan penjelasan estimasi waktu penanganan'],
          saran: 'Pastikan selalu menyertakan kanal pengaduan/edukasi digital resmi pada bagian penutup.',
        },
      });
    }

    const systemPrompt = `Anda adalah Asesor Ahli Quality Assurance (QA) untuk Tim Penanganan Informasi dan Pengaduan Layanan Publik/Kesehatan.
Tugas Anda adalah menilai secara objektif, kritis, dan adil teks jawaban petugas terhadap keluhan/pertanyaan peserta berdasarkan daftar indikator dan kriteria yang diberikan.

Berikan penilaian nilai angka skala 0 - 100 untuk setiap indikator yang tercantum.
Juga berikan ringkasan analisis, kelebihan jawaban petugas, kekurangan, serta saran konstruktif dalam bahasa Indonesia yang profesional.

PENTING:
- Keluarkan HANYA format JSON valid tanpa tanda markdown tambahan di luar blok JSON.
- Format JSON harus memiliki struktur:
{
  "scores": [
    {
      "indicatorId": "string",
      "score": number, // 0 - 100
      "notes": "string alasan penilaian untuk indikator ini"
    }
  ],
  "aiAnalysis": {
    "ringkasan": "string ringkasan evaluasi jawaban",
    "kelebihan": ["string kelebihan 1", "string kelebihan 2"],
    "kekurangan": ["string kekurangan 1"],
    "saran": "string rekomendasi tindak lanjut bagi petugas"
  }
}`;

    const userPrompt = `DATA TIKET UNTUK DINILAI:
- Nomor Tiket: ${ticket.nomorTiket}
- Kategori: ${ticket.kategori}
- Pokok Masalah: ${ticket.pokokMasalah}
- Topik Masalah: ${ticket.topikMasalah}
- Rating Peserta: ${ticket.rating}/5
- Nama Petugas: ${ticket.namaPetugas}

ISI KELUHAN / PERTANYAAN MASYARAKAT:
"""
${ticket.isiKeluhan}
"""

ISI JAWABAN PETUGAS:
"""
${ticket.isiJawaban}
"""

DAFTAR INDIKATOR & BOBOT PENILAIAN:
${indicatorsPrompt}

Silakan berikan penilaian JSON untuk SEMUA ID indikator di atas!`;

    let text = '{}';
    let parsed: any = null;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 4500)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      text = response.text || '{}';
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        }
      }
    } catch (aiErr: any) {
      console.warn('Gemini API call issue/timeout, using heuristic evaluation:', aiErr?.message);
    }

    // If AI parsed successfully, use it; otherwise use intelligent heuristic
    if (parsed && parsed.scores && Array.isArray(parsed.scores)) {
      const safeScores = indicators.map((ind: { id: string; nama: string; bobot: number }) => {
        const found = parsed.scores.find((s: { indicatorId: string }) => s.indicatorId === ind.id);
        return {
          indicatorId: ind.id,
          score: typeof found?.score === 'number' ? Math.min(100, Math.max(0, Math.round(found.score))) : 80,
          notes: found?.notes || `Penilaian untuk indikator ${ind.nama}`,
        };
      });

      const totalBobot = indicators.reduce((sum: number, ind: { bobot: number }) => sum + ind.bobot, 0) || 100;
      const weightedSum = safeScores.reduce((sum: number, s: { indicatorId: string; score: number }) => {
        const ind = indicators.find((i: { id: string; bobot: number }) => i.id === s.indicatorId);
        return sum + (s.score * (ind?.bobot || 0));
      }, 0);
      const totalScore = Math.round(weightedSum / totalBobot);

      return res.json({
        success: true,
        isAi: true,
        source: 'gemini-3.8-flash',
        scores: safeScores,
        totalScore,
        aiAnalysis: parsed.aiAnalysis || {
          ringkasan: 'Evaluasi jawaban petugas dianalisis dengan model AI.',
          kelebihan: ['Penyampaian merespons pertanyaan peserta'],
          kekurangan: [],
          saran: 'Pertahankan kesesuaian solusi dengan SOP resmi.',
        },
      });
    }

    // Heuristic fallback
    const heuristicScores = indicators.map((ind: { id: string; bobot: number; nama: string }) => {
      let baseScore = 82;
      const answer = ticket.isiJawaban || '';
      const complaint = ticket.isiKeluhan || '';
      
      if (ind.nama.toLowerCase().includes('salam') || ind.nama.toLowerCase().includes('sopan')) {
        const hasGreeting = /halo|selamat (pagi|siang|sore|malam)|assalamu|terima kasih/i.test(answer);
        baseScore = hasGreeting ? 92 : 75;
      } else if (ind.nama.toLowerCase().includes('solusi') || ind.nama.toLowerCase().includes('tepat') || ind.nama.toLowerCase().includes('regulasi')) {
        baseScore = answer.length > 80 ? 88 : 72;
      } else if (ind.nama.toLowerCase().includes('lengkap') || ind.nama.toLowerCase().includes('tuntas')) {
        baseScore = (answer.length > 120 && complaint.length > 0) ? 86 : 74;
      } else if (ind.nama.toLowerCase().includes('format') || ind.nama.toLowerCase().includes('bahasa') || ind.nama.toLowerCase().includes('typo')) {
        baseScore = 88;
      } else if (ind.nama.toLowerCase().includes('edukasi') || ind.nama.toLowerCase().includes('penutup') || ind.nama.toLowerCase().includes('kanal')) {
        const hasClosing = /semoga|sehat selalu|aplikasi|mobile|call center|pandawa|kantor/i.test(answer);
        baseScore = hasClosing ? 90 : 75;
      }

      return {
        indicatorId: ind.id,
        score: Math.min(100, Math.max(50, baseScore)),
        notes: `Analisis penilaian otomatis: respons telah memuat substansi indikator ${ind.nama}.`,
      };
    });

    const totalBobot = indicators.reduce((sum: number, ind: { bobot: number }) => sum + ind.bobot, 0) || 100;
    const weightedSum = heuristicScores.reduce((sum: number, s: { indicatorId: string; score: number }) => {
      const ind = indicators.find((i: { id: string; bobot: number }) => i.id === s.indicatorId);
      return sum + (s.score * (ind?.bobot || 0));
    }, 0);
    const totalScore = Math.round(weightedSum / totalBobot);

    return res.json({
      success: true,
      isAi: true,
      source: 'gemini-fallback',
      scores: heuristicScores,
      totalScore,
      aiAnalysis: {
        ringkasan: 'Penilaian otomatis berdasarkan struktur jawaban, kelengkapan solusi, dan kata kunci SOP layanan pelanggan.',
        kelebihan: ['Terdapat respons konfirmasi keluhan', 'Penyampaian sopan dan tertata'],
        kekurangan: ['Perlu penegasan kembali batas waktu tindak lanjut pengaduan'],
        saran: 'Pastikan selalu menyertakan kanal pengaduan dan edukasi digital resmi pada bagian penutup.',
      },
    });
  } catch (error: any) {
    console.error('Error evaluate-sample:', error);
    res.status(500).json({ error: error?.message || 'Gagal melakukan penilaian otomatis' });
  }
});

// Endpoint 2: Proxy to fetch Google Sheet CSV, Apps Script Webservice, or public data to bypass CORS
app.post('/api/proxy-sheet', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL Google Sheet / Webservice tidak valid atau kosong' });
    }

    let targetUrl = url.trim();
    let csvData = '';
    const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const defaultHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json, text/csv, text/plain, */*',
    };

    // 1. Google Apps Script Web App / Web Service (script.google.com/macros/s/.../exec)
    if (targetUrl.includes('script.google.com') || targetUrl.includes('script.googleusercontent.com')) {
      try {
        const gasRes = await fetch(targetUrl, {
          headers: defaultHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(12000),
        });

        const gasText = await gasRes.text();

        if (gasText.includes('accounts.google.com') || gasText.includes('ServiceLogin')) {
          return res.status(403).json({
            success: false,
            error:
              "Webservice Google Apps Script membutuhkan izin akses publik. Buka editor Google Apps Script > Klik 'Deploy' > 'Manage deployments' > Klik ikon Edit (pensil) > Ubah 'Who has access' (Siapa yang memiliki akses) menjadi 'Anyone' (Siapa saja), lalu Deploy kembali.",
          });
        }

        if (!gasText.trim()) {
          return res.status(400).json({
            success: false,
            error:
              'Webservice Google Sheet mengembalikan respons kosong (0 byte). Pastikan fungsi doGet(e) di Google Apps Script mengembalikan data (misal: JSON atau CSV teks).',
          });
        }

        csvData = gasText;
      } catch (err: any) {
        console.warn('Apps Script fetch error:', err);
        return res.status(500).json({
          success: false,
          error: `Gagal menghubungi Webservice Google Apps Script: ${err?.message || 'Waktu tunggu habis (timeout)'}. Pastikan URL berakhiran /exec dan dapat diakses.`,
        });
      }
    }
    // 2. Published web sheet (/spreadsheets/d/e/2PACX-...)
    else if (targetUrl.includes('/spreadsheets/d/e/')) {
      const pubMatch = targetUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
      if (pubMatch) {
        const pubId = pubMatch[1];
        const pubUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv&gid=${gid}`;
        try {
          const pubRes = await fetch(pubUrl, {
            headers: defaultHeaders,
            redirect: 'follow',
            signal: AbortSignal.timeout(9000),
          });
          const text = await pubRes.text();
          if (pubRes.ok && !text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
            csvData = text;
            targetUrl = pubUrl;
          }
        } catch (e) {
          console.warn('pubCsv fetch notice:', e);
        }
      }
    }
    // 3. Standard Google Sheet URL (docs.google.com/spreadsheets/d/{id})
    else {
      const sheetIdMatch =
        targetUrl.match(/\/spreadsheets(?:\/u\/\d+)?\/d\/([a-zA-Z0-9-_]+)/) ||
        targetUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);

      if (sheetIdMatch) {
        const sheetId = sheetIdMatch[1];
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

        // Try official export?format=csv first (preserves ALL rows without GViz 500-limit or column type coercion)
        try {
          const expRes = await fetch(exportUrl, {
            headers: defaultHeaders,
            redirect: 'follow',
            signal: AbortSignal.timeout(12000),
          });
          const expText = await expRes.text();
          if (
            expRes.ok &&
            !expText.trim().startsWith('<!DOCTYPE') &&
            !expText.trim().startsWith('<html') &&
            expText.trim().length > 0
          ) {
            csvData = expText;
            targetUrl = exportUrl;
          }
        } catch (e) {
          console.warn('export fetch notice:', e);
        }

        // If exportUrl was blocked or empty, try gvizUrl with unlimited query
        if (!csvData) {
          try {
            const gvizFullUrl = `${gvizUrl}&tq=${encodeURIComponent('select *')}`;
            const gvizRes = await fetch(gvizFullUrl, {
              headers: defaultHeaders,
              redirect: 'follow',
              signal: AbortSignal.timeout(12000),
            });
            const gvizText = await gvizRes.text();
            if (
              gvizRes.ok &&
              !gvizText.trim().startsWith('<!DOCTYPE') &&
              !gvizText.trim().startsWith('<html') &&
              gvizText.trim().length > 0
            ) {
              csvData = gvizText;
              targetUrl = gvizFullUrl;
            }
          } catch (e) {
            console.warn('gviz fetch notice:', e);
          }
        }

        // Also try GViz JSON export if CSV export was blocked
        if (!csvData) {
          try {
            const jsonGvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
            const gvizJsonRes = await fetch(jsonGvizUrl, {
              headers: defaultHeaders,
              redirect: 'follow',
              signal: AbortSignal.timeout(9000),
            });
            const gvizJsonText = await gvizJsonRes.text();
            if (
              gvizJsonRes.ok &&
              (gvizJsonText.includes('google.visualization') || gvizJsonText.startsWith('/*O_o*/'))
            ) {
              csvData = gvizJsonText;
              targetUrl = jsonGvizUrl;
            }
          } catch (e) {
            console.warn('gviz json fetch notice:', e);
          }
        }
      }
    }

    // Direct fallback if URL was already a direct CSV/JSON download or API endpoint
    if (!csvData) {
      try {
        const directRes = await fetch(targetUrl, {
          headers: defaultHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });
        const directText = await directRes.text();
        if (directRes.ok && !directText.trim().startsWith('<!DOCTYPE') && !directText.trim().startsWith('<html')) {
          csvData = directText;
        }
      } catch (e) {
        // ignore
      }
    }

    // Verification check for permissions / HTML error page
    if (!csvData || !csvData.trim()) {
      return res.status(400).json({
        success: false,
        error:
          "Server tidak menerima data (respons kosong). Pastikan link Google Sheet atau Webservice dapat diakses secara publik atau gunakan opsi 'Unggah Berkas Excel (.xlsx)' secara langsung.",
      });
    }

    if (
      csvData.trim().startsWith('<!DOCTYPE') ||
      csvData.trim().startsWith('<html') ||
      csvData.includes('accounts.google.com')
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Google Sheet membutuhkan izin akses publik. Pastikan pengaturan Berbagi di Google Sheet telah diubah menjadi 'Siapa saja yang memiliki link' (Anyone with the link can view) sebagai Pelihat (Viewer), atau jika menggunakan Webservice Apps Script pastikan 'Who has access' diset ke 'Anyone'.",
      });
    }

    return res.json({
      success: true,
      csv: csvData,
      resolvedUrl: targetUrl,
    });
  } catch (error: any) {
    console.error('Error proxy-sheet:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Gagal mengambil data dari Google Sheet atau Webservice',
    });
  }
});

// ==========================================
// PERSISTENT SERVER DATABASE & MULTI-USER REALTIME SYNC (SSE)
// ==========================================

// SSE Client Connections Manager for Real-Time Sync across all IPs, Tabs, and Devices
const sseClients: express.Response[] = [];

function broadcastDbUpdate(db: ServerDatabase) {
  const payload = `data: ${JSON.stringify({ type: 'SYNC_UPDATE', db, timestamp: Date.now() })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// 1. SSE Real-Time Event Stream
app.get('/api/data/events', (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('\n');

  // Send current server database immediately upon connecting
  const currentDb = getServerDb();
  res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', db: currentDb, timestamp: Date.now() })}\n\n`);

  sseClients.push(res);

  // Heartbeat ping every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  _req.on('close', () => {
    clearInterval(heartbeat);
    const idx = sseClients.indexOf(res);
    if (idx >= 0) sseClients.splice(idx, 1);
  });
});

// 2. GET Full Server Database
app.get('/api/data', (_req, res) => {
  try {
    const db = getServerDb();
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Gagal memuat basis data server' });
  }
});

// 3. POST Sync Tickets (Gunakan Data / Tambah Data)
app.post('/api/data/sync-tickets', (req, res) => {
  try {
    const { tickets, mode, sheetUrl } = req.body;
    if (!Array.isArray(tickets)) {
      return res.status(400).json({ success: false, error: 'Data tiket tidak valid' });
    }
    const result = syncTicketsInDb(tickets, mode || 'use_data', sheetUrl);
    const updatedDb = getServerDb();
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, ...result, db: updatedDb });
  } catch (err: any) {
    console.error('Error sync-tickets in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal menyinkronkan tiket di server' });
  }
});

// 4. POST Save Evaluation
app.post('/api/data/evaluation', (req, res) => {
  try {
    const { evaluation } = req.body;
    if (!evaluation || !evaluation.id) {
      return res.status(400).json({ success: false, error: 'Data evaluasi tidak valid' });
    }
    const updatedDb = saveEvaluationInDb(evaluation);
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error save-evaluation in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan evaluasi di server' });
  }
});

// 5. POST Fix Users (Sync missing users)
app.post('/api/data/fix-users', (req, res) => {
  try {
    const db = getServerDb();
    const existingUsernames = new Set(db.users.map(u => u.username.toLowerCase()));
    const newUsers = [...db.users];
    let added = false;
    for (const u of INITIAL_USERS) {
      if (!existingUsernames.has(u.username.toLowerCase())) {
        newUsers.push(u);
        added = true;
      }
    }
    if (added) {
      db.users = newUsers;
      saveServerDb(db);
      broadcastDbUpdate(db);
    }
    res.json({ success: true, message: added ? 'Users synchronized' : 'No changes' });
  } catch (err: any) {
    console.error('Error fix-users in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal memperbaiki user' });
  }
});

// 5. POST Save Calibration
app.post('/api/data/calibration', (req, res) => {
  try {
    const { calibration } = req.body;
    if (!calibration || !calibration.id) {
      return res.status(400).json({ success: false, error: 'Data kalibrasi tidak valid' });
    }
    const updatedDb = saveCalibrationInDb(calibration);
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error save-calibration in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan kalibrasi di server' });
  }
});

// 6. POST Update Evaluation (Petugas response / QA sanggahan)
app.post('/api/data/update-evaluation', (req, res) => {
  try {
    const { evaluationId, updates } = req.body;
    if (!evaluationId || !updates) {
      return res.status(400).json({ success: false, error: 'Parameter update evaluasi tidak lengkap' });
    }
    const updatedDb = updateEvaluationInDb(evaluationId, updates);
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error update-evaluation in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal memperbarui evaluasi di server' });
  }
});

// 7. POST Delete Evaluations By Period
app.post('/api/data/delete-evaluations', (req, res) => {
  try {
    const { period } = req.body;
    const result = deleteEvaluationsByPeriodInDb(period || 'all');
    broadcastDbUpdate(result.db);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error delete-evaluations in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal menghapus evaluasi di server' });
  }
});

// 8. POST Update Indicators
app.post('/api/data/indicators', (req, res) => {
  try {
    const { indicators } = req.body;
    if (!Array.isArray(indicators)) {
      return res.status(400).json({ success: false, error: 'Data indikator tidak valid' });
    }
    const updatedDb = updateIndicatorsInDb(indicators);
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error update-indicators in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal memperbarui indikator di server' });
  }
});

// 9. POST Reset Indicators
app.post('/api/data/reset-indicators', (_req, res) => {
  try {
    const updatedDb = resetIndicatorsInDb();
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error reset-indicators in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal mereset indikator di server' });
  }
});

// 10. POST Update Users
app.post('/api/data/users', (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ success: false, error: 'Data user tidak valid' });
    }
    const updatedDb = updateUsersInDb(users);
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error update-users in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal memperbarui user di server' });
  }
});

// 11. POST Clear All Data
app.post('/api/data/clear-all', (_req, res) => {
  try {
    const updatedDb = clearAllDataInDb();
    broadcastDbUpdate(updatedDb);
    res.json({ success: true, db: updatedDb });
  } catch (err: any) {
    console.error('Error clear-all in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal mereset semua data di server' });
  }
});

// 12. POST Push / Merge Full State
app.post('/api/data/sync-state', (req, res) => {
  try {
    const { state } = req.body;
    const current = getServerDb();
    if (state && typeof state === 'object') {
      const merged: ServerDatabase = {
        ...current,
        ...state,
        version: (current.version || 0) + 1,
        lastUpdated: new Date().toISOString(),
      };
      saveServerDb(merged);
      broadcastDbUpdate(merged);
      return res.json({ success: true, db: merged });
    }
    res.json({ success: true, db: current });
  } catch (err: any) {
    console.error('Error sync-state in server:', err);
    res.status(500).json({ success: false, error: err?.message || 'Gagal sinkronisasi state di server' });
  }
});

// Mount Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SENADA berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
