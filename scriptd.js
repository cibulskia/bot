let currentUserId = null;
let currentUserEmail = null;

// Ova funkcija je globalna i Google je poziva kada se učita GSI klijent
window.handleCredentialResponse = async (response) => {
    try {
        const res = await fetch('https://botanica.ngrok.app/oauth_callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();

        if (data.status === 'success') {
            currentUserId = data.user_id;
            currentUserEmail = data.user_email;

            document.getElementById('user-email').textContent = currentUserEmail;
            document.getElementById('main-section').style.display = 'flex'; // Promenjeno na flex zbog novog layouta
            document.getElementById('login-section').style.display = 'none';

            // Sada pozivamo dohvat podataka za tabele
            await fetchUserSettings();
            await fetchCategories();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Greška pri obradi prijave:', error);
        alert('Došlo je do greške prilikom prijave. Molimo pokušajte ponovo.');
    }
};

// Funkcija za odjavu - integrisana sa Google Sign-Out
function signOut() {
    // Ako koristite Google Identity Services novu biblioteku, odjavljivanje je malo drugačije.
    // U ovom slučaju, jednostavno sakrijemo glavnu sekciju i prikažemo login,
    // jer nema direktne `gapi.auth2.getAuthInstance().signOut()` funkcije za GSI.
    // Ako bi se koristila gapi biblioteka (clientside auth), onda bi bila potrebna gapi.auth2 inicijalizacija.
    // Za jednostavan slučaj, ovo je dovoljno da se resetuje UI.
    document.getElementById('main-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('user-email').textContent = '';
    currentUserId = null;
    currentUserEmail = null;
    console.log('User signed out from UI.');
    // Ako želite da Google prepozna odjavu i zaista očisti sesiju,
    // morate uključiti Google Platform Library ili pozvati Google API za odjavu na serveru.
    // gapi.load('auth2', function() {
    //   gapi.auth2.init({
    //     client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com'
    //   }).then(function() {
    //     var auth2 = gapi.auth2.getAuthInstance();
    //     auth2.signOut().then(function () {
    //       console.log('User signed out of Google.');
    //     });
    //   });
    // });
}


// Funkcija za čuvanje kategorije (POST za kreiranje/ažuriranje)
async function saveCategory() {
    if (!currentUserId) {
        alert('Morate biti prijavljeni da biste sačuvali kategoriju.');
        return;
    }

    const seqNum = document.getElementById('seq-num').value;
    if (!seqNum) {
        alert('Redni broj (Sequence Number) je obavezan!');
        return;
    }

    const categoryData = {
        google_user_id: currentUserId,
        client_email: currentUserEmail, // Uvek šaljemo email trenutno prijavljenog korisnika
        sequence_number: parseInt(seqNum),
        priority: parseInt(document.getElementById('priority').value),
        rule: document.getElementById('rule').value,
        response: document.getElementById('response').value,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        const res = await fetch('https://botanica.ngrok.app/categories', {
            method: 'POST', // Backend bi trebalo da handle-uje i update i create na istoj ruti
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        const data = await res.json();
        alert(data.message);
        if (data.status === 'success') {
            fetchCategories(); // Ponovo dohvati i prikaži kategorije nakon uspešnog čuvanja/ažuriranja
            resetCategoryForm(); // Očisti formu
        }
    } catch (error) {
        console.error('Greška pri čuvanju kategorije:', error);
        alert('Došlo je do greške prilikom čuvanja kategorije.');
    }
}

// Funkcija za dohvatanje kategorija
async function fetchCategories() {
    if (!currentUserId) {
        console.warn('Nema korisnika, ne mogu dohvatiti kategorije.');
        return [];
    }
    try {
        const res = await fetch('https://botanica.ngrok.app/get_categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_user_id: currentUserId })
        });
        const data = await res.json();
        if (data.status === 'success' && data.categories) {
            // Umesto JSON stringa, sada pozivamo displayCategories funkciju iz index.html
            displayCategories(data.categories);
            return data.categories; // Vraćamo podatke ako je potrebno za druge funkcije
        } else {
            displayCategories([]); // Prikazujemo praznu tabelu ako nema podataka
            return [];
        }
    } catch (error) {
        console.error('Greška pri dohvatanju kategorija:', error);
        displayCategories([]); // U slučaju greške, prikaži praznu tabelu
        alert('Došlo je do greške prilikom dohvatanja kategorija.');
        return [];
    }
}

// Funkcija za popunjavanje forme kategorije (za "Popuni po rednom broju" i "Izmeni")
async function populateCategoryFields() {
    const seqNum = document.getElementById('seq-num').value;
    if (!seqNum) {
        alert('Molimo unesite redni broj (Sequence Number) za popunjavanje.');
        return;
    }

    try {
        // Pretpostavimo da backend ima rutu za dohvat jedne kategorije po seqNum
        // Ako nema, dohvatimo sve i filtriramo klijentski
        const categories = await fetchCategories(); // fetchCategories sada vraća niz kategorija
        const category = categories.find(cat => cat.sequence_number == seqNum);

        if (category) {
            document.getElementById('priority').value = category.priority;
            document.getElementById('rule').value = category.rule;
            document.getElementById('response').value = category.response;
            document.getElementById('tags').value = category.tags.join(', ');
            alert('Podaci kategorije uspešno popunjeni za izmenu!');
        } else {
            alert('Kategorija sa datim rednim brojem nije pronađena.');
            resetCategoryForm();
        }
    } catch (error) {
        console.error('Greška pri dohvatanju pojedinačne kategorije:', error);
        alert('Došlo je do greške prilikom dohvatanja kategorije.');
    }
}

// Funkcija za brisanje kategorije
async function deleteCategoryRequest(seqNum) {
    if (!currentUserId) {
        alert('Morate biti prijavljeni da biste obrisali kategoriju.');
        return;
    }
    if (confirm(`Da li ste sigurni da želite da obrišete kategoriju sa rednim brojem ${seqNum}?`)) {
        try {
            const res = await fetch('https://botanica.ngrok.app/categories', { // Pretpostavljamo istu rutu za DELETE
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_user_id: currentUserId,
                    sequence_number: seqNum
                })
            });
            const data = await res.json();
            alert(data.message);
            if (data.status === 'success') {
                fetchCategories(); // Ponovo dohvati i prikaži kategorije nakon brisanja
            }
        } catch (error) {
            console.error('Greška pri brisanju kategorije:', error);
            alert('Došlo je do greške prilikom brisanja kategorije.');
        }
    }
}

// Funkcija za čuvanje korisničkih podešavanja
async function saveUserSettings() {
    if (!currentUserId) {
        alert('Morate biti prijavljeni da biste sačuvali podešavanja.');
        return;
    }

    const settingsData = {
        google_user_id: currentUserId,
        discord_token: document.getElementById('discord-token').value || null,
        is_checkbox_checked: document.getElementById('is-checkbox').checked,
        general_response: document.getElementById('general-response').value || null,
        user_rule: document.getElementById('user-rule').value || null,
        client_email: document.getElementById('user-client-email').value || null
    };

    try {
        const res = await fetch('https://botanica.ngrok.app/user_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });
        const data = await res.json();
        alert(data.message);
        if (data.status === 'success') {
            fetchUserSettings(); // Ponovo dohvati i prikaži podešavanja nakon uspešnog čuvanja
        }
    } catch (error) {
        console.error('Greška pri čuvanju podešavanja:', error);
        alert('Došlo je do greške prilikom čuvanja podešavanja.');
    }
}

// Funkcija za dohvatanje korisničkih podešavanja
async function fetchUserSettings() {
    if (!currentUserId) {
        console.warn('Nema korisnika, ne mogu dohvatiti podešavanja.');
        return;
    }
    try {
        const res = await fetch('https://botanica.ngrok.app/get_user_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_user_id: currentUserId })
        });
        const data = await res.json();

        if (data.status === 'success' && data.user_settings) {
            // Popunjavanje forme
            const settings = data.user_settings;
            document.getElementById('discord-token').value = settings.discord_token || '';
            document.getElementById('is-checkbox').checked = settings.is_checkbox_checked || false;
            document.getElementById('general-response').value = settings.general_response || '';
            document.getElementById('user-rule').value = settings.user_rule || '';
            document.getElementById('user-client-email').value = settings.client_email || '';

            // Sada pozivamo displayUserSettings funkciju iz index.html
            displayUserSettings(settings);
        } else {
            // Ako nema podešavanja, očisti formu i prikaži praznu tabelu
            document.getElementById('discord-token').value = '';
            document.getElementById('is-checkbox').checked = false;
            document.getElementById('general-response').value = '';
            document.getElementById('user-rule').value = '';
            document.getElementById('user-client-email').value = '';
            displayUserSettings({});
        }
    } catch (error) {
        console.error('Greška pri dohvatanju korisničkih podešavanja:', error);
        alert('Došlo je do greške prilikom dohvatanja korisničkih podešavanja.');
        displayUserSettings({}); // U slučaju greške, prikaži praznu tabelu
    }
}

// Pomoćna funkcija za resetovanje forme kategorije
function resetCategoryForm() {
    document.getElementById('seq-num').value = '';
    document.getElementById('priority').value = '';
    document.getElementById('rule').value = 'A'; // Postavi na default
    document.getElementById('response').value = '';
    document.getElementById('tags').value = '';
}

// Dodatne funkcije koje su definisane u index.html, ali ih pominjemo radi jasnoće
// One ne moraju biti ovde definisane, ali `scriptd.js` ih poziva.
/*
function displayUserSettings(data) { ... }
function displayCategories(data) { ... }
function editCategory(category) { ... }
function deleteCategory(seqNum) { ... } // Ova funkcija će pozvati deleteCategoryRequest iz scriptd.js
function showSection(sectionId) { ... }
*/

// Inicijalizacija Google API-ja (potrebno za `gapi.auth2` ako ga koristite za `signOut`)
// Trenutna implementacija `signOut` u index.html se oslanja na ovu inicijalizaciju.
function initClient() {
    // Proveri da li je gapi.client i gapi.auth2 dostupno pre inicijalizacije
    if (typeof gapi !== 'undefined' && gapi.client && gapi.auth2) {
        gapi.client.init({
            clientId: '252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com',
            scope: 'email profile'
        }).then(() => {
            console.log('Google API client initialized.');
            // Opcionalno: Slušaj promene statusa prijave ako želite reaktivni UI
            // gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
            // updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        }).catch(error => {
            console.error('Greška pri inicijalizaciji Google API klijenta:', error);
        });
    } else {
        console.warn('Google API client or auth2 not available for initClient. Skipping.');
    }
}

// Učitavanje Google API klijenta. Ovo je kritično za `gapi.auth2` ako se koristi.
// Ako koristite isključivo GSI (g_id_onload), ovo možda nije striktno neophodno,
// ali je dobra praksa za potpunu kontrolu nad Google API-jem.
// gapi.load('client:auth2', initClient);
// Pošto smo Google Sign-In migrirali na GSI i `handleCredentialResponse` je globalan,
// inicijalizacija `gapi` je sada manje kritična za primarnu prijavu,
// ali može biti korisna za `signOut` ako želimo "pravu" Google odjavu.
// Zadržimo je, ali imajmo na umu da je `g_id_onload` primarni.

// Globalna funkcija za Google API loading (ako se koristi `gapi.load`)
// Ovo je fallback ili dopuna GSI-u. Uklonite ako je zbunjujuće.
/*
window.gapi_onload = function() {
  gapi.load('client:auth2', initClient);
};
*/

// --- Dodatne funkcije za integraciju sa novim UI elementima ---

// Funkcija za popunjavanje forme za izmenu (poziva se iz `index.html`)
// Prosleđeni `category` objekat mora imati ista polja kao ona koja se prikazuju u tabeli.
function editCategory(category) {
    document.getElementById('seq-num').value = category.sequence_number;
    document.getElementById('priority').value = category.priority;
    document.getElementById('rule').value = category.rule;
    document.getElementById('response').value = category.response;
    document.getElementById('tags').value = category.tags.join(', ');
    alert(`Učitani podaci za izmenu kategorije sa rednim brojem: ${category.sequence_number}`);
}

// Funkcija za brisanje kategorije (poziva se iz `index.html`)
function deleteCategory(seqNum) {
    // Pozivamo implementaciju logike brisanja iz `scriptd.js`
    deleteCategoryRequest(seqNum);
}

// Globalne funkcije za UI kontrolu iz `index.html` koje se ne nalaze u `scriptd.js`
// Ove su pretpostavljene da postoje u globalnom opsegu iz `index.html`
/*
function displayUserSettings(settings) {
    // Implementacija iz index.html
}

function displayCategories(categories) {
    // Implementacija iz index.html
}

function showSection(sectionId) {
    // Implementacija iz index.html
}
*/
