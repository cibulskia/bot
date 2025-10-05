// oauth.js
const CLIENT_ID = "252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com";
const API_BASE = "https://botanica.ngrok.app"; // backend tunel
// googleToken se sada deklarise u frontend.html

document.getElementById("signOutBtn").addEventListener("click", () => {
  googleToken = null; // Koristi globalni googleToken iz frontend.html
  document.getElementById("loginStatus").textContent = "Odjavljeno.";
  document.getElementById("signOutBtn").style.display = "none";
});

// helper: fetch with auth
async function apiFetch(path, method = "GET", body = null) {
  if (!googleToken) { // Koristi globalni googleToken iz frontend.html
    throw new Error("No Google token. Please sign in.");
  }
  const headers = {
    "Authorization": `Bearer ${googleToken}`,
    "Content-Type": "application/json"
  };
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  try {
    const json = JSON.parse(txt);
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: res.ok, status: res.status, json: { raw: txt } };
  }
}
