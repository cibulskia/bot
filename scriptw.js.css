const CLIENT_ID = "252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com";
const API_BASE = "https://botanica.ngrok.app"; // backend tunel
let googleToken = null;
let selectedSubcatId = null;
let currentSelectedSubcatItem = null; // To keep track of the currently selected job offer item

// --- Helper Functions ---

// Shows a status message with optional styling
function showStatus(elementId, message, type = "info") {
  const statusElement = document.getElementById(elementId);
  statusElement.textContent = message;
  statusElement.className = `status-message show ${type}`;
  // Hide after 5 seconds
  setTimeout(() => {
    statusElement.classList.remove("show");
  }, 5000);
}

// Helper: fetch with auth
async function apiFetch(path, method = "GET", body = null) {
  if (!googleToken) {
    showStatus("loginStatus", "Niste prijavljeni. Molimo prijavite se putem Google-a.", "error");
    throw new Error("No Google token. Please sign in.");
  }
  const headers = {
    "Authorization": `Bearer ${googleToken}`,
    "Content-Type": "application/json"
  };
  try {
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
      // If response is not JSON, return raw text
      return { ok: res.ok, status: res.status, json: { message: txt || 'No response content' } };
    }
  } catch (error) {
    console.error("API Fetch Error:", error);
    showStatus("catStatus", `Došlo je do mrežne greške: ${error.message}`, "error");
    throw error;
  }
}

// --- Google One Tap Login/Logout ---
window.handleCredentialResponse = (response) => {
  if (response && response.credential) {
    googleToken = response.credential;
    const decodedToken = parseJwt(googleToken);
    const userEmail = decodedToken.email;
    document.getElementById("loginStatus").innerHTML = `Ulogovan kao: <strong>${userEmail}</strong>`;
    document.getElementById("signOutBtn").style.display = "inline-flex";
    showStatus("loginStatus", `Dobrodošli, ${userEmail}!`, "success");
    console.log("Google token received for user:", userEmail);
    // Automatically load category settings after login
    document.getElementById("btnLoadCategory").click();
  } else {
    document.getElementById("loginStatus").textContent = "Prijava nije uspela.";
    showStatus("loginStatus", "Google prijava neuspešna. Pokušajte ponovo.", "error");
  }
};

document.getElementById("signOutBtn").addEventListener("click", () => {
  googleToken = null;
  document.getElementById("loginStatus").textContent = "Odjavljeno.";
  document.getElementById("signOutBtn").style.display = "none";
  showStatus("loginStatus", "Uspešno ste se odjavili.", "info");
  // Clear all fields and subcategories on logout
  setCategoryFields({checkboxes:[true,false], dropdown:"", texts:["","","",""]});
  document.getElementById("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda. Kliknite 'Lista ponuda' da učitate.</p>`;
  document.getElementById("subcatEditorTitle").textContent = "Nije izabrana ponuda";
  setSubcatFields({});
  selectedSubcatId = null;
  currentSelectedSubcatItem = null;
  if (window.google && google.accounts.id) {
    google.accounts.id.disableAutoSelect(); // Prevent immediate re-login
  }
});

// Helper to decode JWT for displaying email
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

// --- Category Management ---
document.getElementById("btnLoadCategory").addEventListener("click", async () => {
  showStatus("catStatus", "Učitavanje podešavanja...", "info");
  try {
    const r = await apiFetch("/category/load", "GET");
    if (!r.ok) {
        showStatus("catStatus", "Greška pri učitavanju: " + (r.json.error || r.json.message || "Nepoznata greška."), "error");
        // If 404, implies no category exists, so clear fields
        if (r.status === 404) {
            setCategoryFields({checkboxes:[true,false], dropdown:"", texts:["","","",""]});
            document.getElementById("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda. Kliknite 'Lista ponuda' da učitate.</p>`;
            showStatus("catStatus", "Nema sačuvanih podešavanja (još uvek). Polja su prazna.", "info");
        }
        return;
    }
    const data = r.json;
    setCategoryFields(data.category || {});

    // Populate subcategory list if data exists
    const scList = document.getElementById("subcatList");
    scList.innerHTML = "";
    if (data.subcategories && data.subcategories.length > 0) {
      data.subcategories.forEach(s => {
        const div = document.createElement("div");
        div.className = "subcat-item";
        div.textContent = `${s.id} — ${s.name || "(bez imena)"}`;
        div.dataset.id = s.id;
        div.addEventListener("click", (event) => loadSubcatForEdit(s.id, event.target));
        scList.appendChild(div);
      });
      showStatus("catStatus", "Podešavanja i lista ponuda učitani.", "success");
    } else {
      scList.innerHTML = `<p class="empty-state">Nema aktivnih ponuda. Kliknite 'Lista ponuda' da učitate.</p>`;
      showStatus("catStatus", "Podešavanja učitana. Nema dostupnih ponuda.", "info");
    }
    // Clear subcategory details editor
    document.getElementById("subcatEditorTitle").textContent = "Nije izabrana ponuda";
    setSubcatFields({});
    selectedSubcatId = null;
    currentSelectedSubcatItem = null;

  } catch (e) {
    console.error(e);
    showStatus("catStatus", "Greška pri učitavanju podešavanja.", "error");
  }
});

document.getElementById("btnUpdateCategory").addEventListener("click", async () => {
  showStatus("catStatus", "Šaljem podešavanja...", "info");
  try {
    const payload = getCategoryFields();
    const r = await apiFetch("/category/update", "POST", payload);
    if (!r.ok) {
      showStatus("catStatus", "Greška pri čuvanju: " + (r.json.error || r.json.message || JSON.stringify(r.json)), "error");
      return;
    }
    showStatus("catStatus", r.json.message || "Podešavanja uspešno sačuvana.", "success");
    // Reload category to ensure UI is in sync
    document.getElementById("btnLoadCategory").click();
  } catch (e) {
    console.error(e);
    showStatus("catStatus", "Greška pri slanju podešavanja.", "error");
  }
});

document.getElementById("btnDeleteCategory").addEventListener("click", async () => {
  if (!confirm("Da li stvarno želite da obrišete sve iz kategorije (uključujući podkategorije)? Ova akcija je nepovratna!")) return;
  showStatus("catStatus", "Brišem nalog...", "info");
  try {
    const r = await apiFetch("/category/delete_all", "POST", {});
    if (!r.ok) {
      showStatus("catStatus", "Greška pri brisanju: " + (r.json.error || r.json.message || JSON.stringify(r.json)), "error");
      return;
    }
    showStatus("catStatus", r.json.message || "Nalog i sva podešavanja su obrisani.", "success");
    setCategoryFields({checkboxes:[true,false], dropdown:"", texts:["","","",""]});
    document.getElementById("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda. Kliknite 'Lista ponuda' da učitate.</p>`;
    document.getElementById("subcatEditorTitle").textContent = "Nije izabrana ponuda";
    setSubcatFields({});
    selectedSubcatId = null;
    currentSelectedSubcatItem = null;
  } catch (e) {
    console.error(e);
    showStatus("catStatus", "Greška pri brisanju naloga.", "error");
  }
});

// --- Subcategory (Job Offer) Management ---
document.getElementById("btnListSubcats").addEventListener("click", async () => {
  showStatus("subStatus", "Učitavam listu ponuda...", "info");
  try {
    const r = await apiFetch("/subcategories/list", "GET");
    if (!r.ok) {
      showStatus("subStatus", "Greška pri listanju ponuda: " + (r.json.error || r.json.message || "Nepoznata greška."), "error");
      return;
    }
    const list = r.json.subcategories || [];
    const scList = document.getElementById("subcatList");
    scList.innerHTML = ""; // Clear existing list

    if (list.length > 0) {
      list.forEach(s => {
        const div = document.createElement("div");
        div.className = "subcat-item";
        div.textContent = `${s.id} — ${s.name || "(bez imena)"}`;
        div.dataset.id = s.id;
        div.addEventListener("click", (event) => loadSubcatForEdit(s.id, event.target));
        scList.appendChild(div);
      });
      showStatus("subStatus", `Pronađeno ${list.length} ponuda.`, "success");
    } else {
      scList.innerHTML = `<p class="empty-state">Nema aktivnih ponuda.</p>`;
      showStatus("subStatus", "Nema dostupnih ponuda.", "info");
    }
    // Clear subcategory details editor after listing
    document.getElementById("subcatEditorTitle").textContent = "Nije izabrana ponuda";
    setSubcatFields({});
    selectedSubcatId = null;
    if (currentSelectedSubcatItem) {
        currentSelectedSubcatItem.classList.remove("selected");
        currentSelectedSubcatItem = null;
    }

  } catch (e) {
    console.error(e);
    showStatus("subStatus", "Greška pri listanju ponuda.", "error");
  }
});

async function loadSubcatForEdit(id, clickedElement) {
  showStatus("subStatus", "Učitavam detalje ponude...", "info");
  try {
    const r = await apiFetch("/subcategory/" + id, "GET");
    if (!r.ok) {
      showStatus("subStatus", "Greška pri učitavanju ponude: " + (r.json.error || r.json.message || JSON.stringify(r.json)), "error");
      return;
    }
    const s = r.json.subcategory;
    selectedSubcatId = s.id;
    document.getElementById("subcatEditorTitle").innerHTML = `<i class="fas fa-file-alt"></i> Prijava za posao: ${s.id}`;
    setSubcatFields(s);
    showStatus("subStatus", "Detalji ponude učitani.", "success");

    // Highlight the selected item in the list
    if (currentSelectedSubcatItem) {
      currentSelectedSubcatItem.classList.remove("selected");
    }
    if (clickedElement) {
      clickedElement.classList.add("selected");
      currentSelectedSubcatItem = clickedElement;
    }

  } catch (e) {
    console.error(e);
    showStatus("subStatus", "Greška pri učitavanju detalja ponude.", "error");
  }
}

document.getElementById("btnUpdateSubcat").addEventListener("click", async () => {
  if (!selectedSubcatId) {
    showStatus("subStatus", "Molimo izaberite ponudu za koju želite da pošaljete prijavu.", "error");
    return;
  }
  showStatus("subStatus", "Šaljem prijavu...", "info");
  try {
    const payload = {
      checkboxes: [document.getElementById("sub_cb1").checked],
      // The name and texts fields for subcategory update are usually taken from the job offer itself,
      // but if the UI allowed for modification, they would be read here.
      // For this "apply" scenario, we just send the checkbox state.
      // We will re-send the current values to avoid overwriting with empty data if the backend expects them.
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
      showStatus("subStatus", "Greška pri slanju prijave: " + (r.json.error || r.json.message || JSON.stringify(r.json)), "error");
      return;
    }
    showStatus("subStatus", r.json.message || "Prijava uspešno poslata!", "success");
    // Optionally refresh the subcategory list or the selected subcategory's details
    // to reflect the change (e.g., if application status changes)
    if (currentSelectedSubcatItem) {
        loadSubcatForEdit(selectedSubcatId, currentSelectedSubcatItem);
    }
  } catch (e) {
    console.error(e);
    showStatus("subStatus", "Greška pri slanju prijave.", "error");
  }
});

// --- Helpers for reading/writing UI ---
function getCategoryFields() {
  return {
    checkboxes: [true, false], // uvek proizvodjac = true, poslodavac = false (based on original instruction)
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
  // proizvodjac uvek true, poslodavac false (based on original instruction)
  // These checkboxes are hidden in the new HTML, so we just set them programmatically.
  // document.getElementById("cat_cb1").checked = true;
  // document.getElementById("cat_cb2").checked = false;

  document.getElementById("cat_dropdown").value = obj.dropdown || "";
  const texts = obj.texts || ["","","",""];
  document.getElementById("cat_text1").value = texts[0] || "";
  document.getElementById("cat_text2").value = texts[1] || "";
  document.getElementById("cat_text3").value = texts[2] || "";
  document.getElementById("cat_text4").value = texts[3] || "";
}

function setSubcatFields(s) {
  // Ensure fields are enabled for display, but disabled for user editing for job offers
  document.getElementById("sub_name").value = s.name || "";
  document.getElementById("sub_name").disabled = true;

  // The sub_cb1 is for "Prijavljujem se za posao"
  document.getElementById("sub_cb1").checked = (s.checkboxes && s.checkboxes[0]) || false;

  document.getElementById("sub_text1").value = (s.texts && s.texts[0]) || "";
  document.getElementById("sub_text1").disabled = true;

  document.getElementById("sub_text2").value = (s.texts && s.texts[1]) || "";
  document.getElementById("sub_text2").disabled = true;

  document.getElementById("sub_text3").value = (s.texts && s.texts[2]) || "";
  document.getElementById("sub_text3").disabled = true;

  document.getElementById("sub_text4").value = (s.texts && s.texts[3]) || "";
  document.getElementById("sub_text4").disabled = true;
}

// Initial load (if user is already signed in via Google One Tap)
// The handleCredentialResponse usually triggers the initial load.
// However, if the page is reloaded and Google One Tap doesn't re-select immediately,
// or if there's no auto-select, a manual check might be beneficial.
// For now, relying on handleCredentialResponse is fine.
