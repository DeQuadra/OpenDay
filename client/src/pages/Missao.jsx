import { useEffect, useRef, useState } from "react";
import { postQuizScore, fetchQuizScores } from "../api.js";

const PENALTY = 10;
const STAGES = [
  { title: "Entender", role: "Analista de requisitos", what: "Descobre o problema de verdade antes de construir qualquer coisa." },
  { title: "Planejar", role: "Product owner", what: "Decide o que entra no sistema com o tempo que existe." },
  { title: "Lógica", role: "Desenvolvedor(a)", what: "Transforma a ideia em passos que o computador segue." },
  { title: "Testar", role: "Analista de testes", what: "Encontra o erro antes que o usuário encontre." },
  { title: "Dados", role: "Analista de dados", what: "Lê os números e ajuda a tomar decisões melhores." },
];

const POOL_ENTENDER = [
  { who: "Dona Marta, dona da cantina", say: "No intervalo a fila fica enorme e muita gente desiste de comprar. E no fim do dia sempre sobra salgado que eu fiz à toa.",
    opts: ["Todo mundo pede e paga na hora, no balcão, e ela não sabe quanto vai vender", "A cantina é pequena demais e precisa de reforma", "Os alunos compram coisas demais no intervalo", "Falta um joguinho para distrair quem está na fila"],
    ok: "O problema não é o tamanho da cantina, é como os pedidos acontecem." },
  { who: "Seu Jorge, dono da academia", say: "Às 18h a academia lota, o pessoal espera aparelho e reclama. Só que de manhã fica quase vazia.",
    opts: ["Os alunos não sabem quais horários estão mais vazios", "Precisa comprar o dobro de aparelhos", "A academia deveria fechar de manhã", "Os alunos treinam devagar demais"],
    ok: "Comprar aparelho resolveria só às 18h. A informação de lotação resolve o dia inteiro." },
  { who: "Rosa, bibliotecária do colégio", say: "Os alunos vêm buscar um livro e metade das vezes ele já está emprestado. Perdem a viagem e acabam desistindo.",
    opts: ["Não dá para saber, antes de ir, se o livro está disponível", "A biblioteca precisa de mais estantes", "Os alunos leem pouco", "A biblioteca abre tarde demais"],
    ok: "O livro existe, o que falta é a informação chegar antes do aluno sair de casa." },
  { who: "Dra. Paula, veterinária", say: "Muitos tutores esquecem a data da vacina e só voltam quando o pet já está atrasado.",
    opts: ["Ninguém avisa o tutor quando a vacina está chegando", "A vacina é cara demais", "A clínica fica longe do centro", "Os pets não gostam de tomar vacina"],
    ok: "As pessoas não são descuidadas, elas só não são lembradas no momento certo." },
  { who: "Professor Leandro, técnico do futsal", say: "Toda semana aviso o horário do treino no grupo, a mensagem se perde e metade do time não aparece.",
    opts: ["O aviso se perde no meio das conversas e ninguém confirma presença", "Os alunos não gostam mais de futsal", "Faltam bolas para treinar", "O treino é cedo demais"],
    ok: "O time quer jogar. O problema é a comunicação, não a vontade." },
  { who: "Seu Toni, dono da pizzaria", say: "Nos pedidos por telefone a gente anota o endereço ou o sabor errado e a pizza volta.",
    opts: ["Os pedidos são anotados à mão, com pressa, e ninguém confere", "A pizza não é gostosa", "O motoboy é lento", "O telefone da pizzaria é antigo"],
    ok: "A pizza e o motoboy estão bem. O erro nasce na hora de registrar o pedido." },
];
const REAL_ENTENDER = "isso se chama levantamento de requisitos. Um sistema lindo que resolve o problema errado não serve para nada.";

const POOL_PLANEJAR = [
  { ctx: "o app da cantina", days: 10, f: [["Pedido antecipado pelo celular", 4, 1], ["Retirada com QR Code", 3, 1], ["Relatório de vendas", 3, 1], ["Chat entre os alunos", 4, 0], ["Avatar 3D personalizado", 5, 0], ["Tema escuro", 2, 0]] },
  { ctx: "o app da academia", days: 9, f: [["Mostrar a lotação ao vivo", 4, 1], ["Reservar horário no aparelho", 3, 1], ["Aviso quando liberar vaga", 2, 1], ["Ranking de quem levanta mais peso", 3, 0], ["Loja de suplementos", 5, 0], ["Playlist da academia", 2, 0]] },
  { ctx: "o sistema da biblioteca", days: 8, f: [["Buscar livro e ver se está disponível", 3, 1], ["Reservar o livro", 3, 1], ["Aviso de prazo de devolução", 2, 1], ["Rede social de leitores", 4, 0], ["Livro em realidade aumentada", 5, 0], ["Escolher cor do fundo", 1, 0]] },
  { ctx: "o sistema da Semana Acadêmica", days: 10, f: [["Inscrição online", 3, 1], ["Presença por QR Code", 4, 1], ["Agenda das palestras", 3, 1], ["Filtro de fotos com o logo", 3, 0], ["Minigame entre palestras", 4, 0], ["Figurinhas para o WhatsApp", 2, 0]] },
  { ctx: "o app da clínica veterinária", days: 7, f: [["Cadastro do pet", 2, 1], ["Lembrete automático de vacina", 3, 1], ["Agendar consulta", 2, 1], ["Perfil do pet com seguidores", 4, 0], ["Tradutor de latidos", 5, 0], ["Tema de patinhas", 1, 0]] },
  { ctx: "o app do time de futsal", days: 8, f: [["Aviso de treino com notificação", 3, 1], ["Confirmar presença com um toque", 2, 1], ["Lista de quem vai", 3, 1], ["Figurinhas dos jogadores", 3, 0], ["Narração dos gols por IA", 5, 0], ["Escolher o uniforme em 3D", 4, 0]] },
];
const REAL_PLANEJAR = "nunca dá tempo de fazer tudo. Escolher o que vem primeiro é uma das decisões mais importantes de um projeto.";

const POOL_LOGICA = [
  { t: "Monte o caminho de um pedido na cantina", s: ["Aluno abre o app", "Escolhe o lanche", "Sistema confere se ainda tem no estoque", "Confirma e gera o QR Code", "Atendente lê o QR Code e entrega"] },
  { t: "Monte o caminho de um login", s: ["Abrir o app", "Digitar e-mail e senha", "Tocar em Entrar", "Sistema confere se a senha está certa", "Mostrar a tela inicial"] },
  { t: "Monte o caminho da presença na Semana Acadêmica", s: ["Participante faz a inscrição", "Sistema gera o QR Code dele", "Participante chega na palestra", "Organizador lê o QR Code", "Sistema registra a presença"] },
  { t: "Monte o caminho de uma mensagem", s: ["Escolher o contato", "Digitar a mensagem", "Tocar em Enviar", "Servidor entrega a mensagem", "Aparece o sinal de entregue"] },
  { t: "Monte o caminho de um sorteio", s: ["Juntar a lista de quem está presente", "Sortear um número aleatório", "Achar quem tem esse número da sorte", "Mostrar o nome na tela", "Marcar o ganhador para não sair de novo"] },
  { t: "Monte o caminho da compra de um ingresso", s: ["Escolher o show", "Escolher a quantidade", "Sistema confere se ainda tem ingresso", "Fazer o pagamento", "Receber o ingresso no e-mail"] },
];
const REAL_LOGICA = "isso é lógica de programação, a base de tudo em ADS. Depois esses passos viram código em linguagens como Python, Java ou JavaScript.";

const POOL_TESTAR = [
  { h: "Seu pedido", l: [["2x Coxinha (R$ 5 cada)", "R$ 10,00"], ["1x Suco natural", "R$ 4,00"], ["Retirada", "10h15"], ["Total", "R$ 12,00"]], bug: 3, ok: "10 + 4 dá R$ 14,00. A cantina perderia dinheiro em todo pedido." },
  { h: "Seu perfil", l: [["Nome", "Ana Souza"], ["Nascimento", "12/03/2008"], ["Idade", "25 anos"], ["Cidade", "Pato Branco"]], bug: 2, ok: "Quem nasceu em 2008 tem 18 anos em 2026. O cálculo da idade está errado." },
  { h: "Cardápio de hoje", l: [["Coxinha", "12 restantes · Comprar"], ["Pão de queijo", "Esgotado"], ["Esfiha", "0 restantes · Comprar"], ["Suco", "8 restantes · Comprar"]], bug: 2, ok: "Com 0 restantes, o botão Comprar não poderia aparecer. Alguém pagaria por uma esfiha que não existe." },
  { h: "Carrinho", l: [["Tênis", "R$ 200,00"], ["Cupom 10%", "− R$ 20,00"], ["Frete", "Grátis"], ["Total", "R$ 220,00"]], bug: 3, ok: "O sistema somou o desconto em vez de subtrair. O certo seria R$ 180,00." },
  { h: "Agenda da Semana", l: [["Abertura", "Seg, 19h00"], ["Palestra de IA", "Ter, 19h00"], ["Oficina de Git", "Qua, 25h00"], ["Encerramento", "Sex, 21h00"]], bug: 2, ok: "25h não existe. Faltou o sistema validar o horário digitado." },
  { h: "Boletim", l: [["Prova 1", "8,0"], ["Prova 2", "6,0"], ["Média", "9,0"], ["Situação", "Aprovado"]], bug: 2, ok: "A média de 8 e 6 é 7,0. Com esse erro, alguém poderia passar sem ter nota." },
];
const REAL_TESTAR = "testar faz parte do trabalho. Um erro pequeno no código, repetido milhares de vezes, vira um problemão.";

const POOL_DADOS = [
  { intro: "Salgados vendidos na sexta. A coxinha acabou às 9h50 e sobraram 25 pães de queijo.", bars: [["Coxinha", 50], ["Pão de queijo", 20], ["Esfiha", 30]], q: "O que a cantina deve fazer na próxima sexta?", opts: ["Fazer mais coxinha e menos pão de queijo", "Fazer mais pão de queijo, já que sobrou", "Parar de vender esfiha", "Manter tudo igual"], ok: "Com os dados, a cantina vende mais e joga menos comida fora." },
  { intro: "Média de alunos na academia por horário.", bars: [["6h", 12], ["9h", 8], ["12h", 15], ["18h", 60], ["21h", 20]], q: "Qual horário o app deve sugerir para quem pode fugir da lotação?", opts: ["9h", "18h", "12h", "21h"], ok: "9h é o horário mais vazio. Mandar gente para lá alivia o pico das 18h." },
  { intro: "Livros emprestados no último mês, por categoria.", bars: [["Romance", 80], ["Mangá", 120], ["Ciências", 30], ["História", 25]], q: "A biblioteca tem verba para livros novos. Onde vale mais investir?", opts: ["Mangá", "História", "Ciências", "Dividir igual entre todos"], ok: "Mangá é o que mais sai. Comprar mais deles atende quem realmente usa a biblioteca." },
  { intro: "Presença em cada palestra da Semana Acadêmica.", bars: [["Inteligência Artificial", 95], ["Mercado de trabalho", 70], ["Banco de dados", 40], ["Segurança digital", 85]], q: "Ano que vem só uma palestra cabe no auditório grande. Qual deve ir para lá?", opts: ["Inteligência Artificial", "Banco de dados", "Mercado de trabalho", "Tanto faz, sorteia"], ok: "IA teve o maior público. Os dados de presença por QR Code ajudam a planejar o próximo evento." },
  { intro: "Reclamações sobre o app no último mês, por motivo.", bars: [["App lento", 60], ["Letra pequena", 15], ["Falta tema escuro", 8], ["Ícone feio", 5]], q: "O time só tem tempo de corrigir uma coisa este mês. Qual primeiro?", opts: ["Deixar o app mais rápido", "Trocar o ícone", "Criar o tema escuro", "Aumentar a letra"], ok: "A lentidão incomoda muito mais gente. Dados mostram onde o esforço vale mais." },
];
const REAL_DADOS = "sistemas guardam dados, e transformar dados em decisões é uma das áreas que mais crescem na tecnologia.";

function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function fmt(ms) { const t = Math.max(0, ms) / 1000; const m = Math.floor(t / 60); const s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ","); }
function pick(name, pool) {
  const key = "md-recent-" + name;
  let last = [];
  try { last = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
  let cands = pool.map((_, i) => i).filter(i => !last.includes(i));
  if (!cands.length) cands = pool.map((_, i) => i);
  const i = cands[Math.floor(Math.random() * cands.length)];
  try { localStorage.setItem(key, JSON.stringify([i, ...last].slice(0, Math.min(3, pool.length - 1)))); } catch (e) {}
  return pool[i];
}

export default function Missao() {
  const [phase, setPhase] = useState("start"); // start | countdown | playing | finished
  const [name, setName] = useState("");
  const [stage, setStage] = useState(0);
  const [errs, setErrs] = useState([0, 0, 0, 0, 0]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [rank, setRank] = useState([]);
  const [myScoreId, setMyScoreId] = useState(null);
  const [penFlash, setPenFlash] = useState(0);
  const [countdownN, setCountdownN] = useState(3);

  const runAtRef = useRef(0);
  const accRef = useRef(0);
  const penRef = useRef(0);
  const tickRef = useRef(null);

  useEffect(() => { fetchQuizScores().then(setRank).catch(() => {}); }, []);

  function elapsed() { return accRef.current + (runAtRef.current ? performance.now() - runAtRef.current : 0) + penRef.current * 1000; }
  function run() { if (!runAtRef.current) runAtRef.current = performance.now(); }
  function pause() { if (runAtRef.current) { accRef.current += performance.now() - runAtRef.current; runAtRef.current = 0; } }
  function penalize(stageIdx) {
    penRef.current += PENALTY;
    setErrs(e => { const n = [...e]; n[stageIdx]++; return n; });
    setPenFlash(f => f + 1);
    setElapsedMs(elapsed());
  }

  function startGame() {
    accRef.current = 0; penRef.current = 0; runAtRef.current = 0;
    setErrs([0, 0, 0, 0, 0]); setStage(0); setElapsedMs(0);
    setPhase("countdown"); setCountdownN(3);
  }

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownN === 0) {
      setPhase("playing"); run();
      tickRef.current = setInterval(() => setElapsedMs(elapsed()), 100);
      return;
    }
    const t = setTimeout(() => setCountdownN(n => n - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdownN]);

  useEffect(() => () => clearInterval(tickRef.current), []);

  async function finish() {
    clearInterval(tickRef.current);
    pause();
    const t = Math.round(elapsed());
    setElapsedMs(t);
    const totalErr = errs.reduce((a, b) => a + b, 0);
    try {
      const res = await postQuizScore(name || "Dev anônimo", t, totalErr);
      setMyScoreId(res.id); setRank(res.rank || []);
    } catch (e) {}
    setPhase("finished");
  }

  function nextStage(okText, real) {
    // mostra feedback por meio do próprio componente de estágio (ver StageView)
    return { okText, real };
  }

  function advance() {
    if (stage < 4) { setStage(s => s + 1); run(); }
    else finish();
  }

  const totalErr = errs.reduce((a, b) => a + b, 0);

  return (
    <div className="wrap">
      <div className="hud">
        <div>
          <div className={"clock" + (phase === "playing" ? "" : " paused")}>
            {fmt(elapsedMs)}
            {penFlash > 0 && phase === "playing" && <span className="pen" key={penFlash}>+{PENALTY}s</span>}
          </div>
          <div className="hudinfo">{phase === "playing" ? `Erro = +${PENALTY} segundos` : "Erro = +10 segundos"}</div>
        </div>
        <div className="board">
          {STAGES.map((st, i) => (
            <div key={i} className={"note " + ((stage > i || phase === "finished") ? "ok" : (stage === i && phase === "playing" ? "now" : ""))}>
              {i + 1}. {st.title}
            </div>
          ))}
        </div>
      </div>

      <main className="card">
        {phase === "start" && (
          <div className="split">
            <div>
              <h1>Missão Dev: contra o relógio</h1>
              <p className="lead">5 desafios de quem trabalha com sistemas. Quanto mais rápido, mais alto no ranking. Cada erro custa +{PENALTY} segundos.</p>
              <p>Os desafios mudam a cada partida, então não adianta decorar a do amigo.</p>
              <label style={{ display: "block", fontWeight: 600, margin: "14px 0 6px" }}>Seu nome ou apelido</label>
              <input type="text" maxLength={18} placeholder="Ex.: Ana" autoComplete="off" value={name}
                onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") startGame(); }} />
              <br /><button className="go" onClick={startGame}>Valendo!</button>
            </div>
            <div>
              <h2 style={{ fontSize: 22 }}>Mais rápidos do dia</h2>
              <RankList rank={rank} meId={null} limit={8} />
            </div>
          </div>
        )}

        {phase === "countdown" && (
          <div className="countdown"><span>{countdownN === 0 ? "Já!" : countdownN}</span></div>
        )}

        {phase === "playing" && (
          <StageView stage={stage} onError={() => penalize(stage)} onSuccess={advance} />
        )}

        {phase === "finished" && (
          <FinishView name={name} elapsedMs={elapsedMs} errs={errs} totalErr={totalErr} rank={rank} myScoreId={myScoreId}
            onAgain={() => { setPhase("start"); setName(""); }} />
        )}
      </main>
    </div>
  );
}

function RankList({ rank, meId, limit }) {
  if (!rank.length) return <ol className="rank"><li className="empty">Ninguém jogou ainda. Seja o primeiro!</li></ol>;
  const medal = ["🥇", "🥈", "🥉"];
  const top = rank.slice(0, limit);
  const pos = rank.findIndex(r => r.id === meId);
  return (
    <ol className="rank">
      {top.map((r, i) => (
        <li key={r.id} className={r.id === meId ? "me" : ""}><span>{medal[i] || (i + 1) + "."} {r.name}</span><span>{fmt(r.total_ms)}</span></li>
      ))}
      {pos >= limit && <li className="me"><span>{pos + 1}. {rank[pos].name}</span><span>{fmt(rank[pos].total_ms)}</span></li>}
    </ol>
  );
}

function StageView({ stage, onError, onSuccess }) {
  const [feedback, setFeedback] = useState(null); // {okText, real}
  const [q] = useState(() => {
    if (stage === 0) return pick("e", POOL_ENTENDER);
    if (stage === 1) return pick("p", POOL_PLANEJAR);
    if (stage === 2) return pick("l", POOL_LOGICA);
    if (stage === 3) return pick("t", POOL_TESTAR);
    return pick("d", POOL_DADOS);
  });

  if (feedback) {
    return (
      <>
        <div className="step">Desafio {stage + 1} de 5: {STAGES[stage].title}</div>
        <div className="feedback"><strong>{feedback.okText}</strong><span className="real">Na vida real: {feedback.real}</span></div>
        <button className="go" onClick={onSuccess}>{stage < 4 ? "Próximo desafio" : "Ver meu tempo"}</button>
      </>
    );
  }

  const head = <div className="step">Desafio {stage + 1} de 5: {STAGES[stage].title}</div>;

  if (stage === 0) {
    return (
      <>
        {head}
        <h2>Qual é o problema de verdade?</h2>
        <div className="bubble"><b>{q.who}</b>“{q.say}”</div>
        <ChoiceBox opts={q.opts} correct={q.opts[0]} onWrong={onError} onRight={() => setFeedback({ okText: q.ok, real: REAL_ENTENDER })} />
      </>
    );
  }
  if (stage === 1) return <PlanStage head={head} q={q} onError={onError} onDone={ok => setFeedback({ okText: ok, real: REAL_PLANEJAR })} />;
  if (stage === 2) return <LogicStage head={head} q={q} onError={onError} onDone={() => setFeedback({ okText: "O algoritmo rodou do início ao fim sem travar!", real: REAL_LOGICA })} />;
  if (stage === 3) return <BugStage head={head} q={q} onError={onError} onDone={() => setFeedback({ okText: "Achou! " + q.ok, real: REAL_TESTAR })} />;
  return (
    <>
      {head}
      <h2>O que os dados dizem?</h2>
      <p>{q.intro}</p>
      <DataChart bars={q.bars} />
      <p><strong>{q.q}</strong></p>
      <ChoiceBox opts={q.opts} correct={q.opts[0]} onWrong={onError} onRight={() => setFeedback({ okText: q.ok, real: REAL_DADOS })} />
    </>
  );
}

function ChoiceBox({ opts, correct, onWrong, onRight }) {
  const [shuffled] = useState(() => shuffle(opts));
  const [state, setState] = useState({}); // idx -> 'right'|'wrong'
  const [locked, setLocked] = useState(false);
  return (
    <div className="opts">
      {shuffled.map((o, i) => (
        <button key={i} className={"opt " + (state[i] || "")} disabled={locked && state[i] !== "wrong" ? true : state[i] === "wrong"}
          onClick={() => {
            if (o === correct) { setState(s => ({ ...s, [i]: "right" })); setLocked(true); onRight(); }
            else { setState(s => ({ ...s, [i]: "wrong" })); onWrong(); }
          }}>{o}</button>
      ))}
    </div>
  );
}

function PlanStage({ head, q, onError, onDone }) {
  const [feats, setFeats] = useState(() => shuffle(q.f.map(([n, c, e]) => ({ n, c, e, on: false }))));
  const [hint, setHint] = useState("");
  const used = feats.reduce((a, f) => a + (f.on ? f.c : 0), 0);

  function toggle(i) {
    const f = feats[i];
    if (!f.on && used + f.c > q.days) { setHint("Não cabe no prazo. Tire alguma coisa antes."); return; }
    setHint("");
    setFeats(fs => fs.map((x, j) => j === i ? { ...x, on: !x.on } : x));
  }
  function deliver() {
    const extras = feats.filter(f => f.on && !f.e);
    const missing = feats.filter(f => !f.on && f.e);
    if (!extras.length && !missing.length) { onDone("Plano perfeito! Só o essencial, dentro do prazo."); return; }
    onError();
    setHint(extras.length ? "As marcadas em rosa são legais, mas não resolvem o problema agora." : "Ainda falta algo essencial para o sistema funcionar.");
  }

  return (
    <>
      {head}
      <h2>O que entra na primeira versão?</h2>
      <p>Você tem <strong>{q.days} dias</strong> para entregar {q.ctx}. Escolha só o que resolve o problema e use os {q.days} dias certinho.</p>
      <div className="budget">Dias usados <div className="meter"><i style={{ width: (used / q.days * 100) + "%" }} /></div><span>{used}/{q.days}</span></div>
      <div className="chips">
        {feats.map((f, i) => (
          <button key={i} className="chip" aria-pressed={f.on} onClick={() => toggle(i)}>
            {f.n}<span>{f.c} {f.c > 1 ? "dias" : "dia"}</span>
          </button>
        ))}
      </div>
      <button className="go" onClick={deliver}>Fechar o plano</button>
      <div className="hint">{hint}</div>
    </>
  );
}

function LogicStage({ head, q, onError, onDone }) {
  const [pool] = useState(() => shuffle(q.s));
  const [seq, setSeq] = useState([]);
  const [hint, setHint] = useState("");
  const [badIdx, setBadIdx] = useState(-1);
  const [allRight, setAllRight] = useState(false);

  function runAlgo() {
    if (seq.length < q.s.length) { setHint("Coloque todos os blocos antes de rodar."); return; }
    const bad = seq.findIndex((x, i) => x !== q.s[i]);
    if (bad === -1) { setAllRight(true); onDone(); return; }
    onError(); setBadIdx(bad);
    setHint("Travou no passo " + (bad + 1) + ". Ajuste e rode de novo.");
  }

  return (
    <>
      {head}
      <h2>{q.t}</h2>
      <p>O computador só faz o que mandam, na ordem exata. Toque nos blocos na ordem certa. Errou? Toque no passo para tirar.</p>
      <div className="slots">
        {q.s.map((_, i) => (
          <button key={i} className={"slot " + (seq[i] ? "filled" : "") + (allRight ? " right" : "") + (badIdx === i ? " wrong" : "")}
            disabled={!seq[i]} onClick={() => { setSeq(s => s.filter((_, j) => j !== i)); setBadIdx(-1); }}>
            {seq[i] || "…"}
          </button>
        ))}
      </div>
      <div className="pool">
        {pool.filter(x => !seq.includes(x)).map((x, i) => (
          <button key={i} className="block" onClick={() => { setSeq(s => [...s, x]); setHint(""); setBadIdx(-1); }}>{x}</button>
        ))}
      </div>
      <button className="go" onClick={runAlgo}>Rodar o algoritmo</button>
      <div className="hint">{hint}</div>
    </>
  );
}

function BugStage({ head, q, onError, onDone }) {
  const [picked, setPicked] = useState(-1);
  return (
    <>
      {head}
      <h2>Caça ao bug</h2>
      <p>Antes de liberar o app, teste esta tela. Toque na linha que está errada.</p>
      <div className="phone">
        <div className="bar" />
        <h3>{q.h}</h3>
        {q.l.map((x, i) => (
          <button key={i} className={"line " + (picked === i ? (i === q.bug ? "right" : "wrong") : "")} disabled={picked === i && i !== q.bug}
            onClick={() => { setPicked(i); if (i === q.bug) onDone(); else onError(); }}>
            <span>{x[0]}</span><span>{x[1]}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function DataChart({ bars }) {
  const max = Math.max(...bars.map(b => b[1]));
  return (
    <div className="chart">
      {bars.map((b, i) => (
        <div key={i} className="row"><span>{b[0]}</span><div className="bars"><div style={{ width: (b[1] / max * 100) + "%" }}>{b[1]}</div></div></div>
      ))}
    </div>
  );
}

function FinishView({ name, elapsedMs, errs, totalErr, rank, myScoreId, onAgain }) {
  const pos = rank.findIndex(r => r.id === myScoreId) + 1;
  const medalText = pos === 1 ? "🥇 Novo recorde do dia!" : pos === 2 ? "🥈 2º lugar!" : pos === 3 ? "🥉 3º lugar!" : pos > 0 ? `Você está em ${pos}º lugar` : "";
  const stars = STAGES.filter((_, i) => errs[i] === 0);
  return (
    <>
      <div className="split">
        <div>
          <div className="step">Missão concluída, {name || "Dev anônimo"}</div>
          <div className="big">{fmt(elapsedMs)}</div>
          <div className="medal">{medalText}</div>
          <p className="note-small">{totalErr ? `${totalErr} erro${totalErr > 1 ? "s" : ""} = +${totalErr * PENALTY}s de penalidade` : "Zero erros, nenhuma penalidade!"}</p>
          <p>Você passou pelas 5 etapas de um projeto real de software. {stars.length ? `Acertou de primeira em: ${stars.map(s => s.title.toLowerCase()).join(", ")}.` : ""}</p>
        </div>
        <div>
          <h2 style={{ fontSize: 22 }}>Mais rápidos do dia</h2>
          <RankList rank={rank} meId={myScoreId} limit={8} />
        </div>
      </div>
      <p style={{ marginTop: 18 }}><strong>Em ADS, cada etapa que você jogou é uma profissão:</strong></p>
      <div className="roles">
        {STAGES.map((s, i) => (
          <div key={i} className={"role " + (errs[i] === 0 ? "star" : "")}><b>{s.role}</b>{s.what}</div>
        ))}
      </div>
      <p>O sistema da Semana Acadêmica que está rodando aqui no notebook passou por essas mesmas etapas.</p>
      <button className="go" onClick={onAgain}>Próximo jogador</button>
    </>
  );
}
