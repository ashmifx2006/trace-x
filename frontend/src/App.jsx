import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { api } from './api'
import { Dashboard, Transactions, Networks, NetworkDetail, Accounts, AccountDetail, Alerts, Cases, Upload, Settings, GraphExplorer } from './pages.jsx'
const nav = [['/', 'Command Center'], ['/transactions', 'Transaction Explorer'], ['/graph', 'Graph Explorer'], ['/networks', 'Suspicious Networks'], ['/accounts', 'Account Intelligence'], ['/alerts', 'Alerts'], ['/cases', 'Cases'], ['/upload', 'Data Upload'], ['/settings', 'System']]
function Search() {
  const [q, setQ] = useState(''), [r, setR] = useState(null), go = useNavigate()
  useEffect(() => { if (q.length < 2) return setR(null); const t = setTimeout(() => api.get('/search/', { params: { q } }).then(x => setR(x.data)), 250); return () => clearTimeout(t) }, [q])
  const to = (p) => { setQ(''); setR(null); go(p) }
  const route = { accounts: a => '/accounts/' + a, transactions: t => '/transactions?q=' + t, networks: n => '/networks/' + n, cases: () => '/cases' }
  return <><input placeholder="Search account, transaction, case or network ID" value={q} onChange={e => setQ(e.target.value)} />
    {r && <div className="dd">{Object.entries(r).map(([k, v]) => v.length ? <div key={k}><b className="dim">{k}</b>{v.map(i => <div key={i}><a onClick={() => to(route[k](i))} style={{ cursor: 'pointer' }}>{i}</a></div>)}</div> : null)}</div>}</>
}
function Crumbs() { const p = useLocation().pathname.split('/').filter(Boolean); return <span className="dim">TRACE-X / {p.length ? p.join(' / ') : 'command center'}</span> }
function Bell() { const [n, setN] = useState(0), loc = useLocation(); useEffect(() => { api.get('/alerts/').then(r => setN(r.data.filter(a => a.status === 'New' && a.severity !== 'LOW').length)) }, [loc.pathname]); return <Link to="/alerts" title="Unacknowledged medium+ alerts">Alerts <span className="badge CRITICAL">{n}</span></Link> }
export default function App() {
  const [user, setUser] = useState(localStorage.getItem('token') ? localStorage.getItem('analyst') : null), [name, setName] = useState(''), [st, setSt] = useState('')
  useEffect(() => { if (user && localStorage.getItem('token')) api.get('/system/').then(r => setSt(r.data.status)).catch(() => setSt('offline')) }, [user])
  const [pw, setPw] = useState(''), [err, setErr] = useState('')
  const signin = () => api.post('/auth/login/', { username: name, password: pw }).then(r => { localStorage.setItem('token', r.data.token); localStorage.setItem('analyst', r.data.username); setUser(r.data.username) }).catch(e => setErr(e.response?.data?.error || 'Cannot reach the API. Is the backend running on port 8000?'))
  if (!user) return <div className="login"><div className="card"><div className="logo">TRACE<b>-X</b></div><h2>Follow the Money. Reveal the Network.</h2>
    <p className="dim">Sign in to open the investigation workspace. Demo data is synthetic. Demo login: analyst / trace-x-demo</p>
    <input style={{ width: '100%', marginBottom: 10 }} placeholder="Username" value={name} onChange={e => setName(e.target.value)} />
    <input style={{ width: '100%', marginBottom: 10 }} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && signin()} />
    {err && <p style={{ color: '#f43f5e' }}>{err}</p>}<button className="pri" style={{ width: '100%' }} disabled={!name || !pw} onClick={signin}>Sign in</button></div></div>
  return <div className="app"><aside className="side"><div className="logo">TRACE<b>-X</b></div>{nav.map(([p, l]) => <NavLink key={p} to={p} end={p === '/'}>{l}</NavLink>)}</aside>
    <div><div className="top"><Search /><Crumbs /><span className="grow" /><Bell /><span><i className="dot" style={{ background: st === 'ready' ? undefined : '#f59e0b' }} />Engine: {st || '...'}</span><b>{user}</b>
      <button onClick={() => { localStorage.removeItem('analyst'); localStorage.removeItem('token'); setUser(null) }}>Sign out</button></div>
      <div className="main"><Routes><Route path="/" element={<Dashboard />} /><Route path="/transactions" element={<Transactions />} /><Route path="/networks" element={<Networks />} />
        <Route path="/networks/:id" element={<NetworkDetail user={user} />} /><Route path="/accounts" element={<Accounts />} /><Route path="/accounts/:id" element={<AccountDetail />} />
        <Route path="/graph" element={<GraphExplorer />} /><Route path="/alerts" element={<Alerts />} /><Route path="/cases" element={<Cases />} /><Route path="/upload" element={<Upload />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" />} /></Routes></div></div></div>
}
