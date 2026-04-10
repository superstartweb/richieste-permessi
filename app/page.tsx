'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const cleanEmail = email.toLowerCase().trim()

    if (isAdminMode) {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) alert("Credenziali Amministratore non valide")
      else router.push('/dashboard')
    } else {
      // Login Dipendente: cerchiamo se la mail esiste nel database
      const { data, error } = await supabase
        .from('todde_profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (data) {
        localStorage.setItem('todde_user_email', data.email)
        router.push('/dashboard')
      } else {
        alert("Email non trovata. Verifica di aver inserito la mail corretta o contatta l'ufficio.")
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border-4 border-white">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-blue-700 uppercase tracking-tighter">Todde Bus Hub</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-[0.2em]">Portale Comunicazioni</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 ml-5 mb-2 block uppercase">Inserisci la tua email</label>
            <input 
              type="email" placeholder="nome@esempio.it" required
              className="w-full p-5 bg-slate-50 rounded-[25px] font-bold border-none text-center outline-none focus:ring-2 focus:ring-blue-500"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {isAdminMode && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-400 ml-5 mb-2 block uppercase">Password Admin</label>
              <input 
                type="password" placeholder="••••••••" required
                className="w-full p-5 bg-slate-50 rounded-[25px] font-bold border-none text-center outline-none focus:ring-2 focus:ring-blue-500"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-blue-700 text-white p-6 rounded-[30px] font-black text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all uppercase tracking-widest">
            {loading ? 'Entrata...' : 'Accedi'}
          </button>
        </form>

        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          className="w-full mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600"
        >
          {isAdminMode ? 'Sei un autista? Clicca qui' : 'Area Riservata Amministratore'}
        </button>
      </div>
    </div>
  )
}