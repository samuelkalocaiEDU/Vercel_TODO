<script>
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { api } from '$lib/api';

/** @type {{id:string;name:string;email:string}|null} */
let profil = $state(null);
/** @type {Array<{id:string;title:string;priority:'normal'|'important';completed:boolean}>} */
let polozky = $state([]);

let nacitani = $state(true);
let akceProbiha = $state(false);
let chyba = $state('');
let zprava = $state('');

let novyUkol = $state('');
/** @type {'normal'|'important'} */
let novaPriorita = $state('normal');
/** @type {'aktivni'|'hotovo'} */
let zalozka = $state('aktivni');
let hledani = $state('');

let profilJmeno = $state('');
let hesloAktualni = $state('');
let hesloNove = $state('');
let hesloPotvrzeni = $state('');
let ukladaProfil = $state(false);
let ukladaHeslo = $state(false);
let menuOtevrene = $state(false);
/** @type {HTMLInputElement | null} */
let novyUkolInput = null;

async function nactiData() {
chyba = '';
try {
const [profileData, todos] = await Promise.all([api.profile(), api.getTodos()]);
profil = profileData;
profilJmeno = profileData.name || '';
polozky = todos;
} catch {
goto('/login');
} finally {
nacitani = false;
}
}

onMount(async () => {
await nactiData();
});

function fokusNovyUkol() {
novyUkolInput?.focus();
}

/** @param {{title:string;completed:boolean;priority:'normal'|'important'}} polozka */
function jeViditelna(polozka) {
if (zalozka === 'aktivni' && polozka.completed) return false;
if (zalozka === 'hotovo' && !polozka.completed) return false;

const dotaz = hledani.trim().toLowerCase();
if (!dotaz) return true;

return polozka.title.toLowerCase().includes(dotaz);
}

function filtrovanePolozky() {
return polozky.filter(jeViditelna);
}

function pocetAktivnich() {
return polozky.filter((polozka) => !polozka.completed).length;
}

function pocetHotovych() {
return polozky.filter((polozka) => polozka.completed).length;
}

function pocetFiltru() {
return filtrovanePolozky().length;
}

/** @param {SubmitEvent} event */
async function pridejUkol(event) {
event.preventDefault();
const text = novyUkol.trim();
if (!text || akceProbiha) return;

akceProbiha = true;
chyba = '';
zprava = '';
try {
const vytvoreny = await api.createTodo(text, novaPriorita);
polozky = [vytvoreny, ...polozky];
novyUkol = '';
novaPriorita = 'normal';
} catch (error) {
chyba = error instanceof Error ? error.message : 'Nepodařilo se přidat poznámku';
} finally {
akceProbiha = false;
}
}

/** @param {string} id @param {boolean} completed */
async function prepniHotovo(id, completed) {
if (akceProbiha) return;
akceProbiha = true;
chyba = '';
try {
const aktualizovany = await api.updateTodo(id, { completed: !completed });
polozky = polozky.map((polozka) => (polozka.id === id ? aktualizovany : polozka));
} catch (error) {
chyba = error instanceof Error ? error.message : 'Nepodařilo se změnit stav hotovo';
} finally {
akceProbiha = false;
}
}

/** @param {string} id @param {'normal'|'important'} priority */
async function prepniPrioritu(id, priority) {
if (akceProbiha) return;
akceProbiha = true;
chyba = '';
try {
const nova = priority === 'important' ? 'normal' : 'important';
const aktualizovany = await api.updateTodo(id, { priority: nova });
polozky = polozky.map((polozka) => (polozka.id === id ? aktualizovany : polozka));
} catch (error) {
chyba = error instanceof Error ? error.message : 'Nepodařilo se změnit prioritu';
} finally {
akceProbiha = false;
}
}

/** @param {string} id */
async function smazUkol(id) {
if (akceProbiha) return;
akceProbiha = true;
chyba = '';
try {
await api.deleteTodo(id);
polozky = polozky.filter((polozka) => polozka.id !== id);
} catch (error) {
chyba = error instanceof Error ? error.message : 'Nepodařilo se smazat poznámku';
} finally {
akceProbiha = false;
}
}

/** @param {SubmitEvent} event */
async function ulozJmeno(event) {
event.preventDefault();
if (!profilJmeno.trim() || ukladaProfil) return;

ukladaProfil = true;
chyba = '';
zprava = '';
try {
const aktualizovany = await api.updateProfile({ name: profilJmeno.trim() });
profil = aktualizovany;
profilJmeno = aktualizovany.name || '';
zprava = 'Jméno profilu bylo uloženo.';
} catch (error) {
chyba = error instanceof Error ? error.message : 'Nepodařilo se uložit jméno';
} finally {
ukladaProfil = false;
}
}

/** @param {SubmitEvent} event */
async function zmenHeslo(event) {
event.preventDefault();
if (ukladaHeslo) return;

if (hesloNove.length < 8) {
chyba = 'Nové heslo musí mít alespoň 8 znaků.';
return;
}
if (hesloNove !== hesloPotvrzeni) {
chyba = 'Nové heslo a potvrzení se neshodují.';
return;
}

ukladaHeslo = true;
chyba = '';
zprava = '';
try {
await api.updatePassword({ current_password: hesloAktualni, new_password: hesloNove });
hesloAktualni = '';
hesloNove = '';
hesloPotvrzeni = '';
zprava = 'Heslo bylo změněno.';
} catch (error) {
chyba = error instanceof Error ? error.message : 'Nepodařilo se změnit heslo';
} finally {
ukladaHeslo = false;
}
}

async function odhlasit() {
try {
await api.logout();
} finally {
goto('/login');
}
}
</script>

<svelte:head>
<title>Dashboard | Notes</title>
</svelte:head>

<div class="dashboard-shell {menuOtevrene ? 'menu-open' : 'menu-closed'}">
<div class="dashboard-glow amber"></div>
<div class="dashboard-glow purple"></div>

<button
type="button"
class="menu-toggle"
onclick={() => (menuOtevrene = !menuOtevrene)}
aria-label={menuOtevrene ? 'Zavřít menu' : 'Otevřít menu'}
aria-expanded={menuOtevrene}
>
<span></span>
<span></span>
<span></span>
</button>

{#if menuOtevrene}
<button type="button" class="sidebar-overlay" onclick={() => (menuOtevrene = false)} aria-label="Zavřít menu"></button>
{/if}

<aside class="sidebar" aria-hidden={!menuOtevrene}>
<button type="button" class="profile-chip" onclick={fokusNovyUkol}>
<div class="avatar">{profil?.name ? profil.name.slice(0, 1).toUpperCase() : 'U'}</div>
<div class="profile-copy">
<strong>{profil?.name || 'Uživatel'}</strong>
<span>{profil?.email || 'E-mail'}</span>
</div>
<span class="chevron">⌄</span>
</button>

<button type="button" class="add-task" onclick={fokusNovyUkol}>+ Přidat poznamku</button>

<label class="search-field">
<span>Search</span>
<input bind:value={hledani} type="search" placeholder="Hledat poznámku..." />
</label>

<div class="quick-tabs">
<button type="button" class="tab {zalozka === 'aktivni' ? 'active' : ''}" onclick={() => (zalozka = 'aktivni')}>
Aktivní <strong>{pocetAktivnich()}</strong>
</button>
<button type="button" class="tab {zalozka === 'hotovo' ? 'active' : ''}" onclick={() => (zalozka = 'hotovo')}>
Hotovo <strong>{pocetHotovych()}</strong>
</button>
</div>

<section class="menu-card">
<div class="menu-head">
<p>Menu</p>
<h2>Profil</h2>
</div>

<form class="stack-form" onsubmit={ulozJmeno}>
<label>
<span>Jméno</span>
<input bind:value={profilJmeno} type="text" maxlength="150" required />
</label>
<button type="submit" disabled={ukladaProfil}>{ukladaProfil ? 'Ukládám...' : 'Uložit jméno'}</button>
</form>
</section>

<section class="menu-card">
<div class="menu-head">
<p>Menu</p>
<h2>Změna hesla</h2>
</div>

<form class="stack-form" onsubmit={zmenHeslo}>
<label>
<span>Současné heslo</span>
<input bind:value={hesloAktualni} type="password" required />
</label>
<label>
<span>Nové heslo</span>
<input bind:value={hesloNove} type="password" minlength="8" required />
</label>
<label>
<span>Potvrzení nového hesla</span>
<input bind:value={hesloPotvrzeni} type="password" minlength="8" required />
</label>
<button type="submit" disabled={ukladaHeslo}>{ukladaHeslo ? 'Měním...' : 'Změnit heslo'}</button>
</form>
</section>

<section class="menu-card menu-actions">
<div class="menu-head">
<p>Menu</p>
<h2>Účet</h2>
</div>
<button type="button" class="menu-logout" onclick={odhlasit}>Odhlásit</button>
</section>
</aside>

<main class="workspace">
<div class="workspace-head">
<div>
<p class="eyebrow">Notes management</p>
<h1>Moje poznámky</h1>
<p class="subtitle">{zalozka === 'aktivni' ? 'Aktivní' : 'Hotovo'} · {pocetFiltru()} položek</p>
</div>
</div>

<section class="composer-card">
<form class="composer" onsubmit={pridejUkol}>
<input bind:this={novyUkolInput} bind:value={novyUkol} type="text" maxlength="200" placeholder="Napiš novou poznámku..." required />
<select bind:value={novaPriorita} aria-label="Priorita nové poznámky">
<option value="normal">Normal</option>
<option value="important">Important</option>
</select>
<button type="submit" disabled={akceProbiha}>Přidat</button>
</form>
</section>

{#if chyba}<p class="message error">{chyba}</p>{/if}
{#if zprava}<p class="message success">{zprava}</p>{/if}

{#if nacitani}
<section class="empty-card"><p>Načítám dashboard...</p></section>
{:else if filtrovanePolozky().length === 0}
<section class="empty-card">
<h2>Žádné poznámky</h2>
<p>Vyzkoušej jiný filtr nebo přidej novou poznámku.</p>
</section>
{:else}
<section class="cards-grid">
{#each filtrovanePolozky() as polozka (polozka.id)}
<article class="task-card {polozka.completed ? 'done' : ''} {polozka.priority === 'important' ? 'important' : ''}">
<button type="button" class="trash" onclick={() => smazUkol(polozka.id)}>🗑️</button>
<p class="task-title">{polozka.title}</p>
<div class="task-actions">
<button type="button" class="badge {polozka.priority === 'important' ? 'important' : ''}" onclick={() => prepniPrioritu(polozka.id, polozka.priority)}>
{polozka.priority === 'important' ? 'IMPORTANT' : 'NORMAL'}
</button>
<button type="button" class="badge done" onclick={() => prepniHotovo(polozka.id, polozka.completed)}>
{polozka.completed ? 'Vrátit na aktivní' : 'Označit jako hotovo'}
</button>
</div>
</article>
{/each}
</section>
{/if}
</main>
</div>

