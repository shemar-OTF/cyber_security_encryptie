'use strict';
const $ = (id) => document.getElementById(id);
let mode = 'encrypt';
let resultMode = null;
let busy = false;
let operation = 0;
// Alleen in geheugen, nooit in cookies of browseropslag.
const sessionKeys = new Map();
let importedKey = '';
let activeResultKey = '';

function rememberKey(token, key) {
  sessionKeys.set(token.trim(), key);
}
function keyFor(token) {return sessionKeys.get(token.trim()) || importedKey;}
function updateKeyState() {
  const automatic = sessionKeys.has($('decrypt-text').value.trim());
  $('key-state').textContent = automatic ? 'De juiste sleutel is automatisch beschikbaar in deze sessie.' : importedKey ? 'Sleutelbestand geladen. Je kunt de tekst ontsleutelen.' : 'Nog geen sleutel beschikbaar. Versleutel eerst tekst of open je sleutelbestand.';
}
function download(value, filename) {
  const url = URL.createObjectURL(new Blob([value], {type: 'text/plain;charset=utf-8'}));
  const anchor = document.createElement('a');anchor.href = url;anchor.download = filename;
  document.body.append(anchor);anchor.click();anchor.remove();setTimeout(() => URL.revokeObjectURL(url), 1000);
}


function showStatus(message = '', error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function clearResult() {
  $('empty-result').hidden = false;
  $('text-result').hidden = true;
  $('generated-result').hidden = true;
  $('username-result').hidden = true;
  for (const id of ['result-text', 'generated-username', 'generated-password']) $(id).value = '';
  $('generated-password').type = 'password';
  document.querySelector('[data-reveal="generated-password"]').textContent = 'Toon';
  resultMode = null;
  activeResultKey = '';
  $('key-export').hidden = true;
}
function switchMode(next, preserve = false) {
  if (busy) return;
  mode = next;
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const active = tab.dataset.mode === next;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !active;
  });
  if (!preserve) clearResult();
  updateKeyState();
  showStatus();
}
document.querySelectorAll('[role="tab"]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  tab.addEventListener('keydown', (event) => {
    if (busy) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    switchMode(tabs[next].dataset.mode);
    tabs[next].focus();
  });
});
async function api(path, data) {
  const response = await fetch(`/api/${path}`, {
    method: 'POST', headers: {'Content-Type': 'application/json', 'X-Tekstkluis': '1'},
    body: JSON.stringify(data), cache: 'no-store', credentials: 'omit',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Het verzoek is niet gelukt.');
  return result;
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('form button, [role="tab"], [data-clear], #open-file, #open-key').forEach((button) => {button.disabled = value;});
  document.querySelectorAll('form input, form textarea').forEach((field) => {field.disabled = value;});
  document.querySelector('.tool').setAttribute('aria-busy', String(value));
}
for (const current of ['encrypt', 'decrypt', 'generate', 'username']) {
  $(`${current}-form`).addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const requestId = ++operation;
    clearResult();
    setBusy(true);
    showStatus(current === 'generate' ? 'Wachtwoord maken…' : current === 'username' ? 'Gebruikersnaam bedenken…' : 'Je tekst wordt verwerkt…');
    try {
      let data;
      if (current === 'generate') {
        data = {length: Number($('password-length').value)};
        for (const name of ['lowercase', 'uppercase', 'digits', 'special']) {
          data[name] = $(`include-${name}`).checked;
        }
        if (!['lowercase', 'uppercase', 'digits', 'special'].some((name) => data[name])) {
          throw new Error('Kies minimaal één tekensoort voor je wachtwoord.');
        }
      }
      else if (current === 'username') {
        data = {level: document.querySelector('input[name="username-level"]:checked').value, idea: $('username-idea').value};
      }
      else {
        data = {text: $(`${current}-text`).value};
        if (current === 'decrypt') {
          data.key = keyFor(data.text);
          if (!data.key) throw new Error('Open het bijbehorende sleutelbestand. In deze sessie is nog geen sleutel voor deze tekst beschikbaar.');
        }
      }
      const result = await api(current, data);
      if (requestId !== operation) return;
      $('empty-result').hidden = true;
      if (current === 'generate') {
        $('generated-result').hidden = false;
        $('generated-password').value = result.password;
      } else if (current === 'username') {
        $('username-result').hidden = false;
        $('generated-username').value = result.username;
      } else {
        $('text-result').hidden = false;
        $('result-text').value = result.result;
        activeResultKey = current === 'encrypt' ? result.key : data.key;
        if (current === 'encrypt') rememberKey(result.result, result.key);
        $('key-export').hidden = false;
        $('result-title').textContent = current === 'encrypt' ? 'Je tekst is versleuteld.' : 'Je geheim is weer leesbaar.';
        $('result-description').textContent = current === 'encrypt' ? 'Bewaar zowel de versleutelde tekst als de geheime sleutel, op aparte plekken.' : 'Dit is je oorspronkelijke tekst. Houd rekening met wie kan meekijken.';
        $('download-result').hidden = current !== 'encrypt';
        $('to-decrypt').hidden = current !== 'encrypt';
      }
      resultMode = current;
      showStatus(current === 'generate' ? 'Nieuw wachtwoord aangemaakt.' : current === 'username' ? 'Nieuwe gebruikersnaam bedacht.' : current === 'encrypt' ? 'Gelukt. Je tekst is veilig verpakt.' : 'Gelukt. Je tekst is ontsleuteld.');
    } catch (error) {
      showStatus(error instanceof TypeError ? 'Geen verbinding met de app. Controleer of python3 app.py nog draait.' : error.message, true);
    } finally {setBusy(false);}
  });
}
async function copy(id) {
  const field = $(id);
  if (!field.value) return;
  try {
    await navigator.clipboard.writeText(field.value);
    showStatus('Gekopieerd. Let op: je klembordgeschiedenis kan de tekst bewaren.');
  } catch {
    const masked = field.type === 'password';
    if (masked) field.type = 'text';
    field.focus();field.select();
    if (masked) {field.type = 'password'; showStatus('Kopiëren is geblokkeerd. Toon het wachtwoord en kopieer het handmatig.', true);}
    else showStatus('Kopiëren is geblokkeerd. De tekst is geselecteerd; gebruik Cmd+C of Ctrl+C.', true);
  }
}
$('copy-result').addEventListener('click', () => copy('result-text'));
document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copy(button.dataset.copy)));
document.querySelectorAll('[data-reveal]').forEach((button) => button.addEventListener('click', () => {
  const input = $(button.dataset.reveal);
  input.type = input.type === 'password' ? 'text' : 'password';
  const shown = input.type === 'text';
  button.textContent = shown ? 'Verberg' : 'Toon';
  button.setAttribute('aria-label', shown ? 'Wachtwoord verbergen' : 'Wachtwoord tonen');
}));
const passwordLevels = {
  simple: {label: 'Simpel', length: 16, lowercase: true, uppercase: false, digits: false, special: false},
  medium: {label: 'Matig', length: 20, lowercase: true, uppercase: true, digits: true, special: false},
  hard: {label: 'Moeilijk', length: 24, lowercase: true, uppercase: true, digits: true, special: true},
};
function syncLevel() {
  let selected = '';
  for (const [name, settings] of Object.entries(passwordLevels)) {
    const matches = Number($('password-length').value) === settings.length &&
      ['lowercase', 'uppercase', 'digits', 'special'].every((kind) => $(`include-${kind}`).checked === settings[kind]);
    document.querySelector(`input[name="password-level"][value="${name}"]`).checked = matches;
    if (matches) selected = settings.label;
  }
  $('level-description').textContent = selected ? `${selected} geselecteerd. Je kunt de instellingen hieronder zelf aanpassen.` : 'Eigen instelling: je hebt de lengte of tekensoorten zelf aangepast.';
}
document.querySelectorAll('input[name="password-level"]').forEach((radio) => radio.addEventListener('change', () => {
  if (!radio.checked || busy) return;
  const settings = passwordLevels[radio.value];
  $('password-length').value = settings.length;
  $('length-value').textContent = `${settings.length} tekens`;
  for (const kind of ['lowercase', 'uppercase', 'digits', 'special']) $(`include-${kind}`).checked = settings[kind];
  clearResult();showStatus();syncLevel();
}));
for (const kind of ['lowercase', 'uppercase', 'digits', 'special']) $(`include-${kind}`).addEventListener('change', syncLevel);

function updateCount() {$('byte-count').textContent = `${new TextEncoder().encode($('encrypt-text').value).length.toLocaleString('nl-NL')} / 100.000 bytes`;}
$('encrypt-text').addEventListener('input', updateCount);
$('password-length').addEventListener('input', () => {clearResult();showStatus();$('length-value').textContent = `${$('password-length').value} tekens`;syncLevel();});
document.querySelectorAll('[data-clear]').forEach((button) => button.addEventListener('click', () => {
  if (busy) return;
  const current = button.dataset.clear;
  $(`${current}-form`).reset();
  clearResult();updateCount();$('length-value').textContent = `${$('password-length').value} tekens`;syncLevel();
  document.querySelectorAll('[data-reveal]').forEach((button) => {$(button.dataset.reveal).type = 'password';button.textContent = 'Toon';button.setAttribute('aria-label','Wachtwoord tonen');});
  if (current === 'decrypt') importedKey = '';
  updateKeyState();
  showStatus('Velden gewist. Sleutels van deze sessie blijven beschikbaar tot je het tabblad sluit of vernieuwt.');
}));
$('download-result').addEventListener('click', () => {
  if (resultMode !== 'encrypt') return;
  download($('result-text').value, 'tekstkluis.cipher');
});
$('download-key').addEventListener('click', () => {
  if (activeResultKey) download(activeResultKey, 'tekstkluis.key');
});
$('open-key').addEventListener('click', () => $('key-input').click());
$('key-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file || busy) return;
  clearResult();
  try {
    if (file.size > 100) throw new Error('Dit is geen geldig sleutelbestand. Kies het kleine .key-bestand.');
    const value = (await file.text()).trim();
    if (!/^[A-Za-z0-9_-]{43}=$/.test(value)) throw new Error('Dit is geen geldige AES-256-sleutel van deze app.');
    importedKey = value;
    updateKeyState();
    showStatus('Sleutel geladen. Klik op Ontsleutel tekst.');
  } catch (error) {importedKey = '';updateKeyState();showStatus(error.message, true);}
  event.target.value = '';
});
$('open-file').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file || busy) return;
  clearResult();
  try {
    if (file.size > 140000) throw new Error('Dit bestand is te groot. Kies een .cipher-bestand van maximaal 140.000 bytes.');
    const text = await file.text();
    if (mode !== 'decrypt') return;
    $('decrypt-text').value = text;
    updateKeyState();
    showStatus('Bestand geopend. De sleutel wordt automatisch gebruikt als die beschikbaar is.');
  } catch (error) {showStatus(error.message, true);}
  event.target.value = '';
});
$('to-decrypt').addEventListener('click', () => {
  const token = $('result-text').value;
  switchMode('decrypt');$('decrypt-text').value = token;updateKeyState();$('decrypt-text').focus();
});
$('protect-generated').addEventListener('click', () => {
  const text = `Wachtwoord: ${$('generated-password').value}`;
  switchMode('encrypt');$('encrypt-text').value = text;updateCount();$('encrypt-text').focus();
});
$('protect-username').addEventListener('click', () => {
  const text = `Gebruikersnaam: ${$('generated-username').value}`;
  switchMode('encrypt');$('encrypt-text').value = text;updateCount();$('encrypt-text').focus();
});
// Houd geen verouderd resultaat zichtbaar als de bijbehorende invoer wijzigt.
document.querySelectorAll('form input:not([type="range"]), form textarea').forEach((field) => field.addEventListener('input', () => {if (!busy) {clearResult();showStatus();}}));

$('decrypt-text').addEventListener('input', updateKeyState);
