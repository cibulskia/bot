let currentUserId = null;
let currentUserEmail = null;

// Bazni URL za API pozive
const API_BASE_URL = 'https://botanica.ngrok.app';

// Funkcija koja se poziva nakon Google prijave
window.handleCredentialResponse = async (response) => {
    try {
        const res = await fetch(`${API_BASE_URL}/oauth_callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();

        if (data.status === 'success') {
            currentUserId = data.user_id;
            currentUserEmail = data.user_email;

            document.getElementById('user-email').textContent = currentUserEmail;
            document.getElementById('main-section').style.display = 'flex';
            document.getElementById('login-section').style.display = 'none';

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
    if (typeof gapi !== 'undefined' && gapi.auth2 && gapi.auth2.getAuthInstance()) {
        const auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut().then(() => {
            currentUserId = null;
            currentUserEmail = null;
            document.getElementById('user-email').textContent = '';
            document.getElementById('main-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'flex';
            resetCategoryForm();
            displayCategories([]);
            displayUserSettings({});
        }).catch(error => {
            console.error('Greška pri Google odjavi:', error);
            alert('Došlo je do greške prilikom odjave. Molimo pokušajte ponovo.');
        });
    } else {
        currentUserId = null;
        currentUserEmail = null;
        document.getElementById('user-email').textContent = '';
        document.getElementById('main-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'flex';
        resetCategoryForm();
        displayCategories([]);
        displayUserSettings({});
    }
}

// Funkcija za čuvanje kategorije (POST za kreiranje/ažuriranje)
async function saveCategory() {
    if (!currentUserId) {
        alert('Morate biti prijavljeni da biste sačuvali kategoriju.');
        return;
    }

    const seqNumInput = document.getElementById('seq-num').value;
    const priorityInput = document.getElementById('priority').value;

    const parsedSeqNum = parseInt(seqNumInput, 10);
    const parsedPriority = parseInt(priorityInput, 10);

    if (isNaN(parsedSeqNum) || parsedSeqNum < 1 || parsedSeqNum > 99) {
        alert('Redni broj mora biti broj između 1 i 99.');
        return;
    }
    if (isNaN(parsedPriority) || parsedPriority < 0 || parsedPriority > 9) {
        alert('Prioritet mora biti broj između 0 i 9.');
        return;
    }

    const categoryData = {
        google_user_id: currentUserId,
        client_email: currentUserEmail,
        sequence_number: parsedSeqNum,
        priority: parsedPriority,
        rule: document.getElementById('rule').value,
        response: document.getElementById('response').value,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        const data = await res.json();
        alert(data.message);
        if (data.status === 'success') {
            await fetchCategories();
            resetCategoryForm();
        }
    } catch (error) {
        console.error('Greška pri čuvanju kategorije:', error);
        alert('Došlo je do greške prilikom čuvanja kategorije.');
    }
}

// Funkcija za dohvatanje kategorija
async function fetchCategories() {
    if (!currentUserId) {
        displayCategories([]);
        return [];
    }
    try {
        const res = await fetch(`${API_BASE_URL}/get_categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_user_id: currentUserId })
        });
        const data = await res.json();
        if (data.status === 'success' && data.categories) {
            const categories = data.categories.map(cat => ({
                ...cat,
                sequence_number: parseInt(cat.sequence_number, 10)
            }));
            displayCategories(categories);
            return categories;
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

// Funkcija za popunjavanje forme kategorije
async function populateCategoryFields() {
    const seqNumInput = document.getElementById('seq-num').value;
    if (!seqNumInput) {
        alert('Molimo unesite redni broj (Sequence Number) za popunjavanje.');
        return;
    }
    const targetSeqNum = parseInt(seqNumInput, 10);

    if (isNaN(targetSeqNum) || targetSeqNum < 1 || targetSeqNum > 99) {
        alert('Redni broj mora biti broj između 1 i 99.');
        return;
    }

    try {
        const categories = await fetchCategories();
        const category = categories.find(cat => cat.sequence_number === targetSeqNum);

        if (category) {
            document.getElementById('priority').value = category.priority;
            document.getElementById('rule').value = category.rule;
            document.getElementById('response').value = category.response;
            document.getElementById('tags').value = Array.isArray(category.tags) ? category.tags.join(', ') : category.tags || '';
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
            const res = await fetch(`${API_BASE_URL}/categories`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_user_id: currentUserId,
                    sequence_number: parseInt(seqNum, 10)
                })
            });
            const data = await res.json();
            alert(data.message);
            if (data.status === 'success') {
                await fetchCategories();
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

    const discordInputValue = document.getElementById('discord-token').value;
    const settingsData = {
        google_user_id: currentUserId,
        // Samo šalji token ako nije ****** ili prazan string
        ...(discordInputValue && discordInputValue !== '******' ? { discord_token: discordInputValue } : {}),
        is_checkbox_checked: document.getElementById('is-checkbox').checked,
        general_response: document.getElementById('general-response').value || null,
        user_rule: document.getElementById('user-rule').value || null,
        client_email: document.getElementById('user-client-email').value || null
    };

    try {
        const res = await fetch(`${API_BASE_URL}/user_settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });
        const data = await res.json();
        alert(data.message);
        if (data.status === 'success') {
            await fetchUserSettings();
        }
    } catch (error) {
        console.error('Greška pri čuvanju podešavanja:', error);
        alert('Došlo je do greške prilikom čuvanja podešavanja.');
    }
}

// Funkcija za dohvatanje korisničkih podešavanja
async function fetchUserSettings() {
    if (!currentUserId) {
        displayUserSettings({});
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/get_user_settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_user_id: currentUserId })
        });
        const data = await res.json();

        if (data.status === 'success' && data.user_settings) {
            const settings = data.user_settings;
            document.getElementById('discord-token').value = settings.discord_token_set ? '******' : '';
            document.getElementById('is-checkbox').checked = settings.is_checkbox_checked || false;
            document.getElementById('general-response').value = settings.general_response || '';
            document.getElementById('user-rule').value = settings.user_rule || '';
            document.getElementById('user-client-email').value = settings.client_email || '';

            displayUserSettings(settings);
        } else {
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
    document.getElementById('rule').value = 'A';
    document.getElementById('response').value = '';
    document.getElementById('tags').value = '';
}

// Funkcije za manipulaciju UI-jem
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    const userSettingsTab = document.getElementById('user-settings-tab');
    if (userSettingsTab) userSettingsTab.style.display = 'block';
    const firstNavItem = document.querySelector('.sidebar-nav .nav-item');
    if (firstNavItem) firstNavItem.classList.add('active');
});

function showSection(sectionId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.style.display = 'block';

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
    const activeNavItem = document.querySelector(`.nav-item[onclick="showSection('${sectionId}')"]`);
    if (activeNavItem) activeNavItem.classList.add('active');
}

function displayUserSettings(data) {
    const tbody = document.getElementById('user-settings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data && Object.keys(data).length > 0) {
        const row = tbody.insertRow();
        row.insertCell().textContent = data.discord_token_set ? 'Postavljen' : 'Nije postavljen';
        row.insertCell().textContent = data.is_checkbox_checked ? 'Da' : 'Ne';
        row.insertCell().textContent = data.general_response || 'N/A';
        row.insertCell().textContent = data.user_rule || 'N/A';
        row.insertCell().textContent = data.client_email || 'N/A';
    } else {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.className = 'text-center';
        cell.textContent = 'Nema podataka za prikaz.';
    }
}

function displayCategories(data) {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(category => {
            const row = tbody.insertRow();
            row.insertCell().textContent = category.sequence_number;
            row.insertCell().textContent = category.priority;
            row.insertCell().textContent = category.rule;
            row.insertCell().textContent = category.response;
            row.insertCell().textContent = Array.isArray(category.tags) ? category.tags.join(', ') : category.tags || '';

            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-action btn-edit';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Izmeni';
            editBtn.onclick = () => editCategory(category);
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-action btn-delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Obriši';
            deleteBtn.onclick = () => deleteCategoryRequest(category.sequence_number);
            actionsCell.appendChild(deleteBtn);
        });
    } else {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.className = 'text-center';
        cell.textContent = 'Nema podataka za prikaz.';
    }
}

function editCategory(category) {
    document.getElementById('seq-num').value = category.sequence_number;
    document.getElementById('priority').value = category.priority;
    document.getElementById('rule').value = category.rule;
    document.getElementById('response').value = category.response;
    document.getElementById('tags').value = Array.isArray(category.tags) ? category.tags.join(', ') : category.tags || '';
    alert(`Učitani podaci za izmenu kategorije sa rednim brojem: ${category.sequence_number}`);
}

// Google API client load i inicijalizacija
function initClient() {
    if (typeof gapi !== 'undefined' && gapi.client && gapi.auth2) {
        gapi.client.init({
            clientId: '252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com',
            scope: 'email profile openid'
        }).then(() => {
            const authInstance = gapi.auth2.getAuthInstance();
            if (authInstance) {
                authInstance.isSignedIn.listen(updateSignInStatus);
                updateSignInStatus(authInstance.isSignedIn.get());
            }
        }).catch(error => console.error('Greška pri inicijalizaciji Google API klijenta:', error));
    }
}

function updateSignInStatus(isSignedIn) {
    if (isSignedIn) {
        const profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
        currentUserId = profile.getId();
        currentUserEmail = profile.getEmail();

        document.getElementById('user-email').textContent = currentUserEmail;
        document.getElementById('main-section').style.display = 'flex';
        document.getElementById('login-section').style.display = 'none';

        fetchUserSettings();
        fetchCategories();
    } else {
        currentUserId = null;
        currentUserEmail = null;
        document.getElementById('user-email').textContent = '';
        document.getElementById('main-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'flex';
        resetCategoryForm();
        displayCategories([]);
        displayUserSettings({});
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof gapi !== 'undefined') {
        gapi.load('client:auth2', initClient);
    }
});
