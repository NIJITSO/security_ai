"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3001/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.user.role);
                localStorage.setItem('username', data.user.username);
                router.push('/');
            } else {
                setError(data.error || 'Erreur de connexion');
            }
        } catch (err) {
            setError('Impossible de contacter le serveur');
        }
        setLoading(false);
    };

    const roleInfo = [
        { role: 'admin', label: 'Administrateur', desc: 'Ajouter des étudiants', color: 'text-red-400' },
        { role: 'entreprise', label: 'Entreprise', desc: 'Valider les stages', color: 'text-blue-400' },
        { role: 'encadrant', label: 'Encadrant', desc: 'Valider rapports & notes', color: 'text-green-400' },
    ];

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                        Système d&apos;Évaluation Stage
                    </h1>
                    <p className="text-gray-400 text-sm">Blockchain Internship System</p>
                </div>

                <form onSubmit={handleLogin} className="glass p-8 space-y-5">
                    <h2 className="text-xl font-semibold text-center mb-2">Connexion</h2>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Nom d&apos;utilisateur</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin, entreprise, encadrant"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3 rounded-lg font-bold disabled:opacity-50 text-white"
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <div className="mt-6 glass p-4">
                    <p className="text-xs text-gray-500 mb-3 text-center">Comptes de démonstration</p>
                    <div className="space-y-2">
                        {roleInfo.map(r => (
                            <div key={r.role} className="flex justify-between items-center text-xs">
                                <span className={`font-semibold ${r.color}`}>{r.label}</span>
                                <span className="text-gray-500">{r.role} / {r.role}123</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
