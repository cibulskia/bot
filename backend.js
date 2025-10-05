// backend.js
let selectedSubcatId = null; // Globalna varijabla za trenutno izabranu podkategoriju

// Funkcije za manipulaciju UI elementima
function getCategoryFields() {
  return {
    checkboxes: [true, false], // Uvek proizvodjac = true, poslodavac = false
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
  document.getElementById("cat_cb1").checked = true;
  document.getElementById("cat_cb2").checked = false;

  document.getElementById("cat_dropdown").value = obj.dropdown || "";
  const texts = obj.texts || ["", "", "", ""];
  document.getElementById("cat_text1").value = texts[0] || "";
  document.getElementById("cat_text2").value = texts[1] || "";
  document.getElementById("cat_text3").value = texts[2] || "";
  document.getElementById("cat_text4").value = texts[3] || "";
}

function setSubcatFields(s) {
  document.getElementById("sub_name").value = s.name || "";
  document.getElementById("sub_name").disabled = true; // Onemogući uređivanje
  document.getElementById("sub_cb1").checked = (s.checkboxes && s.checkboxes[0]) || false;
  document.getElementById("sub_text1").value = (s.texts && s.texts[0]) || "";
  document.getElementById("sub_text2").value = (s.texts && s.texts[1]) || "";
  document.getElementById("sub_text3").value = (s.texts && s.texts[2]) || "";
  document.getElementById("sub_text4").value = (s.texts && s.texts[3]) || "";
  document.getElementById("sub_text1").disabled = true; // Onemogući uređivanje
  document.getElementById("sub_text2").disabled = true; // Onemogući uređivanje
  document.getElementById("sub_text3").disabled = true; // Onemogući uređivanje
  document.getElementById("sub_text4").disabled = true; // Onemogući uređivanje
}

// Funkcija za učitavanje podkategorije i popunjavanje forme
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

// Event listeneri za dugmad
document.getElementById("btnLoadCategory").addEventListener("click", async () => {
  const status = document.getElementById("catStatus");
  status.textContent = "Učitavanje...";
  try {
    const r = await window.apiFetch("/category/load", "GET"); // Koristi window.apiFetch
    if (!r.ok) throw r.json;
    const data = r.json;
    if (!data.category) {
      status.textContent = "Nema kategorije (još). Polja su prazna.";
      setCategoryFields({ checkboxes: [true, false], dropdown: "", texts: ["", "", "", ""] });
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
    status.textContent = "Greška pri učitavanju kategorije: " + (e.message || JSON.stringify(e));
  }
});

document.getElementById("btnUpdateCategory").addEventListener("click", async () => {
  const status = document.getElementById("catStatus");
  status.textContent = "Šaljem...";
  try {
    const payload = getCategoryFields();
    const r = await window.apiFetch("/category/update", "POST", payload); // Koristi window.apiFetch
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || r.json.message || JSON.stringify(r.json));
      return;
    }
    status.textContent = r.json.message || "Sačuvano.";
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri slanju: " + (e.message || JSON.stringify(e));
  }
});

document.getElementById("btnDeleteCategory").addEventListener("click", async () => {
  if (!confirm("Da li stvarno želite da obrišete sve iz kategorije (uključujući podkategorije)?")) return;
  const status = document.getElementById("catStatus");
  status.textContent = "Brišem...";
  try {
    const r = await window.apiFetch("/category/delete_all", "POST", {}); // Koristi window.apiFetch
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || r.json.message || JSON.stringify(r.json));
      return;
    }
    status.textContent = r.json.message || "Obrisano.";
    setCategoryFields({ checkboxes: [true, false], dropdown: "", texts: ["", "", "", ""] });
    document.getElementById("subcatList").innerHTML = "";
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri brisanju: " + (e.message || JSON.stringify(e));
  }
});

document.getElementById("btnListSubcats").addEventListener("click", async () => {
  const status = document.getElementById("subStatus");
  status.textContent = "Učitavam listu...";
  try {
    const r = await window.apiFetch("/subcategories/list", "GET"); // Koristi window.apiFetch
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
    status.textContent = "Greška pri listanju ponuda: " + (e.message || JSON.stringify(e));
  }
});

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
    const r = await window.apiFetch("/subcategory/update/" + selectedSubcatId, "POST", payload); // Koristi window.apiFetch
    if (!r.ok) {
      status.textContent = "Greška: " + (r.json.error || r.json.message || JSON.stringify(r.json));
      return;
    }
    status.textContent = r.json.message || "Ažurirano.";
    // Osveži listu podkategorija nakon ažuriranja
    await document.getElementById("btnListSubcats").click();
  } catch (e) {
    console.error(e);
    status.textContent = "Greška pri ažuriranju: " + (e.message || JSON.stringify(e));
  }
});
