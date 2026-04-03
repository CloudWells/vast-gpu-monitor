import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Play, Square, Activity, Cpu, ShieldCheck, Globe, Trash2, Plus, Lock, LogOut } from 'lucide-react';

const API_BASE = 'http://' + window.location.hostname + ':8001';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [results, setResults] = useState<any>({});
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchConfig();
      const interval = setInterval(fetchResults, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const api = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/login`, { username, password });
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get('/config');
      setConfig(res.data);
    } catch (err) { handleLogout(); }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get('/results');
      setResults(res.data);
    } catch (err) {}
  };

  const saveConfig = async (newConfig = config) => {
    setIsSaving(true);
    try {
      await api.post('/config', newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const addRule = () => {
    const newRule = { id: Math.random().toString(36).substr(2, 9), gpu_name: 'B200', num_gpus: 1, max_price: 8.0 };
    const newConfig = { ...config, rules: [...config.rules, newRule] };
    saveConfig(newConfig);
  };

  const removeRule = (id: string) => {
    const newConfig = { ...config, rules: config.rules.filter((r: any) => r.id !== id) };
    saveConfig(newConfig);
  };

  if (!token) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-black border border-zinc-800 p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-white p-3 rounded-full mb-4">
              <Lock className="text-black w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-widest">Access Control</h1>
          </div>
          <div className="space-y-4">
            <input 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm outline-none focus:border-white transition-colors"
              placeholder="Username"
              value={username} onChange={e => setUsername(e.target.value)}
            />
            <input 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm outline-none focus:border-white transition-colors"
              placeholder="Password"
              type="password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            {error && <div className="text-red-500 text-xs text-center">{error}</div>}
            <button className="w-full bg-white text-black font-bold p-3 rounded-lg hover:bg-zinc-200 transition-colors uppercase text-sm">
              Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!config) return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono">INITIALIZING_SYSTEM...</div>;

  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col md:flex-row overflow-hidden font-sans text-zinc-100">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-black border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Configuration</h2>
          </div>
          <button onClick={handleLogout} className="text-zinc-500 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500">Vast.ai API Key</label>
            <input 
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono outline-none focus:border-white"
              type="password" value={config.vast_api_key} onChange={e => setConfig({...config, vast_api_key: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500">TG Bot Token</label>
              <input 
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono outline-none"
                type="password" value={config.tg_bot_token} onChange={e => setConfig({...config, tg_bot_token: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500">TG Chat ID</label>
              <input 
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono outline-none"
                value={config.tg_chat_id} onChange={e => setConfig({...config, tg_chat_id: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Check Interval (seconds)</label>
            <input 
              type="number"
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm font-mono focus:border-white outline-none"
              value={config.check_interval}
              onChange={e => setConfig({...config, check_interval: parseInt(e.target.value) || 60})}
            />
          </div>

          <button 
            onClick={() => saveConfig()} 
            disabled={isSaving}
            className="w-full bg-zinc-100 text-black text-[10px] font-bold uppercase py-2 rounded hover:bg-white active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Syncing...' : 'Save Global Settings'}
          </button>
        </div>

        <div className="h-px bg-zinc-800 my-2" />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-zinc-400">Monitoring Rules</h3>
          <button onClick={addRule} className="text-white hover:bg-zinc-800 p-1 rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {config.rules.map((rule: any) => (
            <div key={rule.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg space-y-3 relative group">
              <button onClick={() => removeRule(rule.id)} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-600 block">GPU</label>
                  <input className="w-full bg-black border border-zinc-800 rounded p-1 text-[10px] outline-none" 
                    value={rule.gpu_name} onChange={e => {
                      const newRules = config.rules.map((r: any) => r.id === rule.id ? {...r, gpu_name: e.target.value} : r);
                      setConfig({...config, rules: newRules});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-600 block">Count</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 rounded p-1 text-[10px] outline-none" 
                    value={rule.num_gpus} onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      const newRules = config.rules.map((r: any) => r.id === rule.id ? {...r, num_gpus: val} : r);
                      setConfig({...config, rules: newRules});
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-zinc-600 block">Max Price ($/hr)</label>
                <input type="number" step="0.1" className="w-full bg-black border border-zinc-800 rounded p-1 text-[10px] outline-none font-mono" 
                  value={rule.max_price} onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    const newRules = config.rules.map((r: any) => r.id === rule.id ? {...r, max_price: val} : r);
                    setConfig({...config, rules: newRules});
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-600 block">Country (e.g. US)</label>
                  <input className="w-full bg-black border border-zinc-800 rounded p-1 text-[10px] outline-none" 
                    placeholder="All"
                    value={rule.country} onChange={e => {
                      const newRules = config.rules.map((r: any) => r.id === rule.id ? {...r, country: e.target.value} : r);
                      setConfig({...config, rules: newRules});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-600 block">Min Rent (hrs)</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 rounded p-1 text-[10px] outline-none" 
                    value={rule.min_duration} onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      const newRules = config.rules.map((r: any) => r.id === rule.id ? {...r, min_duration: val} : r);
                      setConfig({...config, rules: newRules});
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {config.rules.length > 0 && (
            <button 
              onClick={() => saveConfig()} 
              disabled={isSaving}
              className="w-full bg-white text-black text-[10px] font-bold uppercase py-2 rounded hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update Rules'}
            </button>
          )}
        </div>

        <button 
          onClick={() => saveConfig({...config, is_running: !config.is_running})}
          disabled={isSaving}
          className={`mt-auto flex items-center justify-center gap-2 p-4 rounded-xl text-xs font-bold uppercase border transition-all disabled:opacity-50 ${
            config.is_running ? 'border-red-900/50 text-red-500 bg-red-950/10 hover:bg-red-950/20' : 'border-emerald-900/50 text-emerald-500 bg-emerald-950/10 hover:bg-emerald-950/20'
          }`}
        >
          {isSaving ? 'Processing...' : (config.is_running ? <><Square className="w-4 h-4"/> Stop Scanner</> : <><Play className="w-4 h-4"/> Start Scanner</>)}
        </button>
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        <header className="h-16 border-b border-zinc-800 flex items-center px-8 justify-between bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <Activity className={`w-4 h-4 ${config.is_running ? 'text-emerald-500 animate-pulse' : 'text-zinc-700'}`} />
            <h1 className="text-xs font-bold uppercase tracking-[0.2em]">Real-time Market Feed</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[10px] text-zinc-500 font-mono">STATUS: {config.is_running ? 'SCANNING' : 'PAUSED'}</div>
            <div className="text-[10px] text-zinc-500 font-mono">RULES: {config.rules.length}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="space-y-12">
            {config.rules.map((rule: any) => (
              <section key={rule.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-zinc-900" />
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{rule.num_gpus}x {rule.gpu_name} &lt; ${rule.max_price}</h2>
                  <div className="h-px flex-1 bg-zinc-900" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(results[rule.id] || []).map((offer: any) => (
                    <div key={offer.id} className="bg-black border border-zinc-800 rounded-xl p-5 hover:border-zinc-500 transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <div className="text-[9px] font-mono text-zinc-500 mb-1">NODE_{offer.id}</div>
                          <div className="flex items-center gap-2 text-white font-bold">
                            <Cpu className="w-4 h-4" />
                            <span className="text-sm font-mono">{offer.num_gpus}x {offer.gpu_name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black font-mono text-white">${offer.dph_total.toFixed(3)}</div>
                          <div className="text-[8px] text-zinc-500 uppercase">per hour</div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-2 relative z-10">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 flex items-center gap-1"><Globe className="w-3 h-3"/> Location</span>
                          <span className="text-zinc-300 font-medium">{offer.geolocation || 'Global'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Reliability</span>
                          <span className="text-emerald-500 font-bold">{(offer.reliability2 * 100).toFixed(1)}%</span>
                        </div>
                      </div>

                      <a href="https://vast.ai/console/create/" target="_blank" className="mt-6 block w-full bg-zinc-900 text-center py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-white hover:text-black transition-all relative z-10">
                        Deploy Instance
                      </a>
                    </div>
                  ))}
                  {(!results[rule.id] || results[rule.id].length === 0) && (
                    <div className="col-span-full py-12 border border-dashed border-zinc-900 rounded-xl flex items-center justify-center text-[10px] text-zinc-700 font-mono uppercase">
                      No offers matching this rule
                    </div>
                  )}
                </div>
              </section>
            ))}
            {config.rules.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-800 mt-20">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Configure rules to start tracking</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
