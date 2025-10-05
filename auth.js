// oauth.js
// Konstante za API putanje
const API_BASE = "https://botanica.ngrok.app"; // backend tunel

// Odjava
document.getElementById("signOutBtn").addEventListener("click", () => {
  // Resetuje globalni token definisan u frontend.html
  googleToken = null;
  document.getElementById("loginStatus").textContent = "Odjavljeno.";
  document.getElementById("signOutBtn").style.display = "none";
});

// Pomoćna funkcija za HTTP zahteve sa autorizacijom
// Postavljena u globalni opseg (window) da bi bila dostupna u backend.js
window.apiFetch = async function (path, method = "GET", body = null) {
  if (!googleToken) {
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
    // Ako odgovor nije validan JSON (npr. prazan odgovor ili HTML greška)
    return { ok: res.ok, status: res.status, json: { message: txt || "Unknown error" } };
  }
};
