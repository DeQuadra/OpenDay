# Open Day DeQuadra — Missão Dev + Sorteio

Site com duas telas para a atividade de Segurança Digital do curso de ADS:

- **`/missao`** — quiz "Missão Dev: contra o relógio" (5 desafios + ranking + QR Code no final).
- **`/premio`** — o "sorteio" (golpe simulado): o aluno escolhe um prêmio, preenche nome, foto e
  localização, resgata — e na tela seguinte o site **revela o que capturou de verdade**, ensinando
  sobre phishing.
- **`/admin`** — painel do apresentador (protegido por senha): mostra todos os resgates em tempo
  real, com foto, nome, localização (link pro mapa) e IP de cada participante, e permite apagar
  registros.

## ⚠️ Antes de usar com pessoas reais

Esta atividade captura dados pessoais de verdade (nome, foto, geolocalização, IP). Para isso ser
ético:

- O formulário em `/premio` tem uma **caixa de consentimento obrigatória** explicando que é uma
  atividade da aula e que os dados vão para o painel do apresentador.
- A tela de revelação dá ao participante um botão **"Apagar meus dados agora"**, imediato.
- O painel `/admin` fica atrás de senha (troque `ADMIN_PASSWORD` no `.env` antes do evento).
- Avise verbalmente o grupo, antes de começar, que é uma simulação educativa e que os dados podem
  ser apagados a qualquer momento (pelo próprio aluno ou pedindo ao apresentador).
- Ao final do evento, use o botão **"Apagar todos os registros"** no painel para não manter fotos e
  localizações de alunos guardadas depois da atividade.

## Como rodar

```bash
npm run install:all   # instala backend (raiz) e frontend (client/)
cp .env.example .env  # e troque a ADMIN_PASSWORD
npm run dev            # backend na porta 3000 + frontend (Vite) na porta 5173
```

Abra **http://localhost:5173/missao** no navegador do computador.

### Para os alunos acessarem pelo celular (mesma rede Wi-Fi)

O terminal do backend mostra o IP da sua máquina na rede, algo como:

```
Rede:   http://192.168.0.15:3000
```

Mas em desenvolvimento o site React roda na porta 5173 (Vite), não na 3000. Para os celulares
acessarem exatamente a mesma coisa que você vê no computador, rode em modo produção (um único
servidor, uma única porta):

```bash
npm run build   # compila o site React para client/dist
npm start        # sobe o servidor único (API + site) na porta 3000
```

Agora é só abrir no celular: `http://<IP-da-sua-máquina>:3000/missao` — o QR Code gerado no final
da Missão Dev já aponta para `/premio` nesse mesmo endereço.

### Para acessar de **outra rede** (não só o Wi-Fi do evento)

Rodar `npm start` só deixa o site visível para quem está na **mesma rede local**. Se alunos vão
escanear o QR Code usando dados móveis (rede diferente da do notebook), é preciso expor o servidor
publicamente. As opções mais simples:

1. **Túnel temporário (recomendado para um evento de um dia):** instale e rode o
   [ngrok](https://ngrok.com/) ou o `cloudflared` apontando para a porta 3000:
   ```bash
   ngrok http 3000
   ```
   Isso gera uma URL pública (ex: `https://abcd1234.ngrok-free.app`). Gere o QR Code da tela
   "Missão concluída" usando essa URL pública em vez do IP local — para isso, acesse o site já pela
   URL do ngrok (ex: `https://abcd1234.ngrok-free.app/missao`), e o QR Code gerado já vai apontar
   para o endereço certo automaticamente.
2. **Hospedagem real:** suba o projeto em um servidor (ex: uma VPS, Railway, Render) — mais robusto
   para eventos recorrentes, mas exige mais configuração.

## Hospedar de verdade: Netlify + Supabase

Essa opção coloca o site no ar permanentemente, sem depender do seu notebook ligado e sem
problema de rede diferente — todo mundo acessa a mesma URL pública, de qualquer lugar.

**Por quê não dá pra só subir no Netlify puro:** o modo local (`npm start`, seção acima) usa um
servidor Express que fica rodando o tempo todo com um arquivo SQLite e fotos salvas em disco.
O Netlify hospeda site estático + *funções* que rodam, respondem e são descartadas a cada chamada
— não existe disco persistente nelas, então o banco e as fotos sumiriam. Por isso este projeto tem
uma segunda implementação da API (`server/functions/api.js`) que troca SQLite/disco por
**Supabase** (Postgres + Storage), feita pra rodar como função do Netlify.

### 1. Criar o projeto no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (plano gratuito já serve).
2. Vá em **SQL Editor** → cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Isso cria as tabelas `entries` (cadastros do sorteio) e `quiz_scores` (ranking da Missão Dev).
3. Vá em **Storage** → **New bucket** → nome `photos` → marque **Public bucket** → criar.
   (precisa ser público pra foto aparecer no painel do apresentador e na tela do aluno; os nomes de
   arquivo são aleatórios/imprevisíveis, então não dá pra adivinhar a URL de outra pessoa).
4. Em **Project Settings → API**, anote:
   - **Project URL** → vai virar `SUPABASE_URL`
   - **service_role key** (não é a `anon`/pública!) → vai virar `SUPABASE_SERVICE_ROLE_KEY`
     — essa chave é secreta, só é usada dentro da função do Netlify, nunca no navegador.

### 2. Publicar no Netlify

Como este projeto ainda não é um repositório git, a forma mais rápida é publicar direto pela CLI,
sem precisar subir pro GitHub:

```bash
npm install -g netlify-cli
netlify login
netlify init        # escolha "Create & configure a new site"
netlify deploy --prod
```

O `netlify.toml` já está configurado (build do `client/`, função em `server/functions/`, e os
redirects de `/api/*` e das rotas do site). Se preferir conectar por um repositório Git (GitHub
etc.) depois, basta `git init`, subir o repo, e ligar o site pelo painel do Netlify — o
`netlify.toml` funciona do mesmo jeito.

### 3. Configurar as variáveis de ambiente no Netlify

No painel do site → **Site configuration → Environment variables**, adicione:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | a Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | a service_role key do Supabase |
| `ADMIN_PASSWORD` | senha do painel `/admin` (troque a padrão!) |
| `ADMIN_TOKEN_SECRET` | qualquer string aleatória longa (ex: gere com `openssl rand -hex 32`) |

Depois de salvar, faça um novo deploy (`netlify deploy --prod`) pra elas serem aplicadas na função.

### 4. Testar

Acesse a URL que o Netlify te deu (ex: `https://seu-site.netlify.app/missao`). Como é HTTPS, a
câmera e a localização funcionam normalmente em qualquer aparelho, de qualquer rede — é só escanear
o QR Code gerado no fim da Missão Dev.

## Estrutura

```
server/index.js           API local (Express + SQLite) — usada em "npm run dev" / "npm start"
server/functions/api.js   Mesma API, versão Netlify Function (Express + Supabase)
supabase/schema.sql       Script SQL das tabelas do Supabase
client/                   Site React (Vite) com as rotas /missao, /premio, /admin
uploads/                  Fotos no modo local (gerado em runtime, fora do git)
data/                     Banco SQLite no modo local (gerado em runtime, fora do git)
netlify.toml              Configuração de build/redirects do Netlify
```

## O que foi alterado em relação à versão original (HTML único)

- Prêmio "iPhone 16" trocado por **"Kit Boas-vindas DeQuadra"** (mais realista para um brinde de
  evento interno).
- Prêmio de Clash Royale ajustado para **"800 Gemas"**.
- Captura de dados deixou de ser só local/Supabase-opcional e passou a ser um **backend real**
  (Express + SQLite), com upload de foto e geolocalização de verdade, IP capturado no servidor, e
  acessível de qualquer aparelho na rede via `/admin`.
- Adicionado consentimento explícito e botão de autoexclusão de dados (ver seção acima).
