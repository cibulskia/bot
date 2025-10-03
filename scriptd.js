let currentUserId = null;
let currentUserEmail = null;

// Funkcija koja se poziva nakon Google prijave
function handleCredentialResponse(response) {
    // Slanje kredencijala serveru radi validacije i dobijanja user_id
    fetch('https://botanica.ngrok.app/oauth_callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            // Ako je prijava uspešna, čuvamo ID i email korisnika
            currentUserId = data.user_id;
            currentUserEmail = data.user_email;
            // Prikazujemo email i glavnu sekciju, sakrivamo sekciju za prijavu
            document.getElementById('user-email').textContent = currentUserEmail;
            document.getElementById('main-section').style.display = 'block';
            document.getElementById('login-section').style.display = 'none';
        } else {
            alert(data.message); // Prikazujemo poruku o grešci
        }
    })
    .catch(error => console.error('Greška pri obradi prijave:', error));
}

// Funkcija za čuvanje kategorije
function saveCategory() {
    // Dohvatanje vrednosti iz input polja
    const seq = parseInt(document.getElementById('seq-num').value);
    const prio = parseInt(document.getElementById('priority').value);
    const rule = document.getElementById('rule').value;
    const resp = document.getElementById('response').value;
    // Parsiranje tagova iz stringa u niz
    const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t=>t);

    // Slanje podataka serveru za čuvanje kategorije
    fetch('https://botanica.ngrok.app/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            google_user_id: currentUserId,
            client_email: currentUserEmail,
            sequence_number: seq,
            priority: prio,
            rule: rule,
            response: resp,
            tags: tags
        })
    })
    .then(res => res.json())
    .then(data => alert(data.message)) // Prikazujemo poruku servera
    .catch(error => console.error('Greška pri čuvanju kategorije:', error));
}

// Funkcija za dohvatanje kategorija
function fetchCategories() {
    // Slanje zahteva serveru za dohvatanje kategorija za trenutnog korisnika
    fetch('https://botanica.ngrok.app/get_categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_user_id: currentUserId })
    })
    .then(res => res.json())
    .then(data => {
        // Prikaz kategorija u formatiranom JSON-u
        document.getElementById('categories-output').textContent = JSON.stringify(data.categories, null, 2);
    })
    .catch(error => console.error('Greška pri dohvatanju kategorija:', error));
}

// Funkcija za čuvanje korisničkih podešavanja
function saveUserSettings() {
    // Dohvatanje vrednosti iz input polja i checkboxa
    const discord = document.getElementById('discord-token').value;
    const checkbox = document.getElementById('is-checkbox').checked;
    const genResp = document.getElementById('general-response').value;
    // Ako nije izabrano pravilo, postavljamo na null
    const userRule = document.getElementById('user-rule').value || null;
    // Ako nije unet email klijenta, postavljamo na null
    const email = document.getElementById('user-client-email').value || null;

    // Slanje podataka serveru za čuvanje korisničkih podešavanja
    fetch('https://botanica.ngrok.app/user_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            google_user_id: currentUserId,
            discord_token: discord,
            is_checkbox_checked: checkbox,
            general_response: genResp,
            user_rule: userRule,
            client_email: email
        })
    })
    .then(res => res.json())
    .then(data => alert(data.message)) // Prikazujemo poruku servera
    .catch(error => console.error('Greška pri čuvanju podešavanja:', error));
}

// Funkcija za dohvatanje korisničkih podešavanja
function fetchUserSettings() {
    // Slanje zahteva serveru za dohvatanje podešavanja za trenutnog korisnika
    fetch('https://botanica.ngrok.app/get_user_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_user_id: currentUserId })
    })
    .then(res => res.json())
    .then(data => {
        // Prikaz podešavanja u formatiranom JSON-u
        document.getElementById('user-settings-output').textContent = JSON.stringify(data.user_settings, null, 2);
        // Popunjavanje forme sa dobijenim podacima
        if (data.user_settings) {
            document.getElementById('discord-token').value = data.user_settings.discord_token || '';
            document.getElementById('is-checkbox').checked = data.user_settings.is_checkbox_checked || false;
            document.getElementById('general-response').value = data.user_settings.general_response || '';
            document.getElementById('user-rule').value = data.user_settings.user_rule || '';
            document.getElementById('user-client-email').value = data.user_settings.client_email || '';
        }
    })
    .catch(error => console.error('Greška pri dohvatanju korisničkih podešavanja:', error));
}
