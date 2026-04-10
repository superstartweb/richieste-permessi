'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

// Helper funzioni calendario fuori dal componente
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()
const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

export default function DashboardPage() {
  const [richieste, setRichieste] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>('') 
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmp, setNewEmp] = useState({ nome: '', cognome: '', email: '', telefono: '' })
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ tipo: 'FERIE', data_inizio: '', data_fine: '', ora_inizio: '', ora_fine: '', protocollo: '' })

  useEffect(() => { initDashboard() }, [])

  async function initDashboard() {
    setLoading(true)
    // TypeScript fix: definiamo esplicitamente il tipo
    let email: string | null = null;
    
    // Recupero mail da localStorage (per dipendenti)
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('todde_user_email') : null;
    email = storedEmail;

    // Recupero mail da Auth (per Admin)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.email) {
      email = user.email
    }

    if (email) {
      const { data: profile } = await supabase.from('todde_profiles').select('*').eq('email', email.toLowerCase().trim()).maybeSingle()
      if (profile) {
        setUserProfile(profile)
        const isAdm = profile.ruolo?.toLowerCase() === 'admin'
        setActiveTab(isAdm ? 'gestione' : 'nuova')
        await fetchAllData(isAdm, profile.id)
      } else { window.location.href = '/' }
    } else { window.location.href = '/' }
    setLoading(false)
  }

  async function fetchAllData(isAdmin: boolean, userId: string) {
    let rQuery = supabase.from('todde_richieste').select('*, todde_profiles(nome, cognome, telefono, email)')
    if (!isAdmin) rQuery = rQuery.eq('dipendente_id', userId)
    const { data: rData } = await rQuery.order('created_at', { ascending: false })
    if (rData) setRichieste(rData)
    if (isAdmin) {
      const { data: pData } = await supabase.from('todde_profiles').select('*').order('cognome')
      if (pData) setProfiles(pData)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('todde_profiles').insert([{ ...newEmp, ruolo: 'employee' }])
    if (error) alert(error.message)
    else {
      alert("Dipendente aggiunto!"); 
      window.open(`https://wa.me/${newEmp.telefono}?text=Ciao ${newEmp.nome}, accedi qui con la tua mail: [URL_APP]`)
      setNewEmp({ nome: '', cognome: '', email: '', telefono: '' })
      setShowAddForm(false); fetchAllData(true, userProfile.id)
    }
  }

  const handleInvia = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, dipendente_id: userProfile.id, stato: 'in_attesa' }
    if (editId) await supabase.from('todde_richieste').update(payload).eq('id', editId)
    else await supabase.from('todde_richieste').insert([payload])
    alert("Inviata!"); setEditId(null); setForm({ tipo: 'FERIE', data_inizio: '', data_fine: '', ora_inizio: '', ora_fine: '', protocollo: '' })
    fetchAllData(userProfile.ruolo === 'admin', userProfile.id)
  }

  const exportExcel = () => {
    const data = richieste.map(r=>({Dipendente:`${r.todde_profiles?.nome} ${r.todde_profiles?.cognome}`, Tipo:r.tipo, Dal:r.data_inizio, Stato:r.stato}))
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Dati"); XLSX.writeFile(wb, "Report_Todde.xlsx")
  }

  const isAdmin = userProfile?.ruolo?.toLowerCase() === 'admin'

  if (loading || !activeTab) return <div className="p-20 text-center font-bold text-blue-700 animate-pulse">CARICAMENTO TODDE HUB...</div>

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10 font-sans uppercase">
      <nav className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-blue-800 tracking-tighter">Todde Bus Hub</h1>
            <button onClick={() => {localStorage.clear(); supabase.auth.signOut(); window.location.href='/'}} className="text-[10px] bg-slate-100 p-2 rounded-lg font-bold">ESCI</button>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {isAdmin && (
              <>
                <TabBtn active={activeTab === 'gestione'} onClick={() => setActiveTab('gestione')} label="GESTIONE" />
                <TabBtn active={activeTab === 'anagrafica'} onClick={() => setActiveTab('anagrafica')} label="DIPENDENTI" />
                <TabBtn active={activeTab === 'calendario'} onClick={() => setActiveTab('calendario')} label="CALENDARIO" />
                <TabBtn onClick={exportExcel} active={false} label="EXCEL" />
              </>
            )}
            <TabBtn active={activeTab === 'nuova'} onClick={() => {setActiveTab('nuova'); setEditId(null)}} label="INVIA RICHIESTA" />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4">
        {isAdmin && activeTab === 'gestione' && (
          <div className="space-y-4">
            <input type="text" placeholder="Cerca dipendente..." className="w-full p-5 rounded-3xl border-none shadow-md font-bold outline-none" onChange={(e)=>setSearchTerm(e.target.value.toLowerCase())} />
            {richieste.filter(r => `${r.todde_profiles?.nome} ${r.todde_profiles?.cognome}`.toLowerCase().includes(searchTerm)).map(r => (
              <CardRichiesta key={r.id} r={r} isAdmin={true} onRefresh={()=>fetchAllData(true, userProfile.id)} onEdit={()=>{setForm({tipo:r.tipo, data_inizio:r.data_inizio, data_fine:r.data_fine, ora_inizio:r.ora_inizio||'', ora_fine:r.ora_fine||'', protocollo:''}); setEditId(r.id); setActiveTab('nuova')}} />
            ))}
          </div>
        )}

        {isAdmin && activeTab === 'anagrafica' && (
          <div className="space-y-4">
            <button onClick={() => setShowAddForm(!showAddForm)} className="w-full bg-blue-700 text-white p-5 rounded-3xl font-bold shadow-lg uppercase">+ NUOVO DIPENDENTE</button>
            {showAddForm && (
              <form onSubmit={handleAddEmployee} className="bg-white p-8 rounded-[40px] shadow-xl space-y-4 border-2 border-blue-50">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="NOME" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold" required onChange={e=>setNewEmp({...newEmp, nome:e.target.value})} />
                  <input type="text" placeholder="COGNOME" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold" required onChange={e=>setNewEmp({...newEmp, cognome:e.target.value})} />
                </div>
                <input type="email" placeholder="EMAIL" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" required onChange={e=>setNewEmp({...newEmp, email:e.target.value})} />
                <input type="text" placeholder="TELEFONO" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" required onChange={e=>setNewEmp({...newEmp, telefono:e.target.value})} />
                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-2xl font-bold uppercase">SALVA E INVITA</button>
              </form>
            )}
            <div className="grid gap-3">
              {profiles.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-[30px] flex justify-between items-center shadow-sm border border-slate-100">
                  <div className="font-bold text-sm tracking-tight">{p.cognome} {p.nome} <span className="block text-[9px] text-slate-400 normal-case">{p.email}</span></div>
                  <div className="flex gap-2">
                    <button onClick={async () => { if(confirm('Eliminare?')) { await supabase.from('todde_profiles').delete().eq('id', p.id); fetchAllData(true, userProfile.id) }}} className="bg-red-50 text-red-600 p-3 rounded-2xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg></button>
                    <a href={`https://wa.me/${p.telefono}`} target="_blank" className="bg-green-500 text-white p-3 rounded-2xl shadow-lg"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.041-.54c1.192.656 2.091 1.037 3.247 1.037 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm3.303 8.303c-.116.327-.674.591-.926.629-.252.038-.558.077-1.488-.269-1.077-.393-2.071-1.439-2.559-2.094-.044-.059-.393-.524-.393-1.006 0-.482.252-.719.342-.816.089-.097.195-.121.258-.121.064 0 .128.001.183.003.058.002.136-.022.213.161.078.183.268.653.292.702.024.049.041.106.008.172-.032.067-.048.109-.097.165-.049.056-.103.125-.147.168-.049.049-.1.103-.043.201.057.098.254.419.547.679.377.336.697.439.794.488.098.049.155.04.213-.024s.252-.292.319-.389c.067-.097.135-.081.227-.049.091.033.578.273.678.323.1.049.167.073.191.114.024.04.024.236-.092.563z"/></svg></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'calendario' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[45px] shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex gap-2">
                  <button onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-3 bg-slate-100 rounded-full font-black">←</button>
                  <button onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-3 bg-slate-100 rounded-full font-black">→</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-2 font-bold text-[10px] text-slate-400 text-center uppercase tracking-widest">{['Dom','Lun','Mar','Mer','Gio','Ven','Sab'].map(d=><div key={d}>{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-3 text-center font-bold">
                {[...Array(getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()))].map((_,i)=><div key={`e-${i}`} />)}
                {[...Array(getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()))].map((_,i)=>{
                  const d = i + 1; const ds = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const assenti = richieste.filter(r => r.stato === 'approvato' && (r.data_inizio === ds || (r.data_fine >= ds && r.data_inizio <= ds)))
                  return (
                    <div key={d} onClick={()=>setSelectedDate(ds)} className={`h-16 border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition ${selectedDate === ds ? 'border-blue-600 bg-blue-50' : assenti.length > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-transparent'}`}>
                      <span className="text-xs">{d}</span>
                      <div className="flex gap-1 mt-1">{assenti.slice(0,3).map(a=><div key={a.id} className="w-1.5 h-1.5 bg-orange-500 rounded-full" />)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            {selectedDate && (
              <div className="bg-white p-8 rounded-[40px] shadow-lg border-2 border-blue-100 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="font-black uppercase text-blue-800 mb-4 text-center tracking-tight text-lg underline decoration-blue-200">Assenti il {selectedDate}</h3>
                <div className="space-y-2">
                   {richieste.filter(r => r.stato === 'approvato' && (r.data_inizio === selectedDate || (r.data_fine >= selectedDate && r.data_inizio <= selectedDate))).map(r => (
                     <div key={r.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center font-bold uppercase text-xs">
                       <span>{r.todde_profiles?.nome} {r.todde_profiles?.cognome}</span>
                       <span className="bg-white px-3 py-1 rounded-full text-slate-400 text-[9px] shadow-sm font-black">{r.tipo}</span>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'nuova' && (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-[50px] shadow-2xl border-4 border-white font-sans uppercase">
            <h2 className="text-2xl font-black mb-10 text-center tracking-tighter decoration-blue-100">{editId ? 'Aggiorna Dati' : 'Invia Comunicazione'}</h2>
            <form onSubmit={handleInvia} className="space-y-8 text-center">
              <select className="w-full p-5 bg-slate-100 rounded-[30px] font-black border-none text-blue-800 text-center appearance-none outline-none" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="FERIE">FERIE</option>
                <option value="PERMESSO">PERMESSO (ORARIO)</option>
                <option value="MALATTIA">MALATTIA</option>
                <option value="CONGEDO">CONGEDO</option>
                <option value="LUTTO">LUTTO</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 mb-2 block">Inizio</label><input type="date" className="w-full p-5 bg-slate-100 rounded-[30px] font-black border-none text-center outline-none" value={form.data_inizio} onChange={e => setForm({...form, data_inizio: e.target.value})} required /></div>
                {form.tipo === 'PERMESSO' ? (
                   <div className="grid grid-cols-2 gap-2">
                     <input type="time" className="p-4 bg-slate-100 rounded-2xl" onChange={e=>setForm({...form, ora_inizio:e.target.value})} />
                     <input type="time" className="p-4 bg-slate-100 rounded-2xl" onChange={e=>setForm({...form, ora_fine:e.target.value})} />
                   </div>
                ) : (
                   <div><label className="text-[10px] font-black text-slate-400 mb-2 block">Fine (Opz.)</label><input type="date" className="w-full p-5 bg-slate-100 rounded-[30px] font-black border-none text-center outline-none" value={form.data_fine} onChange={e => setForm({...form, data_fine: e.target.value})} /></div>
                )}
              </div>
              <button type="submit" className="w-full bg-blue-700 text-white p-6 rounded-[35px] font-black text-xl shadow-xl uppercase active:scale-95 transition-all">Invia ora</button>
            </form>
            <div className="mt-10 space-y-4">
               <h3 className="font-black text-slate-400 text-[10px] ml-5 uppercase tracking-widest italic">Le mie richieste</h3>
               {richieste.filter(r => r.dipendente_id === userProfile?.id).map(r => (
                 <CardRichiesta key={r.id} r={r} isAdmin={false} />
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function TabBtn({active, onClick, label}: any) {
  return (
    <button onClick={onClick