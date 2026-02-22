import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [tab, setTab] = useState('profil');
  const [profile, setProfile] = useState({ age: 30, income: 3000, savings: 10000, riskTolerance: 'moderate', goals: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await storage.getData('profile');
      if (res) setProfile(res);
    } catch(e) {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    await storage.setData('profile', profile);
    alert('Profil sauvegardé !');
  };

  const riskScore = profile.riskTolerance === 'aggressive' ? 85 : profile.riskTolerance === 'moderate' ? 55 : 25;
  const healthScore = Math.min(100, Math.round((profile.savings / (profile.income * 6)) * 100));
  const allocation = profile.riskTolerance === 'aggressive'
    ? { actions: 70, obligations: 15, crypto: 10, cash: 5 }
    : profile.riskTolerance === 'moderate'
    ? { actions: 50, obligations: 30, crypto: 5, cash: 15 }
    : { actions: 20, obligations: 50, crypto: 0, cash: 30 };
  const allocColors = { actions: '#6c5ce7', obligations: '#00d2d3', crypto: '#feca57', cash: '#ff6b6b' };

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header"><h1>💹 FinVest</h1></div>
      <div className="tabs">
        {['profil','analyse','allocation','projection'].map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
      </div>
      {tab === 'profil' && (
        <div className="card">
          <h3 style={{marginBottom:16}}>Profil investisseur</h3>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Âge</label><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} /></div>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Revenu mensuel (€)</label><input type="number" value={profile.income} onChange={e => setProfile({...profile, income: +e.target.value})} /></div>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Épargne totale (€)</label><input type="number" value={profile.savings} onChange={e => setProfile({...profile, savings: +e.target.value})} /></div>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Tolérance au risque</label>
              <select value={profile.riskTolerance} onChange={e => setProfile({...profile, riskTolerance: e.target.value})}>
                <option value="conservative">Prudent</option><option value="moderate">Modéré</option><option value="aggressive">Agressif</option>
              </select>
            </div>
          </div>
          <button onClick={saveProfile} style={{marginTop:16}}>💾 Sauvegarder</button>
        </div>
      )}
      {tab === 'analyse' && (
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <div className="card" style={{textAlign:'center'}}>
            <h3>Score de santé financière</h3>
            <p style={{fontSize:64,color: healthScore >= 70 ? 'var(--success)' : healthScore >= 40 ? 'var(--warning)' : 'var(--danger)'}}>{healthScore}%</p>
            <p style={{color:'var(--text2)'}}>{healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Correct' : 'À améliorer'}</p>
          </div>
          <div className="card" style={{textAlign:'center'}}>
            <h3>Profil de risque</h3>
            <p style={{fontSize:64,color:'var(--accent2)'}}>{riskScore}</p>
            <p style={{color:'var(--text2)'}}>{profile.riskTolerance}</p>
          </div>
          <div className="card" style={{gridColumn:'1/-1'}}>
            <h3>Conseils</h3>
            <ul style={{marginTop:12,paddingLeft:20,color:'var(--text2)'}}>
              {healthScore < 70 && <li>Constituez un fonds d'urgence de {(profile.income * 6 - profile.savings).toFixed(0)} € supplémentaires.</li>}
              <li>Diversifiez vos investissements selon votre profil {profile.riskTolerance}.</li>
              <li>Épargnez au moins {Math.round(profile.income * 0.2)} €/mois (20% du revenu).</li>
              {profile.age < 40 && <li>Profitez de votre horizon long terme pour investir en actions.</li>}
            </ul>
          </div>
        </div>
      )}
      {tab === 'allocation' && (
        <div className="card">
          <h3 style={{marginBottom:16}}>Allocation recommandée</h3>
          {Object.entries(allocation).map(([k, v]) => (
            <div key={k} style={{marginBottom:12}}>
              <div className="flex" style={{justifyContent:'space-between',marginBottom:4}}>
                <span style={{textTransform:'capitalize'}}>{k}</span><span>{v}%</span>
              </div>
              <div style={{height:24,background:'var(--surface2)',borderRadius:12,overflow:'hidden'}}>
                <div style={{width:`${v}%`,height:'100%',background:allocColors[k],borderRadius:12,transition:'width .5s'}} />
              </div>
            </div>
          ))}
          <p style={{color:'var(--text2)',marginTop:16}}>Montant total à investir : {profile.savings.toLocaleString()} €</p>
        </div>
      )}
      {tab === 'projection' && (
        <div className="card">
          <h3 style={{marginBottom:16}}>Projections à 10, 20, 30 ans</h3>
          {[10, 20, 30].map(years => {
            const rate = profile.riskTolerance === 'aggressive' ? 0.08 : profile.riskTolerance === 'moderate' ? 0.05 : 0.03;
            const monthly = profile.income * 0.15;
            const future = profile.savings * Math.pow(1 + rate, years) + monthly * 12 * ((Math.pow(1 + rate, years) - 1) / rate);
            return (
              <div key={years} className="flex" style={{justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                <span>{years} ans</span>
                <span style={{color:'var(--success)',fontSize:20,fontWeight:700}}>{Math.round(future).toLocaleString()} €</span>
              </div>
            );
          })}
          <p style={{color:'var(--text2)',marginTop:16,fontSize:12}}>Hypothèse : épargne mensuelle de {Math.round(profile.income * 0.15)} € + rendement {profile.riskTolerance === 'aggressive' ? '8' : profile.riskTolerance === 'moderate' ? '5' : '3'}%/an</p>
        </div>
      )}
    </div>
  );
}