(async function main() {
  const root = document.getElementById('app');

  root.innerHTML = `
    <div class="card">
      <h1>Page catalogue (exemple)</h1>
      <p>Ce package est un modèle pour créer un dépôt custom.</p>
      <p class="small">Réseau sortant: activé (allowOutgoing=true)</p>
      <button id="btn">Tester un appel HTTP</button>
      <pre id="out" class="small"></pre>
    </div>
  `;

  const out = document.getElementById('out');
  document.getElementById('btn').addEventListener('click', async () => {
    out.textContent = 'Requête en cours…';
    try {
      const res = await fetch('https://api.github.com/rate_limit', { method: 'GET' });
      out.textContent = `HTTP ${res.status}`;
    } catch (e) {
      out.textContent = 'Erreur: ' + (e && e.message ? e.message : String(e));
    }
  });
})();
