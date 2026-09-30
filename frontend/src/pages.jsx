import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend
} from 'recharts'
import { api, inr, reportUrl } from './api'
import Graph from './Graph.jsx'

const COL = [
  '#22d3ee',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#10b981',
  '#e879f9'
]

const Sev = ({ s }) => (
  <span className={'badge ' + s}>{s}</span>
)

const Risk = ({ v }) => (
  <div style={{ minWidth: 70 }}>
    <b>{v}</b>
    <div className="bar">
      <i style={{ width: v + '%' }} />
    </div>
  </div>
)

const useGet = (url, params, dep = []) => {
  const [d, setD] = useState(null)

  useEffect(() => {
    api.get(url, { params }).then(r => setD(r.data))
  }, dep)

  return [d, setD]
}

export function Dashboard() {
  const [d] = useGet('/dashboard/summary/')

  if (!d) return <p>Loading engine output...</p>

  const k = [
    ['Transactions', d.transactions.toLocaleString('en-IN')],
    ['Accounts', d.accounts],
    ['Suspicious networks', d.networks],
    ['Active cases', d.active_cases],
    ['High-risk accounts', d.high_risk_accounts],
    ['Total value', inr(d.total_value)]
  ]

  return (
    <>
      <h1>Command Center</h1>

      <div className="grid g4">
        {k.map(([l, v]) => (
          <div className="card" key={l}>
            <div className="kpi">{v}</div>
            <div className="dim">{l}</div>
          </div>
        ))}
      </div>

      <br />

      <div className="grid g2">
        <div className="card">
          <h2>Volume and suspicious activity</h2>
          <ResponsiveContainer height={220}>
            <LineChart data={d.trend}>
              <XAxis dataKey="date" hide />
              <YAxis yAxisId="a" hide />
              <YAxis yAxisId="b" orientation="right" hide />
              <Tooltip />
              <Line
                yAxisId="a"
                dataKey="count"
                stroke="#22d3ee"
                dot={false}
                name="transactions"
              />
              <Line
                yAxisId="b"
                dataKey="suspicious"
                stroke="#f43f5e"
                name="suspicious"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Risk distribution</h2>
          <ResponsiveContainer height={220}>
            <PieChart>
              <Pie
                data={d.risk_distribution}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label
              >
                {d.risk_distribution.map((_, i) => (
                  <Cell key={i} fill={COL[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Pattern distribution</h2>
          <ResponsiveContainer height={220}>
            <BarChart
              data={d.pattern_distribution}
              layout="vertical"
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: '#8592ad', fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Geographic distribution</h2>
          <ResponsiveContainer height={220}>
            <BarChart data={d.geo}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#8592ad', fontSize: 10 }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#22d3ee" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Recent alerts</h2>
          <table>
            <tbody>
              {d.recent_alerts.map(a => (
                <tr key={a.alert_id} className="click">
                  <td>
                    <Link to={'/networks/' + a.network}>
                      {a.alert_id}
                    </Link>
                  </td>
                  <td>{a.pattern}</td>
                  <td>
                    <Sev s={a.severity} />
                  </td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Top suspicious accounts</h2>
          <table>
            <tbody>
              {d.top_accounts.map(a => (
                <tr key={a.account_id}>
                  <td>
                    <Link to={'/accounts/' + a.account_id}>
                      {a.account_id}
                    </Link>
                  </td>
                  <td>{a.type}</td>
                  <td>
                    <Risk v={a.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="dim">Processing status: {d.status}</p>
    </>
  )
}

export function Transactions() {
  const [sp] = useSearchParams()

  const [f, setF] = useState({
    q: sp.get('q') || '',
    page: 1,
    sort: 'timestamp',
    dir: 'desc'
  })

  const [d, setD] = useState(null)
  const [sel, setSel] = useState(null)

  useEffect(() => {
    api.get('/transactions/', { params: f })
      .then(r => setD(r.data))
  }, [f])

  const set = (k, v) =>
    setF({
      ...f,
      [k]: v,
      page: k === 'page' ? v : 1
    })

  const th = (k, l) => (
    <th
      onClick={() =>
        setF({
          ...f,
          sort: k,
          dir:
            f.sort === k && f.dir === 'desc'
              ? 'asc'
              : 'desc'
        })
      }
    >
      {l}
      {f.sort === k
        ? f.dir === 'desc'
          ? ' ▼'
          : ' ▲'
        : ''}
    </th>
  )

  return (
    <>
      <h1>Transaction Explorer</h1>

      <div className="row card" style={{ marginBottom: 12 }}>
        <input
          placeholder="Search ID / account"
          value={f.q}
          onChange={e => set('q', e.target.value)}
        />

        <input
          placeholder="Account"
          onChange={e => set('account', e.target.value)}
        />

        <input
          type="date"
          onChange={e => set('from', e.target.value)}
        />

        <input
          type="date"
          onChange={e => set('to', e.target.value)}
        />

        <input
          placeholder="Min amount"
          size={9}
          onChange={e => set('min_amount', e.target.value)}
        />

        <input
          placeholder="Max amount"
          size={9}
          onChange={e => set('max_amount', e.target.value)}
        />

        <select
          onChange={e => set('min_risk', e.target.value)}
        >
          <option value="">Any risk</option>
          <option value="1">Flagged</option>
          <option value="60">High+</option>
        </select>

        <select
          onChange={e => set('pattern', e.target.value)}
        >
          <option value="">Any pattern</option>
          {[
            'Circular',
            'Rapid',
            'Mule',
            'velocity',
            'Smurfing'
          ].map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {d && (
        <div className="card">
          <table>
            <thead>
              <tr>
                {th('transaction_id', 'Transaction')}
                {th('timestamp', 'Timestamp')}
                {th('sender', 'Sender')}
                {th('receiver', 'Receiver')}
                {th('amount', 'Amount')}
                <th>Type</th>
                <th>Status</th>
                {th('risk', 'Risk')}
                <th>Pattern</th>
              </tr>
            </thead>

            <tbody>
              {d.results.map(t => (
                <tr
                  key={t.transaction_id}
                  className="click"
                  onClick={() =>
                    api
                      .get('/transactions/' + t.transaction_id + '/')
                      .then(r => setSel(r.data))
                  }
                >
                  <td>{t.transaction_id}</td>
                  <td>{t.timestamp.replace('T', ' ')}</td>
                  <td>{t.sender}</td>
                  <td>{t.receiver}</td>
                  <td>{inr(t.amount)}</td>
                  <td>{t.transaction_type}</td>
                  <td>{t.status}</td>
                  <td>{t.risk || '-'}</td>
                  <td>{t.pattern}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row" style={{ marginTop: 10 }}>
            <button
              disabled={f.page <= 1}
              onClick={() => set('page', f.page - 1)}
            >
              Prev
            </button>

            <span>
              Page {f.page} of{' '}
              {Math.ceil(d.count / d.page_size)} (
              {d.count.toLocaleString()} results)
            </span>

            <button
              disabled={
                f.page * d.page_size >= d.count
              }
              onClick={() => set('page', f.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {sel && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row">
            <h2>{sel.transaction_id}</h2>
            <button onClick={() => setSel(null)}>
              Close
            </button>
          </div>

          <p>
            {sel.sender} to {sel.receiver}:{' '}
            <b>{inr(sel.amount)}</b> via{' '}
            {sel.transaction_type} ({sel.channel},{' '}
            {sel.location}, {sel.device_id}) at{' '}
            {sel.timestamp}
          </p>

          {sel.network_detail ? (
            <p>
              Part of{' '}
              <Link
                to={'/networks/' + sel.network_detail.id}
              >
                {sel.network_detail.id}
              </Link>{' '}
              (risk {sel.network_detail.risk}):{' '}
              {sel.network_detail.patterns
                .map(p => p.label)
                .join(', ')}
            </p>
          ) : (
            <p className="dim">
              Not part of any suspicious network.
            </p>
          )}
        </div>
      )}
    </>
  )
}

const dnaRadar = list =>
  Object.keys(list[0].dna.radar).map(k => ({
    axis: k,
    ...Object.fromEntries(
      list.map(n => [
        n.id,
        Math.round(n.dna.radar[k])
      ])
    )
  }))

export function Networks() {
  const [d] = useGet('/networks/')
  const [cmp, setCmp] = useState([])

  if (!d) return <p>Loading...</p>

  const picked = d.filter(n => cmp.includes(n.id))

  return (
    <>
      <h1>Suspicious Networks</h1>

      <p className="dim">
        Reconstructed from temporal flow links, not single
        transactions. Tick two networks to compare their
        Network DNA.
      </p>

      {picked.length > 0 && (
        <div
          className="card"
          style={{ marginBottom: 12 }}
        >
          <h2>DNA comparison</h2>

          <ResponsiveContainer height={300}>
            <RadarChart data={dnaRadar(picked)}>
              <PolarGrid stroke="#1e2a44" />

              <PolarAngleAxis
                dataKey="axis"
                tick={{
                  fill: '#8592ad',
                  fontSize: 11
                }}
              />

              {picked.map((n, i) => (
                <Radar
                  key={n.id}
                  name={n.id}
                  dataKey={n.id}
                  stroke={COL[i]}
                  fill={COL[i]}
                  fillOpacity={0.25}
                />
              ))}

              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Compare</th>
              <th>Network</th>
              <th>Risk</th>
              <th>Severity</th>
              <th>Accounts</th>
              <th>Tx</th>
              <th>Value</th>
              <th>Window</th>
              <th>Patterns</th>
            </tr>
          </thead>

          <tbody>
            {d.map(n => (
              <tr key={n.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={cmp.includes(n.id)}
                    onChange={e =>
                      setCmp(
                        e.target.checked
                          ? [...cmp, n.id].slice(-2)
                          : cmp.filter(x => x !== n.id)
                      )
                    }
                  />
                </td>

                <td>
                  <Link to={'/networks/' + n.id}>
                    {n.id}
                  </Link>
                </td>

                <td>
                  <Risk v={n.risk} />
                </td>

                <td>
                  <Sev s={n.severity} />
                </td>

                <td>{n.n_accounts}</td>
                <td>{n.n_tx}</td>
                <td>{inr(n.total_amount)}</td>
                <td>{n.window_minutes} min</td>

                <td>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap'
                    }}
                  >
                    {n.patterns.map((p, i) => (
                      <span
                        key={`${p}-${i}`}
                        className="badge"
                        style={{
                          background: '#182238',
                          border: '1px solid #2b3a5a',
                          color: '#c7d2fe',
                          padding: '4px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function NetworkDetail({ user }) {
  const { id } = useParams()
  const go = useNavigate()

  const [n, setN] = useState(null)
  const [c, setC] = useState(null)
  const [i, setI] = useState(-1)
  const [play, setPlay] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [labels, setLabels] = useState(false)
  const [tab, setTab] = useState('overview')
  const [msg, setMsg] = useState('')
  const [note, setNote] = useState('')

  const load = () =>
    api
      .get('/networks/' + id + '/')
      .then(r => {
        setN(r.data)

        if (r.data.case) {
          api
            .get('/cases/' + r.data.case.case_id + '/')
            .then(x => setC(x.data))
        } else {
          setC(null)
        }
      })

  useEffect(() => {
    load()
    setI(-1)
    setPlay(false)
  }, [id])

  useEffect(() => {
    if (!play || !n) return

    const t = setTimeout(() => {
      if (i + 1 >= n.events.length) {
        setPlay(false)
      } else {
        setI(i + 1)
      }
    }, 1200 / speed)

    return () => clearTimeout(t)
  }, [play, i, speed, n])

  if (!n) return <p>Loading...</p>

  const ev = n.events[i]

  const act =
    ev && {
      id: ev.tx_id,
      hot: !!ev.pattern_detected
    }

  const open = () =>
    api
      .post('/cases/', {
        network_id: id,
        analyst: user
      })
      .then(load)
      .catch(e =>
        setMsg(
          e.response?.data?.error || 'failed'
        )
      )

  const patch = b =>
    api
      .patch('/cases/' + c.case_id + '/', b)
      .then(r => setC(r.data))

  const pin = tx => {
    const comment = window.prompt(
      'Why is this transaction evidence?'
    )

    if (comment !== null) {
      api
        .post(
          '/cases/' + c.case_id + '/evidence/',
          {
            tx_id: tx,
            comment
          }
        )
        .then(r => setC(r.data))
    }
  }

  const pinned = new Set(
    (c?.evidence || []).map(x => x.tx_id)
  )

  const need = (
    <p className="dim">
      Open an investigation case to use this tab.
    </p>
  )

  const tabs = [
    'overview',
    'timeline',
    'accounts',
    'transactions',
    'patterns',
    'risk',
    'evidence',
    'notes',
    'report'
  ]

  return (
    <>
     <div
  className="card"
  style={{
    marginBottom: 14,
    padding: 18
  }}
>
  <div
    className="row"
    style={{
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }}
  >
    <div>
      <div
        className="dim"
        style={{
          fontSize: 12,
          marginBottom: 4
        }}
      >
        SUSPICIOUS NETWORK
      </div>

      <h1 style={{ margin: 0 }}>
        {id}
      </h1>
    </div>

    <Sev s={n.severity} />

    <div
      style={{
        padding: '7px 12px',
        borderRadius: 8,
        background: '#182238',
        border: '1px solid #2b3a5a'
      }}
    >
      <span className="dim">
        Risk
      </span>{' '}
      <b>{n.risk}/100</b>
    </div>

    <span className="grow" />

    {!c && (
      <button
        className="pri"
        onClick={open}
      >
        Open investigation case
      </button>
    )}

    <a href={reportUrl(id)}>
      <button>
        Generate dossier (PDF)
      </button>
    </a>
  </div>

  <div
    className="grid"
    style={{
      gridTemplateColumns:
        'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 10,
      marginTop: 16
    }}
  >
    <div
      style={{
        padding: 12,
        borderRadius: 9,
        background: '#101827',
        border: '1px solid #1e2a44'
      }}
    >
      <div className="dim">
        Accounts
      </div>
      <b>{n.n_accounts}</b>
    </div>

    <div
      style={{
        padding: 12,
        borderRadius: 9,
        background: '#101827',
        border: '1px solid #1e2a44'
      }}
    >
      <div className="dim">
        Transactions
      </div>
      <b>{n.n_tx}</b>
    </div>

    <div
      style={{
        padding: 12,
        borderRadius: 9,
        background: '#101827',
        border: '1px solid #1e2a44'
      }}
    >
      <div className="dim">
        Total value
      </div>
      <b>{inr(n.total_amount)}</b>
    </div>

    <div
      style={{
        padding: 12,
        borderRadius: 9,
        background: '#101827',
        border: '1px solid #1e2a44'
      }}
    >
      <div className="dim">
        Time window
      </div>
      <b>{n.window_minutes} min</b>
    </div>

    <div
      style={{
        padding: 12,
        borderRadius: 9,
        background: '#101827',
        border: '1px solid #1e2a44'
      }}
    >
      <div className="dim">
        Case
      </div>
      <b>
        {c ? c.case_id : 'Not opened'}
      </b>
    </div>
  </div>
</div>

{msg && (
  <p style={{ color: '#f43f5e' }}>
    {msg}
  </p>
)}

      {c && (
        <div
          className="card row"
          style={{ marginBottom: 12 }}
        >
          <b>{c.case_id}</b>

          <input
            defaultValue={c.title}
            style={{
              flex: 1,
              minWidth: 200
            }}
            onBlur={e =>
              e.target.value !== c.title &&
              patch({ title: e.target.value })
            }
          />

          <select
            value={c.status}
            onChange={e =>
              patch({ status: e.target.value })
            }
          >
            {[
              'New',
              'Acknowledged',
              'Investigating',
              'Resolved'
            ].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={c.priority}
            onChange={e =>
              patch({ priority: e.target.value })
            }
          >
            {[
              'LOW',
              'MEDIUM',
              'HIGH',
              'CRITICAL'
            ].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <input
            defaultValue={c.analyst}
            size={12}
            title="Assigned analyst"
            onBlur={e =>
              e.target.value !== c.analyst &&
              patch({ analyst: e.target.value })
            }
          />

          <span className="dim">
            created {c.created.slice(0, 10)}, updated{' '}
            {c.updated
              .slice(0, 16)
              .replace('T', ' ')}
          </span>
        </div>
      )}

      <p className="dim">
        {n.n_accounts} accounts, {n.n_tx} transactions,{' '}
        {inr(n.total_amount)} in {n.window_minutes}{' '}
        minutes. Purple = intermediary, red = high risk.
        Click a node to open the account.
      </p>

      <div className="grid g2">
        <div>
          <div
            className="row"
            style={{ marginBottom: 8 }}
          >
            <button
              onClick={() => setPlay(!play)}
              className="pri"
            >
              {play
                ? 'Pause'
                : i < 0 ||
                  i + 1 >= n.events.length
                ? 'Start replay'
                : 'Play'}
            </button>

            <button
              onClick={() => {
                setPlay(false)
                setI(Math.max(-1, i - 1))
              }}
            >
              Prev
            </button>

            <button
              onClick={() => {
                setPlay(false)
                setI(
                  Math.min(
                    n.events.length - 1,
                    i + 1
                  )
                )
              }}
            >
              Next
            </button>

            <button
              onClick={() => {
                setPlay(false)
                setI(-1)
              }}
            >
              Restart
            </button>

            <select
              value={speed}
              onChange={e =>
                setSpeed(+e.target.value)
              }
            >
              {[0.5, 1, 2, 4].map(s => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>

            <label>
              <input
                type="checkbox"
                checked={labels}
                onChange={e =>
                  setLabels(e.target.checked)
                }
              />{' '}
              amounts
            </label>
          </div>

          <Graph
            layout={
              n.dna.flow_structure === 'Circular'
                ? 'circle'
                : n.dna.flow_structure ===
                  'Layered chain'
                ? 'breadthfirst'
                : 'cose'
            }
            nodes={n.nodes}
            edges={n.graph_edges}
            active={act}
            labels={labels}
            onNode={a =>
              go('/accounts/' + a)
            }
          />

          {ev && (
            <div
              className={
                'evt ' +
                (ev.pattern_detected
                  ? 'hot'
                  : '')
              }
            >
              <b>{ev.time.slice(11, 19)}</b>{' '}
              {ev.sender} to {ev.receiver}{' '}
              <b>{inr(ev.amount)}</b>

              {ev.pattern_detected && (
                <div
                  style={{
                    color: '#f43f5e'
                  }}
                >
                  PATTERN DETECTED:{' '}
                  {ev.pattern_detected}
                </div>
              )}

              <div className="dim">
                Event {i + 1}/{n.events.length}.
                Network risk context: {n.risk}/100
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Network DNA</h2>

          <ResponsiveContainer height={230}>
            <RadarChart
              data={Object.entries(
                n.dna.radar
              ).map(([k, v]) => ({
                axis: k,
                v: Math.round(v)
              }))}
            >
              <PolarGrid stroke="#1e2a44" />

              <PolarAngleAxis
                dataKey="axis"
                tick={{
                  fill: '#8592ad',
                  fontSize: 11
                }}
              />

              <Radar
                dataKey="v"
                stroke="#22d3ee"
                fill="#22d3ee"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>

          <div
            className="grid"
            style={{
              gridTemplateColumns:
                'repeat(3,1fr)',
              gap: 12,
              marginTop: 12
            }}
          >
            {[
              [
                'Flow',
                n.dna.flow_structure
              ],
              ['Velocity', n.dna.velocity],
              [
                'Fragmentation',
                n.dna.fragmentation
              ],
              [
                'Intermediaries',
                n.dna.intermediaries
              ],
              ['Depth', n.dna.depth],
              [
                'Repeats',
                n.dna.repeated_activity +
                  'x'
              ],
              [
                'Return flow',
                n.dna.return_flow
                  ? 'Detected'
                  : 'None'
              ],
              [
                'Leakage',
                n.dna.leakage_pct + '%'
              ],
              [
                'Risk',
                n.dna.risk + '/100'
              ]
            ].map(([a, b]) => (
              <div key={a}>
                <div className="dim">{a}</div>
                <b>{b}</b>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop:
                '1px solid #1e2a44'
            }}
          >
            <h3 style={{ marginBottom: 12 }}>
              What these dimensions mean
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 10
              }}
            >
              {[
                [
                  'Flow',
                  'Describes the overall structure of money movement through connected accounts.'
                ],
                [
                  'Velocity',
                  'Indicates how quickly transactions move through the network.'
                ],
                [
                  'Fragmentation',
                  'Shows how distributed the transaction activity is across the network.'
                ],
                [
                  'Intermediaries',
                  'Represents accounts that act as pass-through points between other accounts.'
                ],
                [
                  'Depth',
                  'Represents how many transaction hops the network spans.'
                ],
                [
                  'Repeats',
                  'Indicates recurring transaction activity within the network.'
                ],
                [
                  'Return flow',
                  'Indicates whether money appears to flow back toward previously connected accounts.'
                ],
                [
                  'Leakage',
                  'Shows the percentage of value that leaves the reconstructed network flow.'
                ],
                [
                  'Risk',
                  'The calculated risk score associated with the reconstructed network.'
                ]
              ].map(([title, detail]) => (
                <div
                  key={title}
                  style={{
                    padding: 12,
                    border:
                      '1px solid #1e2a44',
                    borderRadius: 10,
                    background:
                      '#101827'
                  }}
                >
                  <b>{title}</b>

                  <p className="dim">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <br />

      <div className="row">
        {tabs.map(t => (
          <button
            key={t}
            className={
              tab === t ? 'pri' : ''
            }
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        className="card"
        style={{ marginTop: 10 }}
      >
        {tab === 'overview' && (
          <div>
            <div
              className="card"
              style={{
                marginBottom: 16,
                border:
                  '1px solid #263451',
                background:
                  '#101827'
              }}
            >
              <div
                className="row"
                style={{
                  justifyContent:
                    'space-between',
                  marginBottom: 14
                }}
              >
                <div>
                  <h2
                    style={{
                      marginBottom: 4
                    }}
                  >
                    Risk explanation
                  </h2>

                  <p className="dim">
                    Evidence contributing to
                    this network's risk score.
                  </p>
                </div>

                <div
                  style={{
                    textAlign: 'right'
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700
                    }}
                  >
                    {n.risk}/100
                  </div>

                  <Sev s={n.severity} />
                </div>
              </div>

              {(n.reasons || []).length >
              0 ? (
                n.reasons.map((r, index) => (
                  <div
                    key={`${r.factor}-${index}`}
                    style={{
                      padding: '12px 0',
                      borderTop:
                        '1px solid #1e2a44'
                    }}
                  >
                    <div
                      className="row"
                      style={{
                        justifyContent:
                          'space-between',
                        marginBottom: 6
                      }}
                    >
                      <b>{r.factor}</b>

                      <b
                        style={{
                          color: '#22d3ee'
                        }}
                      >
                        +{r.points}
                      </b>
                    </div>

                    <div
                      className="bar"
                      style={{
                        marginBottom: 7
                      }}
                    >
                      <i
                        style={{
                          width:
                            Math.min(
                              Math.max(
                                Number(
                                  r.points
                                ) || 0,
                                0
                              ) * 5,
                              100
                            ) + '%'
                        }}
                      />
                    </div>

                    <div className="dim">
                      {r.detail}
                    </div>
                  </div>
                ))
              ) : (
                <p className="dim">
                  No individual risk factors
                  were returned for this
                  network.
                </p>
              )}

              <div
                className="row"
                style={{
                  justifyContent:
                    'space-between',
                  borderTop:
                    '1px solid #1e2a44',
                  paddingTop: 12,
                  marginTop: 4
                }}
              >
                <span>
                  Total risk score
                </span>

                <b>{n.risk}/100</b>
              </div>
            </div>

            <h2>Detected patterns</h2>

            {n.patterns.map(p => (
              <div
                key={p.key}
                style={{
                  padding: '7px 0'
                }}
              >
                ✓ <b>{p.label}</b>{' '}
                <span className="dim">
                  {p.detail}
                </span>
              </div>
            ))}

            <p className="dim">
              Active{' '}
              {n.start.replace('T', ' ')} to{' '}
              {n.end.replace('T', ' ')}.
            </p>
          </div>
        )}

        {tab === 'timeline' &&
          n.events.map(e => (
            <div
              key={e.tx_id}
              className={
                'evt ' +
                (e.pattern_detected
                  ? 'hot'
                  : '')
              }
            >
              <b>
                {e.time.slice(11, 19)}
              </b>{' '}
              {e.sender} to {e.receiver}{' '}
              {inr(e.amount)}{' '}
              <span className="dim">
                {e.tx_id}
              </span>

              {e.pattern_detected && (
                <b
                  style={{
                    color: '#f43f5e'
                  }}
                >
                  {' '}
                  {e.pattern_detected}
                </b>
              )}
            </div>
          ))}

        {tab === 'accounts' && (
          <table>
            <tbody>
              {n.nodes.map(a => (
                <tr key={a.id}>
                  <td>
                    <Link
                      to={
                        '/accounts/' + a.id
                      }
                    >
                      {a.id}
                    </Link>
                  </td>

                  <td>
                    <Risk v={a.risk} />
                  </td>

                  <td>
                    {a.mule
                      ? 'Intermediary'
                      : ''}
                  </td>

                  <td>
                    In {inr(a.incoming)}
                  </td>

                  <td>
                    Out {inr(a.outgoing)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'transactions' && (
          <table>
            <tbody>
              {n.events.map(e => (
                <tr key={e.tx_id}>
                  <td>{e.tx_id}</td>
                  <td>
                    {e.time.replace(
                      'T',
                      ' '
                    )}
                  </td>
                  <td>{e.sender}</td>
                  <td>{e.receiver}</td>
                  <td>{inr(e.amount)}</td>
                  <td>
                    {e.pattern_detected ||
                      ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'patterns' &&
          n.patterns.map(p => (
            <div key={p.key}>
              <b>{p.label}</b> (+{p.points}):{' '}
              {p.detail}
            </div>
          ))}

        {tab === 'risk' && (
          <div>
            <h2>Risk {n.risk} / 100</h2>

            {(n.reasons || []).map(
              (r, index) => (
                <div
                  key={`${r.factor}-${index}`}
                  className="row"
                  style={{
                    padding:
                      '10px 0',
                    borderBottom:
                      '1px solid #1e2a44'
                  }}
                >
                  <b
                    style={{
                      width: 50
                    }}
                  >
                    +{r.points}
                  </b>

                  <span
                    style={{
                      width: 210
                    }}
                  >
                    {r.factor}
                  </span>

                  <span className="dim">
                    {r.detail}
                  </span>
                </div>
              )
            )}

            <br />

            <b>Total = {n.risk}</b>
          </div>
        )}

        {tab === 'evidence' &&
          (!c ? (
            need
          ) : (
            <div>
              <p className="dim">
                Pin transactions that support
                the case. Pinned items appear in
                the PDF dossier.
              </p>

              {c.evidence.map(x => (
                <div
                  key={x.tx_id}
                  className="evt"
                >
                  <b>{x.tx_id}</b>{' '}
                  {x.comment}
                </div>
              ))}

              <table>
                <tbody>
                  {n.events.map(e => (
                    <tr key={e.tx_id}>
                      <td>{e.tx_id}</td>
                      <td>
                        {e.sender} to{' '}
                        {e.receiver}
                      </td>
                      <td>
                        {inr(e.amount)}
                      </td>
                      <td>
                        <button
                          disabled={pinned.has(
                            e.tx_id
                          )}
                          onClick={() =>
                            pin(e.tx_id)
                          }
                        >
                          {pinned.has(e.tx_id)
                            ? 'Pinned'
                            : 'Pin as evidence'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'notes' &&
          (!c ? (
            need
          ) : (
            <div>
              <div className="row">
                <input
                  style={{ flex: 1 }}
                  value={note}
                  onChange={e =>
                    setNote(
                      e.target.value
                    )
                  }
                  placeholder="Add an investigator note"
                />

                <button
                  className="pri"
                  disabled={!note}
                  onClick={() =>
                    api
                      .post(
                        '/cases/' +
                          c.case_id +
                          '/notes/',
                        { text: note }
                      )
                      .then(r => {
                        setC(r.data)
                        setNote('')
                      })
                  }
                >
                  Add note
                </button>
              </div>

              {c.notes.map((x, k) => (
                <div
                  key={k}
                  className="evt"
                >
                  <span className="dim">
                    {x.created
                      .slice(0, 16)
                      .replace(
                        'T',
                        ' '
                      )}
                  </span>{' '}
                  {x.text}
                </div>
              ))}
            </div>
          ))}

        {tab === 'report' && (
          <div>
            <h2>Investigation dossier</h2>

            <p>
              Includes case fields, risk
              explanation, DNA, network graph,
              timeline
              {c
                ? `, ${c.evidence.length} evidence pin(s) and ${c.notes.length} note(s)`
                : ''}
              .
            </p>

            <a href={reportUrl(id)}>
              <button className="pri">
                Download PDF
              </button>
            </a>
          </div>
        )}
      </div>
    </>
  )
}

export function Accounts() {
  const [q, setQ] = useState('')
  const [d, setD] = useState([])

  useEffect(() => {
    api
      .get('/accounts/', {
        params: { q }
      })
      .then(r => setD(r.data))
  }, [q])

  return (
    <>
      <h1>Account Intelligence</h1>

      <input
        placeholder="Filter by account ID"
        onChange={e => setQ(e.target.value)}
      />

      <div
        className="card"
        style={{ marginTop: 12 }}
      >
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Type</th>
              <th>Risk</th>
              <th>Transactions</th>
              <th>Incoming</th>
              <th>Outgoing</th>
            </tr>
          </thead>

          <tbody>
            {d.map(a => (
              <tr key={a.account_id}>
                <td>
                  <Link
                    to={
                      '/accounts/' +
                      a.account_id
                    }
                  >
                    {a.account_id}
                  </Link>
                </td>

                <td>{a.type}</td>

                <td>
                  <Risk v={a.risk} />
                </td>

                <td>{a.tx_count}</td>
                <td>{inr(a.incoming)}</td>
                <td>{inr(a.outgoing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function AccountDetail() {
  const { id } = useParams()

  const [a] = useGet(
    '/accounts/' + id + '/',
    {},
    [id]
  )

  if (!a) return <p>Loading...</p>

  return (
    <>
      <h1>{a.account_id}</h1>

      <div className="grid g4">
        {[
          ['Risk', a.risk + '/100'],
          ['Type', a.type],
          ['Created', a.created],
          ['Transactions', a.tx_count],
          ['Incoming', inr(a.incoming)],
          ['Outgoing', inr(a.outgoing)],
          [
            'Connected',
            a.connected_accounts.length
          ],
          [
            'Avg holding',
            a.avg_holding_seconds == null
              ? 'n/a'
              : a.avg_holding_seconds + 's'
          ]
        ].map(([k, v]) => (
          <div className="card" key={k}>
            <div className="dim">{k}</div>
            <b>{v}</b>
          </div>
        ))}
      </div>

      {a.risk_factors.map(r => (
        <div
          className="card"
          key={r.network}
          style={{ marginTop: 12 }}
        >
          <h2>
            Risk factors via{' '}
            <Link
              to={'/networks/' + r.network}
            >
              {r.network}
            </Link>
          </h2>

          {r.reasons.map(x => (
            <div key={x.factor}>
              +{x.points} {x.factor}{' '}
              <span className="dim">
                {x.detail}
              </span>
            </div>
          ))}
        </div>
      ))}

      <div
        className="card"
        style={{ marginTop: 12 }}
      >
        <h2>
          Transaction timeline (latest 100)
        </h2>

        <table>
          <tbody>
            {a.history
              .slice()
              .reverse()
              .map(t => (
                <tr key={t.transaction_id}>
                  <td>
                    {t.timestamp.replace(
                      'T',
                      ' '
                    )}
                  </td>
                  <td>{t.sender}</td>
                  <td>{t.receiver}</td>
                  <td>{inr(t.amount)}</td>
                  <td>{t.pattern}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function GraphExplorer() {
  const [f, setF] = useState({
    center: '',
    hops: 1,
    min_risk: 0,
    min_amount: '',
    from: '',
    to: ''
  })

  const [g, setG] = useState(null)
  const [labels, setL] = useState(false)
  const [sel, setSel] = useState(null)
  const [err, setErr] = useState('')

  const load = p =>
    api
      .get('/graph/', {
        params: Object.fromEntries(
          Object.entries(p).filter(
            ([, v]) => v !== ''
          )
        )
      })
      .then(r => {
        setG(r.data)
        setErr('')
      })
      .catch(e =>
        setErr(
          e.response?.data?.error ||
            'failed'
        )
      )

  useEffect(() => {
    load(f)
  }, [])

  const apply = p => {
    setF(p)
    load(p)
  }

  return (
    <>
      <h1>Graph Explorer</h1>

      <p className="dim">
        Accounts are nodes, transactions are
        directed edges. Default view shows
        flagged transactions; enter an account
        to explore its neighbourhood, then
        expand.
      </p>

      <div
        className="row card"
        style={{ marginBottom: 12 }}
      >
        <input
          placeholder="Find account (e.g. ACC0520)"
          value={f.center}
          onChange={e =>
            setF({
              ...f,
              center: e.target.value
            })
          }
        />

        <input
          type="number"
          min="1"
          max="4"
          style={{ width: 60 }}
          value={f.hops}
          onChange={e =>
            setF({
              ...f,
              hops: +e.target.value
            })
          }
          title="Hops"
        />

        <input
          type="date"
          onChange={e =>
            setF({
              ...f,
              from: e.target.value
            })
          }
        />

        <input
          type="date"
          onChange={e =>
            setF({
              ...f,
              to: e.target.value
            })
          }
        />

        <input
          placeholder="Min amount"
          size={9}
          onChange={e =>
            setF({
              ...f,
              min_amount: e.target.value
            })
          }
        />

        <select
          onChange={e =>
            setF({
              ...f,
              min_risk: +e.target.value
            })
          }
        >
          <option value={0}>Any risk</option>
          <option value={20}>Risk 20+</option>
          <option value={40}>Risk 40+</option>
          <option value={60}>Risk 60+</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={labels}
            onChange={e =>
              setL(e.target.checked)
            }
          />{' '}
          amounts
        </label>

        <button
          className="pri"
          onClick={() => load(f)}
        >
          Apply
        </button>

        <button
          onClick={() =>
            apply({
              ...f,
              hops: f.hops + 1
            })
          }
          disabled={!f.center}
        >
          Expand
        </button>

        <button
          onClick={() =>
            apply({
              center: '',
              hops: 1,
              min_risk: 0,
              min_amount: '',
              from: '',
              to: ''
            })
          }
        >
          Reset
        </button>
      </div>

      {err && (
        <p style={{ color: '#f43f5e' }}>
          {err}
        </p>
      )}

      {g && (
        <>
          <p className="dim">
            {g.nodes.length} accounts,{' '}
            {g.edges.length} transactions
            {g.truncated
              ? ' (showing latest 400)'
              : ''}
          </p>

          <div
            className="card"
            style={{
              marginBottom: 10,
              padding: '10px 14px'
            }}
          >
            <div
              className="row"
              style={{
                gap: 18,
                flexWrap: 'wrap'
              }}
            >
              <span>
                <b
                  style={{
                    color: '#22d3ee'
                  }}
                >
                  ●
                </b>{' '}
                Account
              </span>

              <span>
                <b
                  style={{
                    color: '#f43f5e'
                  }}
                >
                  ●
                </b>{' '}
                High risk
              </span>

              <span>
                <b
                  style={{
                    color: '#8b5cf6'
                  }}
                >
                  ●
                </b>{' '}
                Intermediary
              </span>

              <span>
                <b>→</b> Transaction direction
              </span>

              <span>
                <b
                  style={{
                    color: '#f43f5e'
                  }}
                >
                  ━
                </b>{' '}
                Suspicious flow
              </span>
            </div>
          </div>

          <Graph
            nodes={g.nodes}
            edges={g.edges}
            labels={labels}
            focus={g.center}
            onNode={a =>
              setSel(
                g.nodes.find(
                  n => n.id === a
                )
              )
            }
          />
        </>
      )}

      {sel && (
        <div
          className="card"
          style={{ marginTop: 12 }}
        >
          <h2>{sel.id}</h2>

          <p>
            Risk {sel.risk}/100,{' '}
            {sel.tx_count} transactions, in{' '}
            {inr(sel.incoming)}, out{' '}
            {inr(sel.outgoing)}.{' '}
            {sel.networks.map(n => (
              <Link
                key={n}
                to={'/networks/' + n}
              >
                {n}{' '}
              </Link>
            ))}
          </p>

          <div className="row">
            <button
              className="pri"
              onClick={() =>
                apply({
                  ...f,
                  center: sel.id,
                  hops: 1
                })
              }
            >
              Explore from here
            </button>

            <Link
              to={'/accounts/' + sel.id}
            >
              Account intelligence
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export function Alerts() {
  const [d, setD] =
    useGet('/alerts/')

  if (!d) return <p>Loading...</p>

  const ack = a =>
    api
      .post('/cases/', {
        network_id: a.network,
        status: 'Acknowledged',
        analyst:
          localStorage.getItem(
            'analyst'
          )
      })
      .catch(
        e =>
          e.response?.status === 409 &&
          api.patch(
            '/cases/' + a.case_id + '/',
            { status: 'Acknowledged' }
          )
      )
      .then(() =>
        api
          .get('/alerts/')
          .then(r => setD(r.data))
      )

  return (
    <>
      <h1>Alerts</h1>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Pattern</th>
              <th>Network</th>
              <th>Risk</th>
              <th>Severity</th>
              <th>Time</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {d.map(a => (
              <tr key={a.alert_id}>
                <td>{a.alert_id}</td>
                <td>{a.pattern}</td>
                <td>
                  <Link
                    to={
                      '/networks/' +
                      a.network
                    }
                  >
                    {a.network}
                  </Link>
                </td>
                <td>{a.risk}</td>
                <td>
                  <Sev s={a.severity} />
                </td>
                <td>
                  {a.timestamp.replace(
                    'T',
                    ' '
                  )}
                </td>
                <td>{a.status}</td>
                <td>
                  {a.status === 'New' && (
                    <button
                      onClick={() =>
                        ack(a)
                      }
                    >
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function Cases() {
  const [d] = useGet('/cases/')

  if (!d) return <p>Loading...</p>

  return (
    <>
      <h1>Investigation Cases</h1>

      {!d.length && (
        <p className="dim">
          No cases yet. Open one from a
          network page or acknowledge an alert.
        </p>
      )}

      {d.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Analyst</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>

            <tbody>
              {d.map(c => (
                <tr key={c.case_id}>
                  <td>
                    <Link
                      to={
                        '/networks/' +
                        c.network_id
                      }
                    >
                      {c.case_id}
                    </Link>
                  </td>

                  <td>{c.title}</td>

                  <td>
                    <Sev s={c.priority} />
                  </td>

                  <td>{c.risk}</td>
                  <td>{c.status}</td>
                  <td>{c.analyst}</td>

                  <td>
                    {c.created.slice(0, 10)}
                  </td>

                  <td>
                    {c.updated
                      .slice(0, 16)
                      .replace(
                        'T',
                        ' '
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export function Upload() {
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')

  useEffect(() => {
    if (!busy) return

    const t = setInterval(
      () =>
        api
          .get('/system/')
          .then(r =>
            setStage(r.data.status)
          ),
      250
    )

    return () => clearInterval(t)
  }, [busy])

  const send = f => {
    const fd = new FormData()

    fd.append('file', f)

    setBusy(true)
    setRes(null)

    api
      .post('/upload/', fd)
      .then(r => setRes(r.data))
      .catch(e =>
        setRes(
          e.response?.data || {
            valid: false,
            errors: ['Upload failed']
          }
        )
      )
      .finally(() => setBusy(false))
  }

  return (
    <>
      <h1>Data Upload</h1>

      <div className="card">
        <p className="dim">
          CSV columns: transaction_id,
          timestamp, sender, receiver, amount,
          currency, transaction_type (optional:
          location, channel, device_id). The whole
          pipeline re-runs on upload.
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={e =>
            e.target.files[0] &&
            send(e.target.files[0])
          }
        />

        {busy && (
          <p>
            Engine stage:{' '}
            <b>
              {stage || 'validating'}
            </b>
          </p>
        )}

        {res &&
          (res.valid ? (
            <div>
              <p>
                ✓ {res.rows.toLocaleString()}{' '}
                rows processed, {res.networks}{' '}
                suspicious networks found.
              </p>

              {res.steps.map(s => (
                <div key={s}>✓ {s}</div>
              ))}
            </div>
          ) : (
            <div
              style={{
                color: '#f43f5e'
              }}
            >
              {res.errors.map(e => (
                <div key={e}>✗ {e}</div>
              ))}
            </div>
          ))}
      </div>
    </>
  )
}

export function Settings() {
  const [d] = useGet('/system/')

  if (!d) return <p>Loading...</p>

  return (
    <>
      <h1>System information</h1>

      <div className="card">
        <p>
          {d.engine}: {d.status}.{' '}
          {d.rows.toLocaleString()} transactions,{' '}
          {d.networks} networks.
        </p>

        <h2>
          Risk weights (configurable in
          intelligence/engine.py)
        </h2>

        {Object.entries(d.weights).map(
          ([k, v]) => (
            <div
              key={k}
              className="row"
            >
              <span
                style={{
                  width: 120
                }}
              >
                {k}
              </span>

              <div
                className="bar"
                style={{
                  width: 200
                }}
              >
                <i
                  style={{
                    width:
                      v * 4 + '%'
                  }}
                />
              </div>

              {v}
            </div>
          )
        )}
      </div>
    </>
  )
}