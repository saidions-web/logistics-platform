// frontend/src/pages/entreprise/RapportEntreprise.jsx
import { useState, useEffect } from 'react'
import {
  TrendingUp, Package, CheckCircle, RotateCcw,
  Users, Route, RefreshCw
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { entrepriseApi } from '../../services/api'

// recharts est déjà dans les dépendances disponibles du projet

const COLORS_PIE   = ['#1E4D7B', '#16a34a', '#ef4444', '#d97706']
const COLORS_GOUV  = ['#1E4D7B', '#2563A8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff']

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon: Icon, suffix = '' }) {
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
        <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
          {value}{suffix}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}

export default function RapportEntreprise() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await entrepriseApi.rapport()
      setData(res.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="empty-state"><p>Chargement du rapport...</p></div>
  if (!data)   return <div className="empty-state"><p>Impossible de charger le rapport.</p></div>

  const { kpi, evolution_mensuelle, par_gouvernorat, perf_livreurs, tournees_stats } = data

  // Données camembert statuts
  const dataPie = [
    { name: 'Livrées',    value: kpi.livrees    },
    { name: 'En cours',   value: kpi.en_cours   },
    { name: 'Retournées', value: kpi.retournees },
    { name: 'Annulées',   value: kpi.annulees   },
  ].filter(d => d.value > 0)

  // Données camembert tournées
  const dataTournees = [
    { name: 'Planifiées', value: tournees_stats.planifiees },
    { name: 'En cours',   value: tournees_stats.en_cours   },
    { name: 'Terminées',  value: tournees_stats.terminees  },
    { name: 'Annulées',   value: tournees_stats.annulees   },
  ].filter(d => d.value > 0)

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Rapport d'activité
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Vue d'ensemble de vos performances logistiques
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <KpiCard label="Total commandes"   value={kpi.total}          color="#1E4D7B" icon={Package}     />
        <KpiCard label="Livrées"           value={kpi.livrees}        color="#16a34a" icon={CheckCircle} />
        <KpiCard label="Taux de réussite"  value={kpi.taux_reussite}  color="#2563A8" icon={TrendingUp}  suffix="%" />
        <KpiCard label="Retournées"        value={kpi.retournees}     color="#ef4444" icon={RotateCcw}   />
      </div>

      {/* Ligne 2 : Évolution mensuelle + Répartition statuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Graphe lignes — évolution mensuelle */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Évolution sur 6 mois
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolution_mensuelle} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total"     stroke="#1E4D7B" strokeWidth={2} dot={{ r: 4 }} name="Total" />
              <Line type="monotone" dataKey="livrees"   stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Livrées" />
              <Line type="monotone" dataKey="retournees" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Retournées" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Camembert — répartition statuts */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Répartition des statuts
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={dataPie}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {dataPie.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ligne 3 : Par gouvernorat + Tournées */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Barres — par gouvernorat */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Commandes par gouvernorat (Top 8)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={par_gouvernorat} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dest_gouvernorat" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" name="Commandes" radius={[4, 4, 0, 0]}>
                {par_gouvernorat.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_GOUV[index % COLORS_GOUV.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Camembert — statuts tournées */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Statuts des tournées
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={dataTournees}
                cx="50%"
                cy="50%"
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {dataTournees.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ligne 4 : Performance livreurs */}
      {perf_livreurs.length > 0 && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Performance des livreurs
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perf_livreurs} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="nom" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [
                  name === 'taux' ? `${value}%` : value,
                  name === 'taux' ? 'Taux de réussite' : name === 'livrees' ? 'Livrées' : 'Total'
                ]}
              />
              <Legend />
              <Bar dataKey="total"   name="Total"   fill="#1E4D7B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="livrees" name="Livrées" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Tableau récapitulatif */}
          <div className="table-wrapper" style={{ marginTop: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Livreur</th>
                  <th>Tournées terminées</th>
                  <th>Livraisons totales</th>
                  <th>Livrées</th>
                  <th>Taux de réussite</th>
                </tr>
              </thead>
              <tbody>
                {perf_livreurs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{l.nom}</td>
                    <td style={{ textAlign: 'center' }}>{l.nb_tournees}</td>
                    <td style={{ textAlign: 'center' }}>{l.total}</td>
                    <td style={{ textAlign: 'center' }}>{l.livrees}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${l.taux}%`, height: '100%', borderRadius: 3,
                            background: l.taux >= 80 ? '#16a34a' : l.taux >= 60 ? '#d97706' : '#ef4444',
                          }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40, color: l.taux >= 80 ? '#16a34a' : l.taux >= 60 ? '#d97706' : '#ef4444' }}>
                          {l.taux}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}