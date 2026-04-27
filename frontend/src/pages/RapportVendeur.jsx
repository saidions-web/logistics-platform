// frontend/src/pages/RapportVendeur.jsx

import { useState, useEffect } from 'react'
import {
  Package, CheckCircle, RotateCcw, Clock,
  TrendingUp, TrendingDown, DollarSign,
  RefreshCw, Truck, Ban
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { commandesApi } from '../services/api'

const COLORS_PIE  = ['#16a34a', '#1E4D7B', '#ef4444', '#6b7280']
const COLORS_GOUV = ['#1E4D7B', '#2563A8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff']
const COLORS_TYPE = ['#1E4D7B', '#7c3aed', '#d97706', '#16a34a', '#ef4444']

const TYPE_LABEL = {
  standard:    'Standard',
  express:     'Express',
  jour_j:      'Jour J',
  nuit:        'Nuit',
  point_relai: 'Point relais',
}

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon: Icon, suffix = '', sous_label = '' }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{
          fontSize: typeof value === 'string' && value.length > 8 ? 16 : 24,
          fontWeight: 800, color,
          fontFamily: 'var(--font-display)',
          lineHeight: 1.1,
        }}>
          {value}{suffix}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
        {sous_label && (
          <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{sous_label}</div>
        )}
      </div>
    </div>
  )
}

// ── Tooltip montant personnalisé ──────────────────────────────────
function TooltipMontant({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 3 }}>
          {p.name} : {p.name === 'Montant (TND)' ? `${p.value.toFixed(3)} TND` : p.value}
        </div>
      ))}
    </div>
  )
}

export default function RapportVendeur() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet]   = useState('apercu')  // apercu | geographic | financier

  const load = async () => {
    setLoading(true)
    try {
      const res = await commandesApi.rapport()
      setData(res.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="empty-state"><p>Chargement du rapport...</p></div>
  if (!data)   return (
    <div className="empty-state">
      <Package />
      <h3>Rapport indisponible</h3>
      <p>Impossible de charger les données. Réessayez dans quelques instants.</p>
    </div>
  )

  const { kpi, evolution_mensuelle, par_gouvernorat, par_type, top_retours } = data

  // Camembert statuts
  const dataPie = [
    { name: 'Livrées',    value: kpi.livrees    },
    { name: 'En cours',   value: kpi.en_transit + kpi.en_attente },
    { name: 'Retournées', value: kpi.retournees },
    { name: 'Annulées',   value: kpi.annulees   },
  ].filter(d => d.value > 0)

  // Types de livraison avec label lisible
  const dataType = par_type.map(t => ({
    ...t,
    type_livraison: TYPE_LABEL[t.type_livraison] || t.type_livraison,
  }))

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Mon rapport
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Analyse complète de votre activité de vente
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'apercu',     label: '📊 Aperçu général' },
          { key: 'geographic', label: '📍 Géographie'     },
          { key: 'financier',  label: '💰 Financier'      },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setOnglet(key)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: onglet === key ? 700 : 500,
              color: onglet === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${onglet === key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── ONGLET APERÇU ─────────────────────────────────────── */}
      {onglet === 'apercu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Évolution mensuelle */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Évolution sur 6 mois
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={evolution_mensuelle} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1E4D7B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1E4D7B" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gradLivrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<TooltipMontant />} />
                <Legend />
                <Area
                  type="monotone" dataKey="total"
                  stroke="#1E4D7B" strokeWidth={2}
                  fill="url(#gradTotal)" name="Total"
                />
                <Area
                  type="monotone" dataKey="livrees"
                  stroke="#16a34a" strokeWidth={2}
                  fill="url(#gradLivrees)" name="Livrées"
                />
                <Line
                  type="monotone" dataKey="retournees"
                  stroke="#ef4444" strokeWidth={2}
                  dot={{ r: 4 }} name="Retournées"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition statuts + types */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Répartition des statuts
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={dataPie}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {dataPie.map((_, i) => (
                      <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Types de livraison
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataType} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="type_livraison" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Commandes" radius={[4, 4, 0, 0]}>
                    {dataType.map((_, i) => (
                      <Cell key={i} fill={COLORS_TYPE[i % COLORS_TYPE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}

      {/* ── ONGLET GÉOGRAPHIE ─────────────────────────────────── */}
      {onglet === 'geographic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Par gouvernorat */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Commandes par gouvernorat (Top 8)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={par_gouvernorat} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dest_gouvernorat" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total"   name="Total"   radius={[4, 4, 0, 0]}>
                  {par_gouvernorat.map((_, i) => (
                    <Cell key={i} fill={COLORS_GOUV[i % COLORS_GOUV.length]} />
                  ))}
                </Bar>
                <Bar dataKey="livrees" name="Livrées" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top retours par zone */}
          {top_retours.length > 0 && (
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                ⚠️ Zones avec le plus de retours
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {top_retours.map((zone, i) => {
                  const total_zone = par_gouvernorat.find(
                    g => g.dest_gouvernorat === zone.dest_gouvernorat
                  )?.total || zone.total
                  const pct = Math.round(zone.total / total_zone * 100)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ minWidth: 120, fontSize: 13, fontWeight: 600 }}>
                        {zone.dest_gouvernorat}
                      </div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 4,
                          background: pct > 40 ? '#ef4444' : pct > 20 ? '#d97706' : '#16a34a',
                        }} />
                      </div>
                      <div style={{ minWidth: 80, textAlign: 'right', fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>{zone.total}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── ONGLET FINANCIER ──────────────────────────────────── */}
      {onglet === 'financier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Résumé financier */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div className="card" style={{ padding: '20px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Collecté total</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', fontFamily: 'var(--font-display)' }}>
                {kpi.montant_collecte.toFixed(3)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>TND</div>
            </div>
            <div className="card" style={{ padding: '20px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Perdu (retours + annulations)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-display)' }}>
                {kpi.montant_perdu.toFixed(3)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>TND</div>
            </div>
            <div className="card" style={{ padding: '20px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Taux de perte</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-display)' }}>
                {kpi.taux_retour}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</div>
            </div>
          </div>

          {/* Évolution montants mensuels */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Montants collectés sur 6 mois
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolution_mensuelle} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" TND" />
                <Tooltip content={<TooltipMontant />} />
                <Legend />
                <Bar
                  dataKey="montant"
                  name="Montant (TND)"
                  fill="#1E4D7B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau mensuel détaillé */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                Détail mensuel
              </h3>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mois</th>
                    <th>Total</th>
                    <th>Livrées</th>
                    <th>Retournées</th>
                    <th>Annulées</th>
                    <th>Montant collecté</th>
                    <th>Taux réussite</th>
                  </tr>
                </thead>
                <tbody>
                  {evolution_mensuelle.map((m, i) => {
                    const taux = m.total > 0 ? Math.round(m.livrees / m.total * 100) : 0
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{m.mois}</td>
                        <td style={{ textAlign: 'center' }}>{m.total}</td>
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{m.livrees}</td>
                        <td style={{ textAlign: 'center', color: '#ef4444' }}>{m.retournees}</td>
                        <td style={{ textAlign: 'center', color: '#6b7280' }}>{m.annulees}</td>
                        <td style={{ fontWeight: 700, color: '#1E4D7B' }}>{m.montant.toFixed(3)} TND</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                width: `${taux}%`, height: '100%', borderRadius: 3,
                                background: taux >= 80 ? '#16a34a' : taux >= 60 ? '#d97706' : '#ef4444',
                              }} />
                            </div>
                            <span style={{
                              fontSize: 12, fontWeight: 700, minWidth: 36,
                              color: taux >= 80 ? '#16a34a' : taux >= 60 ? '#d97706' : '#ef4444',
                            }}>
                              {taux}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}