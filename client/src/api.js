const BASE = ""; // mesmo host (proxy do Vite em dev, mesmo servidor em produção)

export function parseUA() {
  const ua = navigator.userAgent;
  let os = "Desconhecido";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iPhone / iPad (iOS)";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "Mac";
  else if (/Linux/i.test(ua)) os = "Linux";
  let br = "Navegador";
  if (/Edg\//.test(ua)) br = "Microsoft Edge";
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) br = "Opera";
  else if (/Chrome\//.test(ua)) br = "Google Chrome";
  else if (/Firefox\//.test(ua)) br = "Firefox";
  else if (/Safari\//.test(ua)) br = "Safari";
  const device = /Mobi|Android|iPhone/i.test(ua) ? "Celular" : "Computador";
  return { os, br, device };
}

export async function submitEntry(formData) {
  const res = await fetch(`${BASE}/api/entries`, { method: "POST", body: formData });
  if (!res.ok) throw new Error((await res.json()).error || "falha ao enviar");
  return res.json();
}

export async function deleteOwnEntry(id) {
  return fetch(`${BASE}/api/entries/${id}/self`, { method: "DELETE" });
}

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("senha incorreta");
  return res.json();
}

export async function adminFetchEntries(token) {
  const res = await fetch(`${BASE}/api/entries`, { headers: { "x-admin-token": token } });
  if (!res.ok) throw new Error("não autorizado");
  return res.json();
}

export async function adminDeleteEntry(token, id) {
  return fetch(`${BASE}/api/entries/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
}

export async function adminWipeAll(token) {
  return fetch(`${BASE}/api/entries`, { method: "DELETE", headers: { "x-admin-token": token } });
}

export async function postQuizScore(name, total_ms, errors) {
  const res = await fetch(`${BASE}/api/quiz-scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, total_ms, errors }),
  });
  return res.json();
}

export async function fetchQuizScores() {
  const res = await fetch(`${BASE}/api/quiz-scores`);
  return res.json();
}
