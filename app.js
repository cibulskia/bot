const CLIENT_ID = "252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com";
const API_BASE = "https://botanica.ngrok.app"; // backend tunel
let googleToken = null;
let selectedSubcatId = null;

// Google One Tap callback
window.handleCredentialResponse = (response) => {
  if (response && response.credential) {
    googleToken = response.credential;
    document.getElementById("loginStatus").textContent = "Ulogovan (token primljen).";
    document.getElementById("signOutBtn").style.display = "inline-block";
    console.log("Google token received.");
  } else {
    document.getElementById("loginStatus").textContent = "Prijava nije uspela.";
  }
};

document.getElementById("signOutBtn").addEventListener("click", () => {
  googleToken = null;
  document.getElementById("loginStatus").textContent = "Odjavljeno.";
  document.getElementById("signOutBtn").style.display = "none";
});

// helper: fetch with auth
async function apiFetch(path, method="GET", body=null) {
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
    return { ok: res.ok, status: res.status, json: { raw: txt } };
  }
}

// Category buttons
document.getElementById("btnLoadCategory").addEventListener("click", async () => {
  const status = document.getElementById("catStatus");
  status.textContent = "Učitavanje...";
  try {
    const r = await apiFetch("/category/load", "GET");
    if (!r.ok) throw r.json;
    const data = r.json;
    if (!data.category) {
      status.textContent = "Nema kategorije (još). Polja su prazna.";
      setCategoryFields({checkboxes:[true,false], dropdown:"", texts:["","","",""]});
      document.getElementById("subcatList").innerHTML = "";
      return;
    }
    setCategoryFields(data.category);
    const scList = document.getElementById("subcatList");
    scList.innerHTML = "";
    (data.subcategories || []).forEach(s => {
      const div = document.createElement("div");
      div.className = "subcat-item";
      div.textContent = `${s.id} — ${s.name || "(bez imena)"}`;
      div.dataset.id = s.id;
      div.addEventListener("click", () => loadSubcatForEdit(s.id));
      scList.appendChild(div);
    });
    status.textContent = "Podesavanja učitana.";
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri učitavanju kategorije.";
  }
});

document.getElementById("btnUpdateCategory").addEventListener("click", async () => {
  const status = document.getElementById("catStatus");
  status.textContent = "Šaljem...";
  try {
    const payload = getCategoryFields();
    const r = await apiFetch("/category/update", "POST", payload);
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || JSON.stringify(r.json));
      return;
    }
    status.textContent = r.json.message || "Sačuvano.";
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri slanju.";
  }
});

document.getElementById("btnDeleteCategory").addEventListener("click", async () => {
  if (!confirm("Da li stvarno želite da obrišete sve iz kategorije (uključujući podkategorije)?")) return;
  const status = document.getElementById("catStatus");
  status.textContent = "Brišem...";
  try {
    const r = await apiFetch("/category/delete_all", "POST", {});
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || JSON.stringify(r.json));
      return;
    }
    status.textContent = r.json.message || "Obrisano.";
    setCategoryFields({checkboxes:[true,false], dropdown:"", texts:["","","",""]});
    document.getElementById("subcatList").innerHTML = "";
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri brisanju.";
  }
});

// Subcategories list
document.getElementById("btnListSubcats").addEventListener("click", async () => {
  const status = document.getElementById("subStatus");
  status.textContent = "Učitavam listu...";
  try {
    const r = await apiFetch("/subcategories/list", "GET");
    if (!r.ok) throw r.json;
    const list = r.json.subcategories || [];
    const scList = document.getElementById("subcatList");
    scList.innerHTML = "";
    list.forEach(s => {
      const div = document.createElement("div");
      div.className = "subcat-item";
      div.textContent = `${s.id} — ${s.name || "(bez imena)"}`;
      div.dataset.id = s.id;
      div.addEventListener("click", () => loadSubcatForEdit(s.id));
      scList.appendChild(div);
    });
    status.textContent = `Pronađeno ${list.length} podkategorija.`;
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri listanju ponuda.";
  }
});

async function loadSubcatForEdit(id) {
  const status = document.getElementById("subStatus");
  status.textContent = "Učitavam podkategoriju...";
  try {
    const r = await apiFetch("/subcategory/" + id, "GET");
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || JSON.stringify(r.json));
      return;
    }
    const s = r.json.subcategory;
    selectedSubcatId = s.id;
    document.getElementById("subcatEditorTitle").textContent = `prijava za posao: ${s.id}`;
    setSubcatFields(s);
    status.textContent = "lista ponuda učitana.";
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri učitavanju liste ponuda.";
  }
}

document.getElementById("btnUpdateSubcat").addEventListener("click", async () => {
  if (!selectedSubcatId) { alert("Nije izabrana ponuda."); return; }
  const status = document.getElementById("subStatus");
  status.textContent = "Ažuriram...";
  try {
    const payload = {
      checkboxes: [document.getElementById("sub_cb1").checked],
      name: document.getElementById("sub_name").value,
      texts: [
        document.getElementById("sub_text1").value,
        document.getElementById("sub_text2").value,
        document.getElementById("sub_text3").value,
        document.getElementById("sub_text4").value
      ]
    };
    const r = await apiFetch("/subcategory/update/" + selectedSubcatId, "POST", payload);
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || JSON.stringify(r.json));
      return;
    }
    status.textContent = r.json.message || "Ažurirano.";
    await document.getElementById("btnListSubcats").click();
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri ažuriranju.";
  }
});

// helpers for reading/writing UI
function getCategoryFields() {
  return {
    checkboxes: [true, false], // uvek proizvodjac = true, poslodavac = false
    dropdown: document.getElementById("cat_dropdown").value,
    texts: [
      document.getElementById("cat_text1").value,
      document.getElementById("cat_text2").value,
      document.getElementById("cat_text3").value,
      document.getElementById("cat_text4").value
    ]
  };
}

function setCategoryFields(obj) {
  // proizvodjac uvek true, poslodavac false
  document.getElementById("cat_cb1").checked = true;
  document.getElementById("cat_cb2").checked = false;

  document.getElementById("cat_dropdown").value = obj.dropdown || "";
  const texts = obj.texts || ["","","",""];
  document.getElementById("cat_text1").value = texts[0] || "";
  document.getElementById("cat_text2").value = texts[1] || "";
  document.getElementById("cat_text3").value = texts[2] || "";
  document.getElementById("cat_text4").value = texts[3] || "";
}

function setSubcatFields(s) {
  document.getElementById("sub_name").value = s.name || "";
  document.getElementById("sub_name").disabled = true;
  document.getElementById("sub_cb1").checked = (s.checkboxes && s.checkboxes[0]) || false;
  document.getElementById("sub_text1").value = (s.texts && s.texts[0]) || "";
  document.getElementById("sub_text2").value = (s.texts && s.texts[1]) || "";
  document.getElementById("sub_text3").value = (s.texts && s.texts[2]) || "";
  document.getElementById("sub_text4").value = (s.texts && s.texts[3]) || "";
  document.getElementById("sub_text1").disabled = true;
  document.getElementById("sub_text2").disabled = true;
  document.getElementById("sub_text3").disabled = true;
  document.getElementById("sub_text4").disabled = true;
}
