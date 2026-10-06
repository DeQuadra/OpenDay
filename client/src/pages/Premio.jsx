import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { parseUA, submitEntry, deleteOwnEntry } from "../api.js";
import { supabase, supabaseConfigured, googleProfileFromUser } from "../supabaseClient.js";

const PRIZES = [
  { img: "/prizes/dimaff.jpeg", emoji: "💎", name: "1000 Diamantes", hype: "Free Fire" },
  { img: "/prizes/gemaclash.jpeg", emoji: "👑", name: "800 Gemas", hype: "Clash Royale" },
  { img: "/prizes/awp.jpeg", emoji: "🔫", name: "AWP | Gelo Compacto", hype: "CS2" },
  { emoji: "📚", name: "+2 pontos", hype: "Na matéria que quiser" },
  { img: "/prizes/robux.jpeg", emoji: "🪙", name: "500 Robux", hype: "Roblox" },
  { emoji: "🎒", name: "Kit Boas-vindas DeQuadra", hype: "Mochila + brindes" },
];

const STORAGE_KEY = "premio_chosen_prize";

export default function Premio() {
  const [screen, setScreen] = useState("prizes"); // prizes | claim | loading | reveal
  const [chosen, setChosen] = useState(null);
  const [entryId, setEntryId] = useState(null);
  const [profile, setProfile] = useState(null); // {name,email,avatarUrl} vindos do Google
  const [session, setSession] = useState(null);
  const [seconds, setSeconds] = useState(179);
  const timerRef = useRef(null);

  // Restaura o prêmio escolhido e a sessão do Google ao voltar do redirect
  // do login (uma navegação de página inteira apaga o estado do React).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setChosen(JSON.parse(saved));
    } catch (e) {}

    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) setProfile(googleProfileFromUser(session.user));
  }, [session]);

  // Se voltou do login do Google e já tinha escolhido um prêmio antes de ir, pula direto pro resgate
  useEffect(() => {
    if (chosen && (session || !supabaseConfigured) && screen === "prizes") setScreen("claim");
  }, [chosen, session, screen]);

  useEffect(() => {
    if (screen !== "prizes") { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setSeconds(s => (s <= 0 ? 179 : s - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  function pickPrize(p) {
    setChosen(p);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) {}
    setScreen("claim");
  }

  if (screen === "prizes") {
    return (
      <div className="scam">
        <div className="hero">
          <div className="wrap2">
            <div className="flare"><span className="tag">🎉 SORTEIO EXCLUSIVO OPEN DAY</span></div>
            <h1 className="win">VOCÊ FOI <span className="spark">SELECIONADO!</span></h1>
            <p className="sub">Parabéns! Seu número foi sorteado agora. Escolha <b>1 prêmio</b> e resgate antes que o tempo acabe:</p>
            <div className="timer">{mm}:{ss}<small>o prêmio expira quando o cronômetro zerar</small></div>
          </div>
        </div>
        <div className="wrap2">
          <div className="grid">
            {PRIZES.map((p, i) => (
              <button key={i} className="prize" onClick={() => pickPrize(p)}>
                <div className="imgwrap">
                  {p.img ? <img src={p.img} alt={p.name} /> : <div className="emoji">{p.emoji}</div>}
                </div>
                <div className="name">{p.name}</div>
                <div className="hype">{p.hype}</div>
              </button>
            ))}
          </div>
          <p className="stock">🔥 Mais de 4.300 pessoas resgataram hoje • restam poucas unidades</p>
        </div>
      </div>
    );
  }

  if (screen === "claim") {
    return <ClaimScreen chosen={chosen} session={session} profile={profile}
      onSubmitted={id => { setEntryId(id); try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {} setScreen("reveal"); }}
      setLoading={() => setScreen("loading")} />;
  }

  if (screen === "loading") {
    return (
      <div className="scam"><div className="wrap2"><div className="loading">
        <div className="spinner" />
        <p style={{ fontWeight: 800, fontSize: 20 }}>Processando seu prêmio...</p>
        <p style={{ opacity: .85 }}>Verificando seus dados</p>
      </div></div></div>
    );
  }

  return <RevealScreen chosen={chosen} entryId={entryId} profile={profile}
    onRestart={async () => {
      setChosen(null); setEntryId(null);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
      if (supabaseConfigured) await supabase.auth.signOut();
      setScreen("prizes");
    }} />;
}

function ClaimScreen({ chosen, session, profile, onSubmitted, setLoading }) {
  const [locState, setLocState] = useState("idle"); // idle | loading | done | denied
  const [coords, setCoords] = useState(null);
  const [sending, setSending] = useState(false);
  const [devName, setDevName] = useState(""); // só usado no fallback sem Supabase configurado

  async function loginGoogle() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/premio`,
          // Sem pedir esses escopos explicitamente, o Google às vezes não
          // devolve nome/foto -- só o e-mail.
          scopes: "openid email profile",
          // "consent" força o Google a reexibir a tela de permissão e conceder
          // os escopos novos, mesmo que o aluno já tenha logado antes sem eles.
          queryParams: { prompt: "consent", access_type: "offline" },
        },
      });
    } catch (e) { alert("Não foi possível abrir o login do Google: " + e.message); }
  }

  function askLocation() {
    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) }); setLocState("done"); },
      () => setLocState("denied")
    );
  }

  const loggedIn = supabaseConfigured ? Boolean(session) : devName.trim().length > 0;

  // Assim que o login (Google ou o nome de teste local) estiver pronto,
  // pede a localização automaticamente, sem esperar o aluno clicar em nada.
  useEffect(() => {
    if (loggedIn && locState === "idle") askLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const effectiveName = supabaseConfigured ? profile?.name : devName.trim();
  const canSubmit = loggedIn && locState === "done" && !sending;

  async function submit() {
    if (!canSubmit) return;
    setSending(true);
    setLoading();
    const u = parseUA();
    const payload = {
      name: effectiveName || "",
      email: supabaseConfigured ? (profile?.email || "") : "",
      prize_emoji: chosen.emoji,
      prize_name: chosen.name,
      prize_hype: chosen.hype,
      consent: true,
      os: u.os,
      browser: u.br,
      device: u.device,
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      screen: `${window.screen.width}×${window.screen.height}`,
      photo_url: supabaseConfigured ? (profile?.avatarUrl || null) : null,
    };
    if (coords) { payload.lat = coords.lat; payload.lon = coords.lon; payload.accuracy = coords.acc; }
    try {
      const res = await submitEntry(payload);
      onSubmitted(res.id);
    } catch (e) {
      alert("Não foi possível enviar: " + e.message);
      setSending(false);
    }
  }

  return (
    <div className="scam"><div className="wrap2"><div className="ticket">
      <h2>Quase lá! 🎁</h2>
      <p>Para liberar <span className="chosen">{chosen.name} • {chosen.hype}</span>, faça os passos abaixo:</p>

      <div className="step2">
        <span className="fieldlabel">Obrigatório para liberar</span>

        {supabaseConfigured ? (
          session ? (
            <div className="gbtn done" style={{ cursor: "default" }}>
              {profile?.avatarUrl && <img src={profile.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%" }} />}
              ✓ Conectado como {profile?.name || profile?.email}
            </div>
          ) : (
            <button className="gbtn" onClick={loginGoogle}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16z"/><path fill="#FBBC05" d="M10.5 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.9-6.1C1 16.9 0 20.3 0 24s1 7.1 2.6 10.1l7.9-5.8z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.3-4.6 2.1-8.1 2.1-6.3 0-11.6-3.7-13.5-9l-7.9 5.8C6.5 42.6 14.6 48 24 48z"/></svg>
              Entrar com Google para resgatar
            </button>
          )
        ) : (
          <>
            <input className="textinput" type="text" placeholder="(modo teste local sem Supabase) seu nome"
              value={devName} onChange={e => setDevName(e.target.value)} />
            <p className="hint" style={{ marginTop: 4 }}>Login com Google não está configurado neste ambiente (falta VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) — usando um campo de nome só para teste local.</p>
          </>
        )}

        <button className={"locbtn " + locState} onClick={askLocation} disabled={locState === "loading" || locState === "done"}>
          <span className="locicon">{locState === "done" ? "✓" : locState === "denied" ? "⚠️" : "📍"}</span>
          <span className="loctext">
            <span className="loctitle">
              {locState === "done" ? "Localização confirmada"
                : locState === "loading" ? "Localizando..."
                : locState === "denied" ? "Localização não permitida"
                : "Permitir localização"}
            </span>
            <span className="locsub">
              {locState === "done" ? "Presença no evento confirmada"
                : locState === "loading" ? "Aguardando resposta do navegador"
                : locState === "denied" ? "Toque para tentar de novo"
                : "Confirma sua presença no evento"}
            </span>
          </span>
        </button>
      </div>

      <button className="redeem" disabled={!canSubmit} onClick={submit}>Resgatar prêmio agora</button>
    </div></div></div>
  );
}

function RevealScreen({ chosen, entryId, profile, onRestart }) {
  const [erased, setErased] = useState(false);
  const u = parseUA();
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "—";
  const lang = navigator.language || "—";
  const scr = `${window.screen.width}×${window.screen.height}`;

  async function eraseMine() {
    if (!entryId) return;
    try { await deleteOwnEntry(entryId); setErased(true); } catch (e) {}
  }

  return (
    <div className="reveal"><div className="wrap">
      <div className="alert">
        <div className="bang">🚨 Esse prêmio não existe.</div>
        <p className="intro">Mas a sua conta Google que você acabou de conectar, existe de verdade. Veja o que este formulário "bobo" conseguiu de você em segundos:</p>

        {erased ? (
          <div className="safe">✅ Seu registro foi apagado agora mesmo do banco de dados, como prometido.</div>
        ) : (
          <div className="realbox">⚠️ Diferente de um site qualquer, <b>aqui a gente te mostra e te deixa apagar</b>. Em um golpe de verdade, ninguém te conta isso nem te dá essa opção.</div>
        )}

        <h3 className="sec">O que foi capturado de verdade</h3>
        {profile && (
          <div className="d hot gface" style={{ marginBottom: 10 }}>
            {profile.avatarUrl
              ? <img className="pic" src={profile.avatarUrl} alt="" />
              : <div className="pic">🙂</div>}
            <div>
              <div className="v">{profile.name || "(sem nome)"}</div>
              <div className="k" style={{ marginTop: 2 }}>{profile.email}</div>
            </div>
          </div>
        )}
        <div className="datacard">
          <div className="d"><div className="k">Seu aparelho</div><div className="v">{u.device} • {u.os}</div></div>
          <div className="d"><div className="k">Navegador</div><div className="v">{u.br}</div></div>
          <div className="d"><div className="k">Idioma do sistema</div><div className="v">{lang}</div></div>
          <div className="d"><div className="k">Fuso / relógio</div><div className="v">{tz} — {now.toLocaleTimeString("pt-BR")}</div></div>
          <div className="d"><div className="k">Tamanho da tela</div><div className="v">{scr}</div></div>
          <div className="d hot"><div className="k">📍 Localização</div><div className="v">Enviada ao servidor com sua permissão</div></div>
          <div className="d hot"><div className="k">Seu endereço de internet (IP)</div><div className="v">Registrado automaticamente pelo servidor</div></div>
        </div>

        <h3 className="sec">A real</h3>
        <p className="lesson">Nem todo mundo que parece legal é bonzinho. "Prêmio grátis" é a isca mais antiga da internet — e um botão "Entrar com Google" igual a esse é usado de verdade em golpes de phishing. A única diferença entre um golpe de verdade e o nosso: no golpe de verdade, o botão te leva pra uma <b>cópia falsa</b> da tela do Google, não pro accounts.google.com de verdade — e eles guardam sua senha digitada lá.</p>
        <h3 className="sec">Como não cair numa dessas</h3>
        <ul className="tips">
          <li>Prêmio que você não se inscreveu pra ganhar? Quase sempre é golpe.</li>
          <li>Cronômetro e "últimas unidades" existem pra te apressar e te fazer errar.</li>
          <li>Antes de clicar em "Entrar com Google", olhe a barra de endereço: tem que ser <b>accounts.google.com</b>, nunca outro domínio.</li>
          <li>Desconfie de QR Code espalhado por aí — você não sabe pra onde ele leva.</li>
          <li>Um site sério sempre diz pra que serve cada dado e deixa você apagar.</li>
        </ul>
        <div className="ads">Isto é <b>Segurança Digital</b>, uma das áreas de <b>Análise e Desenvolvimento de Sistemas</b>. Em ADS a gente aprende os dois lados: como construir sistemas <b>e</b> como proteger as pessoas que usam eles.</div>

        {!erased && entryId && <button className="erase" onClick={eraseMine}>🗑️ Apagar meus dados agora</button>}
        <button className="ghost" onClick={onRestart}>Começar de novo (próximo colega)</button>
        <Link className="adminlink" to="/admin">· painel do apresentador ·</Link>
      </div>
    </div></div>
  );
}
