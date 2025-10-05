/**
 * auth.js - Handles Google One Tap authentication, sign-in, and sign-out logic.
 * Manages the Google token and updates UI elements related to authentication status.
 */

const CLIENT_ID = "252373158568-4up41b7jo8ik6cu8c1pl3mlvvck2sq2t.apps.googleusercontent.com"; // Your Google Client ID
const API_BASE = "https://botanica.ngrok.app"; // Backend API endpoint

let googleToken = null; // Stores the JWT token received from Google
let loggedInUserEmail = null; // Stores the email of the logged-in user

const loginStatusElement = document.getElementById("loginStatus");
const signOutButton = document.getElementById("signOutBtn");
const disconnectButton = document.getElementById("disconnectBtn");
const loginIndicator = document.getElementById("loginIndicator");
const loggedInEmailElement = document.getElementById("loggedInEmail");

/**
 * Google One Tap callback function.
 * Called when Google returns a credential response.
 * @param {Object} response - The credential response from Google.
 */
window.handleCredentialResponse = (response) => {
  if (response && response.credential) {
    googleToken = response.credential;
    console.log("Google token received.");

    // Decode JWT to get user info (for display purposes)
    const payload = JSON.parse(atob(googleToken.split('.')[1]));
    loggedInUserEmail = payload.email;

    updateLoginUI(true); // User is logged in
    // Automatically try to load category settings after successful login
    document.getElementById("btnLoadCategory").click();
  } else {
    console.error("Google login failed: No credential received.");
    updateLoginUI(false); // User is not logged in
  }
};

/**
 * Updates the UI based on the user's login status.
 * @param {boolean} isLoggedIn - True if the user is logged in, false otherwise.
 */
function updateLoginUI(isLoggedIn) {
  if (isLoggedIn) {
    loginStatusElement.textContent = "Uspešno prijavljen.";
    loginIndicator.classList.add("online");
    signOutButton.style.display = "inline-flex";
    disconnectButton.style.display = "inline-flex";
    loggedInEmailElement.textContent = loggedInUserEmail;
    loggedInEmailElement.style.display = "block";
  } else {
    loginStatusElement.textContent = "Odjavljen.";
    loginIndicator.classList.remove("online");
    signOutButton.style.display = "none";
    disconnectButton.style.display = "none";
    loggedInEmailElement.textContent = "";
    loggedInEmailElement.style.display = "none";
    googleToken = null; // Clear token on logout
    loggedInUserEmail = null;
  }
}

/**
 * Handles the sign-out process.
 * Clears the Google token and updates the UI.
 */
signOutButton.addEventListener("click", () => {
  // Potentially revoke token on Google's side if needed for full logout
  // google.accounts.id.disableAutoSelect(); // Disables auto-selection for next login
  googleToken = null;
  loggedInUserEmail = null;
  updateLoginUI(false);
  alert("Uspešno ste se odjavili.");
  // Clear all form fields related to profile and jobs
  setCategoryFields({checkboxes:[true,false], dropdown:"", texts:["","","",""]});
  document.getElementById("subcatList").innerHTML = `<p class="empty-state">Nema aktivnih ponuda poslova.</p>`;
  setSubcatFields({name:"", checkboxes:[], texts:["","","",""]});
  document.getElementById("subcatEditorTitle").textContent = "Nije izabrana ponuda";
});

/**
 * Handles the account disconnection (deletion of user data on the backend).
 * This should ideally trigger a backend call to delete user-specific data.
 */
disconnectButton.addEventListener("click", async () => {
  if (!confirm("Da li ste sigurni da želite da obrišete sve vaše podatke sa platforme? Ova akcija je nepovratna!")) {
    return;
  }

  try {
    const status = document.getElementById("catStatus");
    status.textContent = "Brišem nalog...";
    const r = await apiFetch("/category/delete_all", "POST", {}); // Reusing delete_all from original logic
    if (!r.ok) {
      status.textContent = "Greška pri brisanju naloga: " + (r.json.error || JSON.stringify(r.json));
      throw new Error("Backend account deletion failed.");
    }
    status.textContent = "Nalog uspešno obrisan.";
    alert("Vaš nalog i svi podaci su uspešno obrisani. Bićete odjavljeni.");
    signOutButton.click(); // Perform a standard sign-out after backend deletion
  } catch (e) {
    console.error("Greška pri brisanju naloga:", e);
    document.getElementById("catStatus").textContent = "Greška pri brisanju naloga.";
  }
});


/**
 * Helper function to make authenticated API requests.
 * @param {string} path - The API endpoint path.
 * @param {string} method - The HTTP method (GET, POST, DELETE, etc.).
 * @param {Object|null} body - The request body for POST/PUT requests.
 * @returns {Promise<Object>} - The API response (ok, status, json).
 * @throws {Error} - If no Google token is available or if the fetch fails.
 */
async function apiFetch(path, method="GET", body=null) {
  if (!googleToken) {
    // Attempt to silently refresh token or prompt login if necessary
    // For simplicity, we'll just throw an error here, but a real app might re-authenticate.
    throw new Error("Nema Google tokena. Molimo prijavite se ponovo.");
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

    // Check for token expiration or invalidity (e.g., 401 Unauthorized)
    if (res.status === 401) {
        console.warn("API returned 401 Unauthorized. Token might be expired or invalid.");
        updateLoginUI(false); // Force logout on UI
        alert("Vaša sesija je istekla ili token nije validan. Molimo prijavite se ponovo.");
        throw new Error("Unauthorized: Token expired or invalid.");
    }

    const txt = await res.text();
    try {
      const json = JSON.parse(txt);
      return { ok: res.ok, status: res.status, json };
    } catch (e) {
      // If response is not JSON, return raw text in json.raw
      return { ok: res.ok, status: res.status, json: { raw: txt, message: "Response was not JSON." } };
    }
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error; // Re-throw to be caught by the calling function
  }
}

// Initial UI setup on page load
document.addEventListener("DOMContentLoaded", () => {
    updateLoginUI(false); // Ensure initial state is "logged out"
    // Trigger Google One Tap UI if user is not logged in
    // The GSI client automatically handles this with data-auto_select="true"
});
