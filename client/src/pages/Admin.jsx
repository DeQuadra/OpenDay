import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminLogin, adminFetchEntries, adminDeleteEntry, adminWipeAll } from "../api.js";

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin-token") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(t) {
    setLoading(true);
    try { setRows(await adminFetchEntries(t)); }
    catch (e) { sessionStorage.removeItem("admin-token"); setToken(""); }
    setLoading(false);
  }

  useEffect(() => { if (token) load(token); }, [token]);

  async function login() {
    setError("");
    try {
      const { token: t } = await adminLogin(password);
      sessionStorage.setItem("admin-token", t);
      setToken(t);
    } catch (e) { setError("Senha incorreta."); }
  }

  if (!token) {
    return (
      <div className="wrap">
        <div className="card loginbox">
          <h2>Painel do apresentador</h2>
          <p style={{ color: "var(--soft)" }}>Esta área contém nome, foto, localização e IP dos participantes. Acesso restrito.</p>
          <input type="password" placeholder="Senha do painel" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") login(); }} />
          <br /><button className="go" style={{ marginTop: 12 }} onClick={login}>Entrar</button>
          {error && <p className="hint">{error}</p>}
          <Link className="adminlink" to="/missao">← voltar</Link>
        </div>
      </div>
    );
  }

  const total = rows.length;
  const locN = rows.filter(r => r.lat != null).length;
  const photoN = rows.filter(r => r.photo_path).length;
  const pct = n => total ? Math.round(n / total * 100) : 0;
  const pc = {};
  rows.forEach(r => { pc[r.prize_name] = (pc[r.prize_name] || 0) + 1; });
  const top = Object.entries(pc).sort((a, b) => b[1] - a[1])[0];

  async function del(id) {
    await adminDeleteEntry(token, id);
    load(token);
  }
  async function wipe() {
    if (!confirm("Apagar TODOS os registros (incluindo fotos)? Essa ação não pode ser desfeita.")) return;
    await adminWipeAll(token);
    load(token);
  }

  return (
    <div className="wrap admin">
      <h1>Painel do apresentador</h1>
      <p style={{ color: "var(--soft)", margin: "0 0 6px" }}>
        Quem "caiu" na pegadinha do sorteio. Use para mostrar ao grupo quantos entregaram dados reais sem perceber.
      </p>
      <div className="stats">
        <div className="stat"><div className="n">{total}</div><div className="l">pessoas resgataram</div></div>
        <div className="stat"><div className="n">{pct(locN)}%</div><div className="l">permitiram localização</div></div>
        <div className="stat"><div className="n">{pct(photoN)}%</div><div className="l">tiraram foto</div></div>
        <div className="stat"><div className="n">{top ? top[1] : 0}</div><div className="l">prêmio mais clicado{top ? `: ${top[0]}` : ""}</div></div>
      </div>

      <table>
        <thead><tr><th>Hora</th><th>Nome</th><th>Foto</th><th>Prêmio</th><th>Aparelho</th><th>Local.</th><th>IP</th><th></th></tr></thead>
        <tbody>
          {total ? rows.map(r => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleTimeString("pt-BR")}</td>
              <td>{r.name || "—"}</td>
              <td>{r.photo_path ? <img className="thumb" src={r.photo_path} alt="" /> : "—"}</td>
              <td>{r.prize_name}</td>
              <td>{r.device} • {r.os} • {r.browser}</td>
              <td className={r.lat != null ? "yes" : "no"}>
                {r.lat != null
                  ? <a className="mapl" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${r.lat},${r.lon}`}>ver mapa</a>
                  : "negou"}
              </td>
              <td>{r.ip}</td>
              <td><button className="del" onClick={() => del(r.id)}>apagar</button></td>
            </tr>
          )) : (
            <tr><td colSpan={8} style={{ color: "var(--soft)", padding: 16 }}>Ainda ninguém resgatou.</td></tr>
          )}
        </tbody>
      </table>

      <button className="wipe" onClick={wipe}>Apagar todos os registros</button>
      <br />
      <Link className="adminlink" to="/premio">← abrir a tela do prêmio</Link>
      {loading && <p style={{ color: "var(--soft)" }}>Atualizando…</p>}
    </div>
  );
}
