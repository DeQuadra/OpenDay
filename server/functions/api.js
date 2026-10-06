require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const serverless = require("serverless-http");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "openday2026";
// Segredo usado para assinar o token do painel (funções são stateless,
// então não dá pra guardar sessão em memória como no server/index.js local).
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || ADMIN_PASSWORD + "-fallback-secret";
const PHOTOS_BUCKET = "photos";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn("⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados. Configure nas variáveis de ambiente do Netlify.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const app = express();
const router = express.Router();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) return cb(new Error("Formato de imagem inválido"));
    cb(null, true);
  },
});

function getIp(req) {
  let ip = req.headers["x-nf-client-connection-ip"] || req.ip || req.socket?.remoteAddress || "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip || "desconhecido";
}

/* ===================== TOKEN STATELESS DO PAINEL ===================== */
function signToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 6; // 6 horas
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(String(exp)).digest("hex");
  return Buffer.from(`${exp}.${sig}`).toString("base64url");
}
function verifyToken(token) {
  try {
    const [expStr, sig] = Buffer.from(token, "base64url").toString().split(".");
    const exp = Number(expStr);
    if (!exp || exp < Date.now()) return false;
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(expStr).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch (e) { return false; }
}
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token && verifyToken(token)) return next();
  return res.status(401).json({ error: "não autorizado" });
}

router.post("/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "senha incorreta" });
  res.json({ token: signToken() });
});

/* ===================== CAPTURA DO FORMULÁRIO (tela do presente) ===================== */
router.post("/entries", upload.single("photo"), async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.consent || b.consent === "false") {
      return res.status(400).json({ error: "consentimento é obrigatório" });
    }

    let photo_url = null;
    if (req.file) {
      const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
      photo_url = data.publicUrl;
    }

    const row = {
      name: (b.name || "").slice(0, 120),
      prize_emoji: b.prize_emoji || null,
      prize_name: b.prize_name || null,
      prize_hype: b.prize_hype || null,
      photo_url,
      lat: b.lat ? Number(b.lat) : null,
      lon: b.lon ? Number(b.lon) : null,
      accuracy: b.accuracy ? Number(b.accuracy) : null,
      ip: getIp(req),
      user_agent: req.headers["user-agent"] || "",
      os: b.os || null,
      browser: b.browser || null,
      device: b.device || null,
      language: b.language || null,
      timezone: b.timezone || null,
      screen: b.screen || null,
      consent: true,
    };

    const { data, error } = await supabase.from("entries").insert(row).select("id").single();
    if (error) throw error;
    res.json({ id: data.id, ip: row.ip });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "falha ao salvar" });
  }
});

async function deletePhotoIfAny(photo_url) {
  if (!photo_url) return;
  const filename = photo_url.split("/").pop();
  await supabase.storage.from(PHOTOS_BUCKET).remove([filename]);
}

// O próprio participante pode apagar o registro dele na hora (tela de revelação)
router.delete("/entries/:id/self", async (req, res) => {
  const { data: row } = await supabase.from("entries").select("photo_url").eq("id", req.params.id).single();
  if (!row) return res.status(404).json({ error: "não encontrado" });
  await deletePhotoIfAny(row.photo_url);
  await supabase.from("entries").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

/* ===================== PAINEL DO APRESENTADOR ===================== */
router.get("/entries", requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from("entries").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) return res.status(500).json({ error: "falha ao buscar" });
  // mantém o mesmo formato (created_at em ms) usado pelo painel React
  res.json(data.map(r => ({
    ...r,
    created_at: new Date(r.created_at).getTime(),
    photo_path: r.photo_url, // compatibilidade com o front (mesma chave usada antes)
  })));
});

router.delete("/entries/:id", requireAdmin, async (req, res) => {
  const { data: row } = await supabase.from("entries").select("photo_url").eq("id", req.params.id).single();
  if (row) await deletePhotoIfAny(row.photo_url);
  await supabase.from("entries").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

router.delete("/entries", requireAdmin, async (req, res) => {
  const { data: rows } = await supabase.from("entries").select("photo_url");
  const files = (rows || []).map(r => r.photo_url).filter(Boolean).map(u => u.split("/").pop());
  if (files.length) await supabase.storage.from(PHOTOS_BUCKET).remove(files);
  await supabase.from("entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  res.json({ ok: true });
});

/* ===================== RANKING DA MISSÃO DEV (quiz) ===================== */
router.post("/quiz-scores", async (req, res) => {
  const { name, total_ms, errors } = req.body || {};
  const { data: inserted, error } = await supabase
    .from("quiz_scores")
    .insert({ name: String(name || "Dev anônimo").slice(0, 40), total_ms: Number(total_ms) || 0, errors: Number(errors) || 0 })
    .select("id")
    .single();
  if (error) return res.status(500).json({ error: "falha ao salvar" });
  const { data: rank } = await supabase.from("quiz_scores").select("id,name,total_ms").order("total_ms", { ascending: true }).limit(200);
  res.json({ id: inserted.id, rank: rank || [] });
});

router.get("/quiz-scores", async (req, res) => {
  const { data: rank } = await supabase.from("quiz_scores").select("id,name,total_ms").order("total_ms", { ascending: true }).limit(200);
  res.json(rank || []);
});

// O redirect do Netlify (netlify.toml) reescreve /api/* para
// /.netlify/functions/api/:splat. Montamos o router nos dois prefixos
// possíveis para funcionar tanto atrás do redirect em produção quanto
// numa invocação direta da função (ex: durante testes locais).
app.use("/api", router);
app.use("/.netlify/functions/api", router);

module.exports.handler = serverless(app, { binary: ["multipart/form-data"] });
