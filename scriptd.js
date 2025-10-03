let currentUserId = null;
let currentUserEmail = null;

// Funkcija koja se poziva nakon Google prijave
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

// Funkcija za odjavu
function signOut() {
    // Ako koristite Google Identity Services novu biblioteku, odjavljivanje je malo drugačije.
    // Jednostavno sakrijemo glavnu sekciju i prikažemo login.
    document.getElementById('main-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('user-email').textContent = '';
    currentUserId = null;
    currentUserEmail = null;
    console.log('User signed out from UI.');
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
    const parsedSeqNum = parseInt(seqNum, 10); // Uvek parsiraj kao broj

    // Provera da li su prioriteti i redni brojevi validni brojevi
    const priority = parseInt(document.getElementById('priority').value, 10);
    if (isNaN(parsedSeqNum) || parsedSeqNum < 1 || parsedSeqNum > 99) {
        alert('Redni broj mora biti broj između 1 i 99.');
        return;
    }
    if (isNaN(priority) || priority < 0 || priority > 9) {
        alert('Prioritet mora biti broj između 0 i 9.');
        return;
    }


    const categoryData = {
        google_user_id: currentUserId,
        client_email: currentUserEmail,
        sequence_number: parsedSeqNum, // Koristimo parsiranu vrednost
        priority: priority,
        rule: document.getElementById('rule').value,
        response: document.getElementById('response').value,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        const res = await fetch('https://botanica.ngrok.app/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        const data = await res.json();
        alert(data.message);
        if (data.status === 'success') {
            await fetchCategories(); // Ponovo dohvati i prikaži kategorije nakon uspešnog čuvanja/ažuriranja
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
        displayCategories([]); // Prikazujemo praznu tabelu
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
            // Transformišemo sequence_number u broj ako backend vraća string
            const categories = data.categories.map(cat => ({
                ...cat,
                sequence_number: parseInt(cat.sequence_number, 10) // Osiguraj da je broj
            }));
            displayCategories(categories);
            return categories; // Vraćamo transformisane podatke
        } else {
            displayCategories([]);
            return [];
        }
    } catch (error) {
        console.error('Greška pri dohvatanju kategorija:', error);
        displayCategories([]);
        alert('Došlo je do greške prilikom dohvatanja kategorija.');
        return [];
    }
}

// Funkcija za popunjavanje forme kategorije (za "Popuni po rednom broju" i "Izmeni")
async function populateCategoryFields() {
    const seqNumInput = document.getElementById('seq-num').value;
    if (!seqNumInput) {
        alert('Molimo unesite redni broj (Sequence Number) za popunjavanje.');
        return;
    }
    const targetSeqNum = parseInt(seqNumInput, 10); // Parsiraj unesenu vrednost

    if (isNaN(targetSeqNum) || targetSeqNum < 1 || targetSeqNum > 99) {
        alert('Redni broj mora biti broj između 1 i 99.');
        return;
    }

    try {
        const categories = await fetchCategories(); // fetchCategories sada vraća niz kategorija kao brojeve za seq_num
        
        // Poredimo parsed int sa parsed int
        const category = categories.find(cat => cat.sequence_number === targetSeqNum);

        if (category) {
            document.getElementById('priority').value = category.priority;
            document.getElementById('rule').value = category.rule;
            document.getElementById('response').value = category.response;
            document.getElementById('tags').value = category.tags.join(', ');
            alert(`Podaci kategorije sa rednim brojem ${targetSeqNum} uspešno popunjeni za izmenu!`);
        } else {
            alert(`Kategorija sa rednim brojem ${targetSeqNum} nije pronađena.`);
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
            const res = await fetch('https://botanica.ngrok.app/categories', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_user_id: currentUserId,
                    sequence_number: parseInt(seqNum, 10) // Osiguraj da je broj
                })
            });
            const data = await res.json();
            alert(data.message);
            if (data.status === 'success') {
                await fetchCategories(); // Ponovo dohvati i prikaži kategorije nakon brisanja
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
            await fetchUserSettings(); // Ponovo dohvati i prikaži podešavanja nakon uspešnog čuvanja
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
        displayUserSettings({}); // Prikazuje praznu tabelu
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
            const settings = data.user_settings;
            // Popunjavanje forme
            document.getElementById('discord-token').value = settings.discord_token || '';
            document.getElementById('is-checkbox').checked = settings.is_checkbox_checked || false;
            document.getElementById('general-response').value = settings.general_response || '';
            document.getElementById('user-rule').value = settings.user_rule || '';
            document.getElementById('user-client-email').value = settings.client_email || '';

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
        displayUserSettings({});
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

// Ove funkcije su definisane u `index.html` i `scriptd.js` ih poziva:
// function displayUserSettings(settings) { ... }
// function displayCategories(categories) { ... }
// function editCategory(category) { ... } // Poziva se kada se klikne na dugme "izmeni" u tabeli
// function deleteCategory(seqNum) { ... } // Ova funkcija će pozvati deleteCategoryRequest iz scriptd.js


// Inicijalizacija Google API klijenta za `gapi.auth2` ako se koristi.
// Ovo je uglavnom potrebno za naprednije scenarije ili za `gapi.auth2.signOut()`.
// Za GSI (Google Sign-In) primarnu prijavu, ova sekcija je manje kritična.
function initClient() {
    if (typeof gapi !== 'undefined' && gapi.client && gapi.auth2) {
        gapi.client.init({
            clientId: '252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com',
            scope: 'email profile'
        }).then(() => {
            console.log('Google API client initialized for gapi.auth2.');
        }).catch(error => {
            console.error('Greška pri inicijalizaciji Google API klijenta (gapi.auth2):', error);
        });
    } else {
        console.warn('Google API client or auth2 not available for initClient. Skipping.');
    }
}

// Učitavanje Google API klijenta.
// Proverite da li je `gapi` objekat dostupan pre nego što pokušate da ga učitate.
if (typeof gapi !== 'undefined') {
    gapi.load('client:auth2', initClient);
} else {
    console.warn('GAPI library not loaded, skipping gapi.load for initClient.');
}
