(function() {
    "use strict"; // Strict mode za bolju proveru grešaka

    const CLIENT_ID = "252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com";
    const API_BASE = "https://botanica.ngrok.app"; // Backend tunel
    let googleToken = null;
    let selectedSubcatId = null;

    // ----- Pomoćne funkcije za DOM manipulaciju i UI -----
    const getElement = (id) => document.getElementById(id);
    const showElement = (element) => element.style.display = 'inline-block';
    const hideElement = (element) => element.style.display = 'none';
    const setStatus = (element, message, isError = false) => {
        element.textContent = message;
        if (isError) {
            element.classList.add('error');
        } else {
            element.classList.remove('error');
        }
    };

    const clearSubcatDetails = () => {
        getElement("subcatEditorTitle").textContent = "Nije izabrana ponuda";
        getElement("sub_name").value = "";
        getElement("sub_text1").value = "";
        getElement("sub_text2").value = "";
        getElement("sub_text3").value = "";
        getElement("sub_text4").value = "";
        getElement("sub_cb1").checked = false;
        // Pobrini se da polja budu isključena dok se ne izabere subkategorija
        getElement("sub_name").disabled = true;
        getElement("sub_text1").disabled = true;
        getElement("sub_text2").disabled = true;
        getElement("sub_text3").disabled = true;
        getElement("sub_text4").disabled = true;
        getElement("sub_cb1").disabled = true;
        getElement("btnUpdateSubcat").disabled = true;
    };

    const enableSubcatDetails = () => {
        getElement("sub_name").disabled = true; // Ovo je po zahtevu disabled
        getElement("sub_text1").disabled = true; // Ovo je po zahtevu disabled
        getElement("sub_text2").disabled = true; // Ovo je po zahtevu disabled
        getElement("sub_text3").disabled = true; // Ovo je po zahtevu disabled
        getElement("sub_text4").disabled = true; // Ovo je po zahtevu disabled
        getElement("sub_cb1").disabled = false;
        getElement("btnUpdateSubcat").disabled = false;
    };

    // ----- Google One Tap Callback -----
    window.handleCredentialResponse = (response) => {
        if (response && response.credential) {
            googleToken = response.credential;
            setStatus(getElement("loginStatus"), "Ulogovan (token primljen).", false);
            showElement(getElement("signOutBtn"));
            console.log("Google token received.");
            // Automatski učitaj kategoriju nakon prijave
            getElement("btnLoadCategory").click();
            clearSubcatDetails(); // Resetuj detalje posla
        } else {
            setStatus(getElement("loginStatus"), "Prijava nije uspela.", true);
            hideElement(getElement("signOutBtn"));
        }
    };

    // ----- Funkcija za API pozive sa autorizacijom -----
    async function apiFetch(path, method = "GET", body = null) {
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
            // Ako odgovor nije JSON (npr. prazan odgovor ili običan tekst)
            return { ok: res.ok, status: res.status, json: { raw: txt || res.statusText } };
        }
    }

    // ----- Funkcije za čitanje/pisanje vrednosti iz UI -----
    function getCategoryFields() {
        return {
            checkboxes: [true, false], // Uvek proizvodjac = true, poslodavac = false po zahtevu
            dropdown: getElement("cat_dropdown").value,
            texts: [
                getElement("cat_text1").value,
                getElement("cat_text2").value,
                getElement("cat_text3").value,
                getElement("cat_text4").value
            ]
        };
    }

    function setCategoryFields(obj) {
        getElement("cat_cb1").checked = true; // Uvek true
        getElement("cat_cb2").checked = false; // Uvek false

        getElement("cat_dropdown").value = obj.dropdown || "";
        const texts = obj.texts || ["", "", "", ""];
        getElement("cat_text1").value = texts[0] || "";
        getElement("cat_text2").value = texts[1] || "";
        getElement("cat_text3").value = texts[2] || "";
        getElement("cat_text4").value = texts[3] || "";
    }

    function setSubcatFields(s) {
        getElement("sub_name").value = s.name || "";
        getElement("sub_cb1").checked = (s.checkboxes && s.checkboxes[0]) || false;
        getElement("sub_text1").value = (s.texts && s.texts[0]) || "";
        getElement("sub_text2").value = (s.texts && s.texts[1]) || "";
        getElement("sub_text3").value = (s.texts && s.texts[2]) || "";
        getElement("sub_text4").value = (s.texts && s.texts[3]) || "";
        enableSubcatDetails(); // Omogući unos nakon što su podaci učitani
    }

    // ----- Event Listeneri -----
    document.addEventListener("DOMContentLoaded", () => {
        // Sakrij originalne checkboxe ako je ostalo u HTML-u
        // getElement("cat_cb_container").style.display = "none";

        // Inicijalizacija pri učitavanju stranice
        clearSubcatDetails(); // Osiguraj da su polja za posao isključena na početku

        // Dugme za odjavu
        getElement("signOutBtn").addEventListener("click", () => {
            googleToken = null;
            setStatus(getElement("loginStatus"), "Odjavljeno.", false);
            hideElement(getElement("signOutBtn"));
            setCategoryFields({ checkboxes: [true, false], dropdown: "", texts: ["", "", "", ""] });
            getElement("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda poslova. Kliknite "Lista ponuda" da ih učitate.</p>`;
            clearSubcatDetails();
            setStatus(getElement("catStatus"), ""); // Očisti status kategorije
            setStatus(getElement("subStatus"), ""); // Očisti status posla
        });

        // ----- Podešavanja kategorije (Korisnička podešavanja) -----
        getElement("btnLoadCategory").addEventListener("click", async () => {
            const statusElement = getElement("catStatus");
            setStatus(statusElement, "Učitavanje...");
            try {
                const r = await apiFetch("/category/load", "GET");
                if (!r.ok) {
                    throw new Error(r.json.error || "Greška pri učitavanju.");
                }
                const data = r.json;
                if (!data.category) {
                    setStatus(statusElement, "Nema kategorije (još). Polja su prazna.", false);
                    setCategoryFields({ checkboxes: [true, false], dropdown: "", texts: ["", "", "", ""] });
                    getElement("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda poslova. Kliknite "Lista ponuda" da ih učitate.</p>`;
                    return;
                }
                setCategoryFields(data.category);
                const scList = getElement("subcatList");
                scList.innerHTML = "";
                if (data.subcategories && data.subcategories.length > 0) {
                    data.subcategories.forEach(s => {
                        const div = document.createElement("div");
                        div.className = "subcat-item";
                        div.innerHTML = `<i class="fas fa-angle-right"></i> ${s.id} — ${s.name || "(bez imena)"}`;
                        div.dataset.id = s.id;
                        div.addEventListener("click", () => loadSubcatForEdit(s.id));
                        scList.appendChild(div);
                    });
                } else {
                    scList.innerHTML = `<p class="empty-state">Nema aktivnih ponuda poslova. Kliknite "Lista ponuda" da ih učitate.</p>`;
                }
                setStatus(statusElement, "Podešavanja učitana.", false);
            } catch (e) {
                console.error("Greška pri učitavanju kategorije:", e);
                setStatus(statusElement, "Greška pri učitavanju kategorije: " + e.message, true);
            }
        });

        getElement("btnUpdateCategory").addEventListener("click", async () => {
            const statusElement = getElement("catStatus");
            setStatus(statusElement, "Šaljem...");
            try {
                const payload = getCategoryFields();
                const r = await apiFetch("/category/update", "POST", payload);
                if (!r.ok) {
                    throw new Error(r.json.error || "Greška pri čuvanju.");
                }
                setStatus(statusElement, r.json.message || "Sačuvano.", false);
            } catch (e) {
                console.error("Greška pri slanju kategorije:", e);
                setStatus(statusElement, "Greška pri slanju: " + e.message, true);
            }
        });

        getElement("btnDeleteCategory").addEventListener("click", async () => {
            if (!confirm("Da li stvarno želite da obrišete sve iz kategorije (uključujući podkategorije)? Ova akcija je nepovratna!")) return;
            const statusElement = getElement("catStatus");
            setStatus(statusElement, "Brišem...");
            try {
                const r = await apiFetch("/category/delete_all", "POST", {});
                if (!r.ok) {
                    throw new Error(r.json.error || "Greška pri brisanju.");
                }
                setStatus(statusElement, r.json.message || "Obrisano.", false);
                setCategoryFields({ checkboxes: [true, false], dropdown: "", texts: ["", "", "", ""] });
                getElement("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda poslova. Kliknite "Lista ponuda" da ih učitate.</p>`;
                clearSubcatDetails();
            } catch (e) {
                console.error("Greška pri brisanju kategorije:", e);
                setStatus(statusElement, "Greška pri brisanju: " + e.message, true);
            }
        });

        // ----- Ponude poslova (Subkategorije) -----
        getElement("btnListSubcats").addEventListener("click", async () => {
            const statusElement = getElement("subStatus");
            setStatus(statusElement, "Učitavam listu...");
            try {
                const r = await apiFetch("/subcategories/list", "GET");
                if (!r.ok) {
                    throw new Error(r.json.error || "Greška pri listanju.");
                }
                const list = r.json.subcategories || [];
                const scList = getElement("subcatList");
                scList.innerHTML = "";
                if (list.length > 0) {
                    list.forEach(s => {
                        const div = document.createElement("div");
                        div.className = "subcat-item";
                        div.innerHTML = `<i class="fas fa-angle-right"></i> ${s.id} — ${s.name || "(bez imena)"}`;
                        div.dataset.id = s.id;
                        div.addEventListener("click", () => loadSubcatForEdit(s.id));
                        scList.appendChild(div);
                    });
                } else {
                    scList.innerHTML = `<p class="empty-state">Nema aktivnih ponuda poslova. Kliknite "Lista ponuda" da ih učitate.</p>`;
                }
                setStatus(statusElement, `Pronađeno ${list.length} ponuda.`, false);
                clearSubcatDetails(); // Resetuj detalje nakon što se lista osveži
            } catch (e) {
                console.error("Greška pri listanju ponuda:", e);
                setStatus(statusElement, "Greška pri listanju ponuda: " + e.message, true);
            }
        });

        async function loadSubcatForEdit(id) {
            const statusElement = getElement("subStatus");
            setStatus(statusElement, "Učitavam ponudu...");
            try {
                const r = await apiFetch("/subcategory/" + id, "GET");
                if (!r.ok) {
                    throw new Error(r.json.error || "Greška pri učitavanju ponude.");
                }
                const s = r.json.subcategory;
                selectedSubcatId = s.id;
                getElement("subcatEditorTitle").innerHTML = `<i class="fas fa-info-circle"></i> Prijava za posao: ${s.id}`;
                setSubcatFields(s);
                setStatus(statusElement, "Ponuda učitana.", false);
            } catch (e) {
                console.error("Greška pri učitavanju ponude za izmenu:", e);
                setStatus(statusElement, "Greška pri učitavanju ponude: " + e.message, true);
            }
        }

        getElement("btnUpdateSubcat").addEventListener("click", async () => {
            if (!selectedSubcatId) {
                alert("Nije izabrana ponuda za prijavu.");
                return;
            }
            const statusElement = getElement("subStatus");
            setStatus(statusElement, "Šaljem prijavu...");
            try {
                const payload = {
                    checkboxes: [getElement("sub_cb1").checked], // Samo jedan checkbox za prijavu
                    name: getElement("sub_name").value, // Vrednost koja se šalje, iako je polje disabled
                    texts: [
                        getElement("sub_text1").value,
                        getElement("sub_text2").value,
                        getElement("sub_text3").value,
                        getElement("sub_text4").value
                    ]
                };
                const r = await apiFetch("/subcategory/update/" + selectedSubcatId, "POST", payload);
                if (!r.ok) {
                    throw new Error(r.json.error || "Greška pri slanju prijave.");
                }
                setStatus(statusElement, r.json.message || "Prijava uspešno poslata.", false);
                // Osveži listu poslova nakon prijave
                await getElement("btnListSubcats").click();
                clearSubcatDetails(); // Resetuj detalje nakon prijave
            } catch (e) {
                console.error("Greška pri slanju prijave:", e);
                setStatus(statusElement, "Greška pri slanju prijave: " + e.message, true);
            }
        });
    });

})();
