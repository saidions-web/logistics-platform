import { useState, useEffect } from 'react'

import { Eye, Plus, Trash2, DollarSign } from 'lucide-react'

import { recommandationApi } from '../../services/api'
 
const GOUVERNORATS = [

  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba',

  'Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine',

  'Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse',

  'Tataouine','Tozeur','Tunis','Zaghouan',

]
 
export default function Tarifs() {

  const [tarifs, setTarifs] = useState([])

  const [loading, setLoading] = useState(true)

  const [showTable, setShowTable] = useState(false)
 
  const [form, setForm] = useState({

    gouvernorat: '',

    poids_min: '',

    poids_max: '',

    prix: '',

    delai_jours: '',

  })
 
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
 
  // ── Load tarifs ─────────────────────────────

  const load = async () => {

    setLoading(true)

    try {

      const res = await recommandationApi.getTarifs()

      setTarifs(res.data)

    } catch {

      setTarifs([])

    } finally {

      setLoading(false)

    }

  }
 
  useEffect(() => {

    load()

  }, [])
 
  // ── Ajouter tarif ───────────────────────────

  const handleAdd = async () => {

    try {

      await recommandationApi.addTarif(form)

      setForm({

        gouvernorat: '',

        poids_min: '',

        poids_max: '',

        prix: '',

        delai_jours: '',

      })

      load()

    } catch {

      alert('Erreur ajout tarif')

    }

  }
 
  // ── Supprimer tarif ─────────────────────────

  const handleDelete = async (id) => {

    if (!confirm('Supprimer ce tarif ?')) return

    await recommandationApi.deleteTarif(id)

    load()

  }
 
  return (
<div className="animate-fade-up">
 
      {/* ── Header ── */}
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
<div>
<h2 style={{ fontSize: 26, fontWeight: 700 }}>Gestion des tarifs</h2>
<p style={{ fontSize: 14, color: 'gray' }}>

            Ajoutez et consultez vos tarifs
</p>
</div>
 
        {/* Bouton afficher tableau */}
<button

          className="btn btn-secondary btn-sm"

          onClick={() => setShowTable(!showTable)}
>
<Eye size={14} /> {showTable ? 'Masquer' : 'Afficher'}
</button>
</div>
 
      {/* ── Formulaire ── */}
<div className="card" style={{ marginBottom: 25 }}>
<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
 
          <select className="form-select" value={form.gouvernorat} onChange={set('gouvernorat')}>
<option value="">Gouvernorat</option>

            {GOUVERNORATS.map(g => (
<option key={g} value={g}>{g}</option>

            ))}
</select>
 
          <input className="form-input" placeholder="Poids min"

            value={form.poids_min} onChange={set('poids_min')} />
 
          <input className="form-input" placeholder="Poids max"

            value={form.poids_max} onChange={set('poids_max')} />
 
          <input className="form-input" placeholder="Prix"

            value={form.prix} onChange={set('prix')} />
 
          <input className="form-input" placeholder="Délai"

            value={form.delai_jours} onChange={set('delai_jours')} />
 
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>
<Plus size={14} /> Ajouter
</button>
 
        </div>
</div>
 
      {/* ── Tableau (conditionnel) ── */}

      {showTable && (

        loading ? (
<div className="empty-state">Chargement...</div>

        ) : tarifs.length === 0 ? (
<div className="empty-state">
<DollarSign />
<p>Aucun tarif ajouté</p>
</div>

        ) : (
<div className="card">
<div className="table-wrapper">
<table>
<thead>
<tr>
<th>Gouvernorat</th>
<th>Poids</th>
<th>Prix</th>
<th>Délai</th>
<th></th>
</tr>
</thead>
 
                <tbody>

                  {tarifs.map(t => (
<tr key={t.id}>
<td>{t.gouvernorat}</td>
<td>{t.poids_min} - {t.poids_max} kg</td>
<td>{t.prix} TND</td>
<td>{t.delai_jours} j</td>
<td>
<button

                          className="btn btn-ghost btn-sm"

                          onClick={() => handleDelete(t.id)}
>
<Trash2 size={14} />
</button>
</td>
</tr>

                  ))}
</tbody>
 
              </table>
</div>
</div>

        )

      )}
 
    </div>

  )

}
 