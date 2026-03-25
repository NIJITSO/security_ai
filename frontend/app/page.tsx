"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:3001';

export default function Home() {
    const [user, setUser] = useState<{ username: string; role: string } | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [newStudentName, setNewStudentName] = useState("");
    const [loading, setLoading] = useState(false);
    const [noteInputs, setNoteInputs] = useState<Record<number, string>>({});
    const [pageLoading, setPageLoading] = useState(true);
    const router = useRouter();

    const getToken = () => localStorage.getItem('token');

    const fetchStudents = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/students`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            if (data.students) setStudents(data.students);
        } catch (e) {
            console.log("Error fetching students", e);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');

        if (!token || !role || !username) {
            router.push('/login');
            return;
        }

        setUser({ username, role });
        setPageLoading(false);
        fetchStudents();
    }, [router, fetchStudents]);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        router.push('/login');
    };

    const callBackend = async (endpoint: string, data: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(data)
            });
            if (res.status === 401) { logout(); return; }
            if (res.status === 403) {
                alert("Accès interdit pour votre rôle");
                setLoading(false);
                return;
            }
            const result = await res.json();
            if (result.success) {
                if (result.certificatGenere) {
                    alert("✅ Note attribuée et certificat généré automatiquement!");
                } else {
                    alert("✅ Action réussie!");
                }
                fetchStudents();
            } else {
                alert("❌ Erreur: " + (result.error || 'Erreur inconnue'));
            }
        } catch (err: any) {
            alert("❌ Erreur réseau: " + (err.message || 'Impossible de contacter le serveur'));
            console.error(err);
        }
        setLoading(false);
    };

    const downloadCertificate = async (studentId: number, studentName: string) => {
        try {
            const res = await fetch(`${API_URL}/certificat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ studentId })
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = studentName.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_');
                a.download = `Certificat_${safeName}.pdf`;
                a.click();
            } else {
                const data = await res.json();
                if (data.missing) {
                    alert("❌ " + data.error + "\n\n" + data.missing.join("\n"));
                } else {
                    alert("❌ Erreur: " + data.error);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (pageLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p className="text-gray-400">Chargement...</p>
            </main>
        );
    }

    const role = user?.role;

    const getRoleBadge = () => {
        const styles: Record<string, string> = {
            admin: 'bg-red-500/20 text-red-400 border-red-500/30',
            entreprise: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            encadrant: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
        const labels: Record<string, string> = {
            admin: 'Administrateur',
            entreprise: 'Entreprise',
            encadrant: 'Encadrant'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[role || '']}`}>
                {labels[role || ''] || role}
            </span>
        );
    };

    return (
        <main className="min-h-screen p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Système d&apos;Évaluation Stage Blockchain
                </h1>
                <div className="flex items-center gap-3">
                    {getRoleBadge()}
                    <div className="glass px-4 py-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        <span className="text-sm font-mono">{user?.username}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="glass px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        Déconnexion
                    </button>
                </div>
            </div>

            <section className="grid md:grid-cols-3 gap-8 mb-12">
                {/* Add Student — admin only */}
                {role === 'admin' && (
                    <div className="glass p-6 md:col-span-1">
                        <h2 className="text-xl font-semibold mb-4">Ajouter un Étudiant</h2>
                        <input
                            type="text"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            placeholder="Nom de l'étudiant"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button
                            onClick={() => {
                                if (!newStudentName) return alert("Nom requis");
                                callBackend('/student/add', { name: newStudentName });
                                setNewStudentName("");
                            }}
                            disabled={loading}
                            className="btn-primary w-full py-2 rounded-lg font-bold disabled:opacity-50"
                        >
                            {loading ? 'Inscription...' : 'Inscrire'}
                        </button>
                    </div>
                )}

                {/* Student List */}
                <div className={role === 'admin' ? 'md:col-span-2' : 'md:col-span-3'}>
                    <h2 className="text-xl font-semibold mb-6">Liste des Étudiants</h2>
                    <div className="space-y-4">
                        {students.length === 0 && (
                            <div className="text-center py-12 glass text-gray-400">
                                Aucun étudiant trouvé sur la blockchain.
                            </div>
                        )}
                        {students.map((s) => (
                            <div key={s.id} className="glass p-5 border-l-4 border-purple-500">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold">{s.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono">ID: {s.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">Note: {s.note}/20</p>
                                        <p className={`text-xs ${s.certificat ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {s.certificat ? '✅ Certificat généré' : 'Certificat en attente'}
                                        </p>
                                    </div>
                                </div>

                                {/* Status indicators */}
                                <div className="flex gap-2 mb-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.stageValide ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {s.stageValide ? '✓ Stage validé' : '○ Stage en attente'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.rapportValide ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {s.rapportValide ? '✓ Rapport validé' : '○ Rapport en attente'}
                                    </span>
                                </div>

                                {/* Role-based action buttons */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                    {/* Entreprise: Valider Stage */}
                                    {role === 'entreprise' && (
                                        <button
                                            onClick={() => callBackend('/stage/valider', { studentId: s.id })}
                                            disabled={s.stageValide || loading}
                                            className={`text-xs py-1.5 rounded font-bold ${s.stageValide ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40'}`}
                                        >
                                            {s.stageValide ? '✓ Stage Validé' : 'Valider Stage'}
                                        </button>
                                    )}

                                    {/* Encadrant: Valider Rapport */}
                                    {role === 'encadrant' && (
                                        <button
                                            onClick={() => callBackend('/rapport/valider', { studentId: s.id })}
                                            disabled={s.rapportValide || loading}
                                            className={`text-xs py-1.5 rounded font-bold ${s.rapportValide ? 'bg-green-500/20 text-green-400' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40'}`}
                                        >
                                            {s.rapportValide ? '✓ Rapport Validé' : 'Valider Rapport'}
                                        </button>
                                    )}

                                    {/* Encadrant: Saisir Note — inline input + button */}
                                    {role === 'encadrant' && (
                                        <div className="col-span-2 flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={20}
                                                value={noteInputs[s.id] ?? ''}
                                                onChange={(e) => setNoteInputs({ ...noteInputs, [s.id]: e.target.value })}
                                                placeholder="0-20"
                                                className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <button
                                                onClick={() => {
                                                    const val = parseInt(noteInputs[s.id]);
                                                    if (isNaN(val) || val < 0 || val > 20) {
                                                        return alert('La note doit être entre 0 et 20');
                                                    }
                                                    callBackend('/note', { studentId: s.id, note: val });
                                                    setNoteInputs({ ...noteInputs, [s.id]: '' });
                                                }}
                                                disabled={loading}
                                                className="text-xs py-1.5 px-3 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 font-bold whitespace-nowrap"
                                            >
                                                Saisir Note
                                            </button>
                                        </div>
                                    )}

                                    {/* Certificate Section — eligibility + download */}
                                    <div className="col-span-2 lg:col-span-4 mt-2">
                                        {s.certificat ? (
                                            <button
                                                onClick={() => downloadCertificate(s.id, s.name)}
                                                disabled={loading}
                                                className="w-full text-sm py-2 rounded bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 font-bold transition-all"
                                            >
                                                📄 Télécharger Certificat — {s.name}
                                            </button>
                                        ) : (
                                            <div className="glass p-3 border border-yellow-500/20 rounded-lg">
                                                <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Certificat non disponible — Conditions manquantes :</p>
                                                <ul className="space-y-1">
                                                    {!s.stageValide && (
                                                        <li className="text-[11px] text-red-400 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                                                            Stage non validé <span className="text-gray-500">(par l&apos;entreprise)</span>
                                                        </li>
                                                    )}
                                                    {!s.rapportValide && (
                                                        <li className="text-[11px] text-red-400 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                                                            Rapport non validé <span className="text-gray-500">(par l&apos;encadrant)</span>
                                                        </li>
                                                    )}
                                                    {s.note <= 10 && (
                                                        <li className="text-[11px] text-red-400 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                                                            Note insuffisante : {s.note}/20 <span className="text-gray-500">(doit être &gt; 10)</span>
                                                        </li>
                                                    )}
                                                    {s.stageValide && s.rapportValide && s.note > 10 && (
                                                        <li className="mt-2">
                                                            <button
                                                                onClick={() => callBackend('/certificat/generer', { studentId: s.id })}
                                                                disabled={loading}
                                                                className="w-full text-xs py-2 rounded bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 font-bold transition-all"
                                                            >
                                                                🎓 Générer le Certificat maintenant
                                                            </button>
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
