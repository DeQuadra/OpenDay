import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { parseUA, submitEntry, deleteOwnEntry } from "../api.js";

const PRIZES = [
  { img: "/prizes/dimaff.jpeg", emoji: "💎", name: "1000 Diamantes", hype: "Free Fire" },
  { img: "/prizes/gemaclash.jpeg", emoji: "👑", name: "800 Gemas", hype: "Clash Royale" },
  { img: "/prizes/awp.jpeg", emoji: "🔫", name: "AWP | Gelo Compacto", hype: "CS2" },
  { emoji: "📚", name: "+2 pontos", hype: "Na matéria que quiser" },
  { img: "/prizes/robux.jpeg", emoji: "🪙", name: "500 Robux", hype: "Roblox" },
  { emoji: "🎒", name: "Kit Boas-vindas DeQuadra", hype: "Mochila + brindes" },
];

export default function Premio() {
  const [screen, setScreen] = useState("prizes"); // prizes | claim | loading | reveal
  const [chosen, setChosen] = useState(null);
  const [entryId, setEntryId] = useState(null);
  const [capturedAt] = useState(() => new Date());
  const [seconds, setSeconds] = useState(179);
  const timerRef = useRef(null);

  useEffect(() => {
    if (screen !== "prizes") { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setSeconds(s => (s <= 0 ? 179 : s - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (screen === "prizes") {
    return (
      <div className="scam">
        <div className="wrap2">
          <div className="flare"><span className="tag">🎉 SORTEIO EXCLUSIVO OPEN DAY</span></div>
          <h1 className="win">VOCÊ FOI <span className="spark">SELECIONADO!</span></h1>
          <p className="sub">Parabéns! Seu número foi sorteado agora. Escolha <b>1 prêmio</b> e resgate antes que o tempo acabe:</p>
          <div className="timer">{mm}:{ss}<small>o prêmio expira quando o cronômetro zerar</small></div>
          <div className="grid">
            {PRIZES.map((p, i) => (
              <button key={i} className="prize" onClick={() => { setChosen(p); setScreen("claim"); }}>
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
    return <ClaimScreen chosen={chosen}
      onCancel={() => setScreen("prizes")}
      onSubmitted={id => { setEntryId(id); setScreen("reveal"); }}
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

  return <RevealScreen chosen={chosen} entryId={entryId} onRestart={() => { setChosen(null); setEntryId(null); setScreen("prizes"); }} />;
}

function ClaimScreen({ chosen, onSubmitted, setLoading }) {
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [locState, setLocState] = useState("idle"); // idle | loading | done | denied
  const [coords, setCoords] = useState(null);
  const [camState, setCamState] = useState("idle"); // idle | live | captured | denied
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [sending, setSending] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }, []);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCamState("live");
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } }, 0);
    } catch (e) { setCamState("denied"); }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      setPhotoBlob(blob);
      setPhotoUrl(URL.createObjectURL(blob));
      setCamState("captured");
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    }, "image/jpeg", 0.85);
  }

  function askLocation() {
    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) }); setLocState("done"); },
      () => setLocState("denied")
    );
  }

  const canSubmit = consent && name.trim().length > 0 && !sending;

  async function submit() {
    if (!canSubmit) return;
    setSending(true);
    setLoading();
    const u = parseUA();
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("prize_emoji", chosen.emoji);
    fd.append("prize_name", chosen.name);
    fd.append("prize_hype", chosen.hype);
    fd.append("consent", "true");
    fd.append("os", u.os);
    fd.append("browser", u.br);
    fd.append("device", u.device);
    fd.append("language", navigator.language || "");
    fd.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    fd.append("screen", `${screen?.width || window.screen.width}×${window.screen.height}`);
    if (coords) { fd.append("lat", coords.lat); fd.append("lon", coords.lon); fd.append("accuracy", coords.acc); }
    if (photoBlob) fd.append("photo", photoBlob, "foto.jpg");
    try {
      const res = await submitEntry(fd);
      onSubmitted(res.id);
    } catch (e) {
      alert("Não foi possível enviar: " + e.message);
      setSending(false);
    }
  }

  return (
    <div className="scam"><div className="wrap2"><div className="ticket">
      <h2>Quase lá! 🎁</h2>
      <p>Para liberar <span className="chosen">{chosen.name} • {chosen.hype}</span>, preencha os dados abaixo:</p>

      <div className="step2">
        <span className="fieldlabel">Seu nome</span>
        <input className="textinput" type="text" placeholder="Como podemos te chamar?" value={name} onChange={e => setName(e.target.value)} />

        <span className="fieldlabel">Foto (opcional)</span>
        <div className="camwrap">
          {camState === "idle" && <button className="gbtn" onClick={openCamera}>📷 Ativar câmera e tirar foto</button>}
          {camState === "denied" && <p className="hint" style={{ margin: 0 }}>Câmera não permitida. Tudo bem, pode seguir sem foto.</p>}
          {camState === "live" && (<>
            <video ref={videoRef} muted playsInline />
            <button className="gbtn" style={{ marginTop: 8 }} onClick={takePhoto}>📸 Tirar foto agora</button>
          </>)}
          {camState === "captured" && (<>
            <img className="preview" src={photoUrl} alt="Sua foto" />
            <button className="gbtn" style={{ marginTop: 8 }} onClick={() => { setCamState("idle"); setPhotoBlob(null); setPhotoUrl(null); }}>🔁 Tirar outra</button>
          </>)}
        </div>

        <button className={"locbtn" + (locState === "done" ? " done" : "")} onClick={askLocation} disabled={locState === "loading"}>
          {locState === "done" ? "✓ Localização confirmada" : locState === "loading" ? "📍 Localizando..." : "📍 Permitir localização (confirmar presença no evento)"}
        </button>

        <label className="consent">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>Entendo que este formulário é uma atividade da aula de Segurança Digital (ADS) e que meus dados preenchidos acima ficarão salvos para o painel do apresentador. Posso apagá-los a qualquer momento na próxima tela.</span>
        </label>
      </div>

      <button className="redeem" disabled={!canSubmit} onClick={submit}>Resgatar prêmio agora</button>
      <p className="mini">🔒 Veja na próxima tela, com total transparência, tudo o que foi capturado — e apague se quiser.</p>
    </div></div></div>
  );
}

function RevealScreen({ chosen, entryId, onRestart }) {
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
        <p className="intro">Mas tudo o que você acabou de preencher, existe de verdade. Veja o que este formulário "bobo" registrou sobre você:</p>

        {erased ? (
          <div className="safe">✅ Seu registro foi apagado agora mesmo do banco de dados, como prometido.</div>
        ) : (
          <div className="realbox">⚠️ Diferente de um site qualquer, <b>aqui a gente te mostra e te deixa apagar</b>. Em um golpe de verdade, ninguém te conta isso nem te dá essa opção.</div>
        )}

        <h3 className="sec">O que foi registrado neste formulário</h3>
        <div className="datacard">
          <div className="d hot"><div className="k">Nome informado</div><div className="v">(o que você digitou)</div></div>
          <div className="d"><div className="k">Seu aparelho</div><div className="v">{u.device} • {u.os}</div></div>
          <div className="d"><div className="k">Navegador</div><div className="v">{u.br}</div></div>
          <div className="d"><div className="k">Idioma do sistema</div><div className="v">{lang}</div></div>
          <div className="d"><div className="k">Fuso / relógio</div><div className="v">{tz} — {now.toLocaleTimeString("pt-BR")}</div></div>
          <div className="d"><div className="k">Tamanho da tela</div><div className="v">{scr}</div></div>
          <div className="d hot"><div className="k">📍 Localização (se você permitiu)</div><div className="v">Enviada ao servidor com sua permissão</div></div>
          <div className="d hot"><div className="k">📷 Foto (se você tirou)</div><div className="v">Salva no servidor com sua permissão</div></div>
          <div className="d hot"><div className="k">Seu endereço de internet (IP)</div><div className="v">Registrado automaticamente pelo servidor</div></div>
        </div>

        <h3 className="sec">A real</h3>
        <p className="lesson">Nem todo mundo que parece legal é bonzinho. "Prêmio grátis" é a isca mais antiga da internet — quem cai entrega nome, foto, localização e dados do aparelho sem perceber o tanto que isso revela.</p>
        <h3 className="sec">Como não cair numa dessas</h3>
        <ul className="tips">
          <li>Prêmio que você não se inscreveu pra ganhar? Quase sempre é golpe.</li>
          <li>Cronômetro e "últimas unidades" existem pra te apressar e te fazer errar.</li>
          <li>Nunca dê câmera/localização pra um site que você não conhece.</li>
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
