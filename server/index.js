require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "openday2026";

// Respeita X-Forwarded-For caso o site rode atrás de um proxy/túnel (ex: ngrok, nginx)
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function getIp(req) {
  // req.ip já respeita X-Forwarded-For com trust proxy ligado
  let ip = req.ip || req.socket.remoteAddress || "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1 (localhost)";
  return ip;
}

/* ===================== AUTENTICAÇÃO DO PAINEL (apresentador) ===================== */
const sessions = new Set();
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: "não autorizado" });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "senha incorreta" });
  const token = crypto.randomUUID();
  sessions.add(token);
  res.json({ token });
});

/* ===================== CAPTURA DO FORMULÁRIO (tela do presente) =====================
   Nome/e-mail/foto vêm do login real com o Google (Supabase Auth, feito no navegador);
   aqui só recebemos o perfil já lido, mais o que só o servidor pode saber (IP). */
app.post("/api/entries", (req, res) => {
  try {
    const b = req.body || {};
    if (!b.consent) {
      return res.status(400).json({ error: "consentimento é obrigatório" });
    }
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO entries (
        id, created_at, name, email, prize_emoji, prize_name, prize_hype,
        photo_path, lat, lon, accuracy, ip, user_agent,
        os, browser, device, language, timezone, screen, consent
      ) VALUES (@id,@created_at,@name,@email,@prize_emoji,@prize_name,@prize_hype,
        @photo_path,@lat,@lon,@accuracy,@ip,@user_agent,
        @os,@browser,@device,@language,@timezone,@screen,1)
    `).run({
      id,
      created_at: Date.now(),
      name: (b.name || "").slice(0, 120),
      email: (b.email || "").slice(0, 160),
      prize_emoji: b.prize_emoji || null,
      prize_name: b.prize_name || null,
      prize_hype: b.prize_hype || null,
      photo_path: b.photo_url || null,
      lat: b.lat != null ? Number(b.lat) : null,
      lon: b.lon != null ? Number(b.lon) : null,
      accuracy: b.accuracy != null ? Number(b.accuracy) : null,
      ip: getIp(req),
      user_agent: req.headers["user-agent"] || "",
      os: b.os || null,
      browser: b.browser || null,
      device: b.device || null,
      language: b.language || null,
      timezone: b.timezone || null,
      screen: b.screen || null,
    });

    res.json({ id, ip: getIp(req) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "falha ao salvar" });
  }
});

// O próprio participante pode apagar o registro dele na hora (mostrado na tela de revelação)
app.delete("/api/entries/:id/self", (req, res) => {
  const row = db.prepare("SELECT id FROM entries WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "não encontrado" });
  db.prepare("DELETE FROM entries WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

/* ===================== PAINEL DO APRESENTADOR ===================== */
app.get("/api/entries", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM entries ORDER BY created_at DESC LIMIT 1000").all();
  res.json(rows);
});

app.delete("/api/entries/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM entries WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.delete("/api/entries", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM entries").run();
  res.json({ ok: true });
});

/* ===================== RANKING DA MISSÃO DEV (quiz) ===================== */
app.post("/api/quiz-scores", (req, res) => {
  const { name, total_ms, errors } = req.body || {};
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO quiz_scores (id, created_at, name, total_ms, errors) VALUES (?,?,?,?,?)")
    .run(id, Date.now(), String(name || "Dev anônimo").slice(0, 40), Number(total_ms) || 0, Number(errors) || 0);
  const rank = db.prepare("SELECT id,name,total_ms FROM quiz_scores ORDER BY total_ms ASC LIMIT 200").all();
  res.json({ id, rank });
});

app.get("/api/quiz-scores", (req, res) => {
  const rank = db.prepare("SELECT id,name,total_ms FROM quiz_scores ORDER BY total_ms ASC LIMIT 200").all();
  res.json(rank);
});

/* ===================== SERVIR O FRONTEND (build do Vite) EM PRODUÇÃO ===================== */
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  const nets = require("os").networkInterfaces();
  console.log(`\n✅ Servidor rodando na porta ${PORT}`);
  console.log(`   Local:  http://localhost:${PORT}`);
  Object.values(nets).flat().forEach(n => {
    if (n.family === "IPv4" && !n.internal) console.log(`   Rede:   http://${n.address}:${PORT}`);
  });
  console.log(`\nPainel do apresentador: /admin  (senha padrão: "${ADMIN_PASSWORD}" — troque via ADMIN_PASSWORD no .env)\n`);
});
