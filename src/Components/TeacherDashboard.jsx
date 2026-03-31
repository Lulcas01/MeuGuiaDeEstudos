import React, { useState, useEffect, useCallback } from 'react';

const COLOR_OPTIONS = [
  { label: 'Azul',   key: 'bar-blue',   hex: '#3b82f6' },
  { label: 'Roxo',   key: 'bar-purple', hex: '#7c3aed' },
  { label: 'Verde',  key: 'bar-green',  hex: '#059669' },
  { label: 'Âmbar',  key: 'bar-amber',  hex: '#d97706' },
  { label: 'Rosa',   key: 'bar-rose',   hex: '#be123c' },
  { label: 'Ciano',  key: 'bar-cyan',   hex: '#0891b2' },
];
const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map(c => [c.key, c.hex]));

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3000${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Erro de API');
  return res.json();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1.25rem',
      display: 'flex', alignItems: 'center', gap: '1rem'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', padding: '2rem', width: '100%',
        maxWidth: 480, maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem',
            color: 'var(--text-muted)', lineHeight: 1
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TurmaCard({ turma, students, onEdit, onDelete, onManageStudents }) {
  const turmaStudents = students.filter(s => s.turmaId?._id === turma._id || s.turmaId === turma._id);
  const color = COLOR_MAP[turma.color] || '#3b82f6';

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Topo colorido */}
      <div style={{ height: 6, background: color }} />
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {turma.name}
            </h3>
            {turma.subject && (
              <span style={{
                fontSize: '0.75rem', background: `${color}20`, color,
                padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 600
              }}>{turma.subject}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => onEdit(turma)} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)'
            }}>✏️</button>
            <button onClick={() => onDelete(turma._id)} style={{
              background: '#ef444415', border: '1px solid #ef444430',
              borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', color: '#ef4444'
            }}>🗑️</button>
          </div>
        </div>

        {turma.schedule && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            🕐 {turma.schedule}
          </div>
        )}
        {turma.description && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            {turma.description}
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: '0.75rem', borderTop: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            👥 <strong style={{ color: 'var(--text-primary)' }}>{turmaStudents.length}</strong> alunos
          </div>
          <button onClick={() => onManageStudents(turma)} style={{
            background: `${color}20`, color, border: `1px solid ${color}40`,
            borderRadius: 6, padding: '0.35rem 0.8rem', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600
          }}>
            Ver Alunos →
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentRow({ student, turmas, onEdit, onDelete }) {
  const color = student.turmaId ? COLOR_MAP[student.turmaId.color] || '#3b82f6' : '#6b7280';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem',
      alignItems: 'center', padding: '0.85rem 1rem',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', marginBottom: '0.5rem'
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          {student.name}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{student.email}</div>
      </div>
      <div>
        {student.turmaId ? (
          <span style={{
            fontSize: '0.75rem', background: `${color}20`, color,
            padding: '0.2rem 0.7rem', borderRadius: 20, fontWeight: 600
          }}>
            {student.turmaId.name || '—'}
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem turma</span>
        )}
      </div>
      <button onClick={() => onEdit(student)} style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer',
        fontSize: '0.8rem', color: 'var(--text-secondary)'
      }}>✏️</button>
      <button onClick={() => onDelete(student._id)} style={{
        background: '#ef444415', border: '1px solid #ef444430',
        borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer',
        fontSize: '0.8rem', color: '#ef4444'
      }}>🗑️</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeacherDashboard({ userName, onLogout }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'turmas' | 'students'

  const [turmas, setTurmas] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [turmaModal, setTurmaModal] = useState(null);   // null | { mode: 'create'|'edit', data }
  const [studentModal, setStudentModal] = useState(null); // null | { mode, data }
  const [filterTurma, setFilterTurma] = useState(null);  // turma id filter for students tab

  // Forms
  const [turmaForm, setTurmaForm] = useState({ name: '', subject: '', color: 'bar-blue', schedule: '', description: '' });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', turmaId: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([api('/api/turmas'), api('/api/students')]);
      setTurmas(t);
      setStudents(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── TURMA CRUD ──
  const openCreateTurma = () => {
    setTurmaForm({ name: '', subject: '', color: 'bar-blue', schedule: '', description: '' });
    setTurmaModal({ mode: 'create' });
    setError('');
  };

  const openEditTurma = (turma) => {
    setTurmaForm({ name: turma.name, subject: turma.subject || '', color: turma.color || 'bar-blue', schedule: turma.schedule || '', description: turma.description || '' });
    setTurmaModal({ mode: 'edit', id: turma._id });
    setError('');
  };

  const saveTurma = async () => {
    if (!turmaForm.name.trim()) { setError('O nome da turma é obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      if (turmaModal.mode === 'create') {
        const t = await api('/api/turmas', { method: 'POST', body: JSON.stringify(turmaForm) });
        setTurmas(prev => [...prev, t]);
      } else {
        const t = await api(`/api/turmas/${turmaModal.id}`, { method: 'PUT', body: JSON.stringify(turmaForm) });
        setTurmas(prev => prev.map(x => x._id === t._id ? t : x));
      }
      setTurmaModal(null);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteTurma = async (id) => {
    if (!window.confirm('Deletar esta turma? Os alunos não serão removidos.')) return;
    try {
      await api(`/api/turmas/${id}`, { method: 'DELETE' });
      setTurmas(prev => prev.filter(t => t._id !== id));
      setStudents(prev => prev.map(s => (s.turmaId?._id === id || s.turmaId === id) ? { ...s, turmaId: null } : s));
    } catch (e) { setError(e.message); }
  };

  // ── STUDENT CRUD ──
  const openCreateStudent = (turmaId = '') => {
    setStudentForm({ name: '', email: '', turmaId, notes: '' });
    setStudentModal({ mode: 'create' });
    setError('');
  };

  const openEditStudent = (student) => {
    setStudentForm({
      name: student.name, email: student.email,
      turmaId: student.turmaId?._id || student.turmaId || '',
      notes: student.notes || ''
    });
    setStudentModal({ mode: 'edit', id: student._id });
    setError('');
  };

  const saveStudent = async () => {
    if (!studentForm.name.trim() || !studentForm.email.trim()) { setError('Nome e e-mail são obrigatórios.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...studentForm, turmaId: studentForm.turmaId || null };
      if (studentModal.mode === 'create') {
        const s = await api('/api/students', { method: 'POST', body: JSON.stringify(payload) });
        setStudents(prev => [...prev, s]);
      } else {
        const s = await api(`/api/students/${studentModal.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setStudents(prev => prev.map(x => x._id === s._id ? s : x));
      }
      setStudentModal(null);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Remover este aluno?')) return;
    try {
      await api(`/api/students/${id}`, { method: 'DELETE' });
      setStudents(prev => prev.filter(s => s._id !== id));
    } catch (e) { setError(e.message); }
  };

  // Filtered students for "Ver Alunos" view
  const visibleStudents = filterTurma
    ? students.filter(s => s.turmaId?._id === filterTurma || s.turmaId === filterTurma)
    : students;

  // ── RENDER ──
  const TABS = [
    { key: 'overview', icon: '📊', label: 'Visão Geral' },
    { key: 'turmas', icon: '🏫', label: 'Turmas' },
    { key: 'students', icon: '👥', label: 'Alunos' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Navbar */}
      <header style={{
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60, position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🧠</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Central de Estudos</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Painel do Professor
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            👨‍🏫 {userName}
          </span>
          <button onClick={onLogout} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.4rem 1rem', cursor: 'pointer',
            fontSize: '0.82rem', color: 'var(--text-secondary)'
          }}>Sair</button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '0.25rem', marginBottom: '2rem',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '0.3rem', width: 'fit-content'
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setFilterTurma(null); }} style={{
              padding: '0.5rem 1.2rem', borderRadius: 'calc(var(--radius) - 2px)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s',
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)'
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            Carregando dados...
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div className="fade-up">
                <h2 style={{ fontWeight: 800, fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                  Olá, Prof. {userName}! 👋
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <StatCard icon="🏫" label="Turmas" value={turmas.length} color="#3b82f6" />
                  <StatCard icon="👥" label="Alunos" value={students.length} color="#7c3aed" />
                  <StatCard icon="📚" label="Sem Turma" value={students.filter(s => !s.turmaId).length} color="#d97706" />
                </div>

                {/* Turmas resumo */}
                <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Suas Turmas</h3>
                {turmas.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏫</div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhuma turma criada ainda.</p>
                    <button onClick={() => { setTab('turmas'); openCreateTurma(); }} className="btn-primary" style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      + Criar Primeira Turma
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {turmas.map(turma => (
                      <TurmaCard
                        key={turma._id} turma={turma} students={students}
                        onEdit={openEditTurma} onDelete={deleteTurma}
                        onManageStudents={t => { setTab('students'); setFilterTurma(t._id); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TURMAS ── */}
            {tab === 'turmas' && (
              <div className="fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--text-primary)' }}>🏫 Turmas</h2>
                  <button onClick={openCreateTurma} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    + Nova Turma
                  </button>
                </div>

                {turmas.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏫</div>
                    <p style={{ color: 'var(--text-muted)' }}>Nenhuma turma criada. Crie a primeira!</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {turmas.map(turma => (
                      <TurmaCard
                        key={turma._id} turma={turma} students={students}
                        onEdit={openEditTurma} onDelete={deleteTurma}
                        onManageStudents={t => { setTab('students'); setFilterTurma(t._id); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STUDENTS ── */}
            {tab === 'students' && (
              <div className="fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                      👥 {filterTurma ? `Alunos — ${turmas.find(t => t._id === filterTurma)?.name}` : 'Todos os Alunos'}
                    </h2>
                    {filterTurma && (
                      <button onClick={() => setFilterTurma(null)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--accent)', fontSize: '0.82rem', padding: 0, marginTop: 4
                      }}>← Ver todos os alunos</button>
                    )}
                  </div>
                  <button onClick={() => openCreateStudent(filterTurma || '')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    + Novo Aluno
                  </button>
                </div>

                {/* Filtro de turma */}
                {!filterTurma && turmas.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {turmas.map(t => {
                      const c = COLOR_MAP[t.color] || '#3b82f6';
                      const count = students.filter(s => s.turmaId?._id === t._id || s.turmaId === t._id).length;
                      return (
                        <button key={t._id} onClick={() => setFilterTurma(t._id)} style={{
                          background: `${c}15`, border: `1px solid ${c}40`, color: c,
                          borderRadius: 20, padding: '0.3rem 0.9rem',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                        }}>
                          {t.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {visibleStudents.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👥</div>
                    <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno encontrado.</p>
                  </div>
                ) : (
                  <div>
                    {visibleStudents.map(s => (
                      <StudentRow key={s._id} student={s} turmas={turmas} onEdit={openEditStudent} onDelete={deleteStudent} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── MODAL TURMA ─── */}
      {turmaModal && (
        <Modal title={turmaModal.mode === 'create' ? '+ Nova Turma' : 'Editar Turma'} onClose={() => setTurmaModal(null)}>
          {error && <div style={{ background: '#ef444420', color: '#ef4444', padding: '0.7rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nome da Turma *</label>
              <input className="input-field" placeholder="Ex: Turma A — 2º Ano" value={turmaForm.name}
                onChange={e => setTurmaForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Matéria / Disciplina</label>
              <input className="input-field" placeholder="Ex: Matemática, Física..." value={turmaForm.subject}
                onChange={e => setTurmaForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Horário</label>
              <input className="input-field" placeholder="Ex: Seg e Qua, 14h–15h30" value={turmaForm.schedule}
                onChange={e => setTurmaForm(f => ({ ...f, schedule: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Descrição</label>
              <textarea className="input-field" placeholder="Observações sobre a turma..." value={turmaForm.description}
                onChange={e => setTurmaForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', resize: 'vertical', minHeight: 80 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Cor</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(c => (
                  <div key={c.key} onClick={() => setTurmaForm(f => ({ ...f, color: c.key }))} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c.hex,
                    cursor: 'pointer', border: turmaForm.color === c.key ? '3px solid var(--text-primary)' : '3px solid transparent'
                  }} title={c.label} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button onClick={() => setTurmaModal(null)} style={{
              flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600
            }}>Cancelar</button>
            <button onClick={saveTurma} disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? '...' : (turmaModal.mode === 'create' ? 'Criar Turma' : 'Salvar')}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL ALUNO ─── */}
      {studentModal && (
        <Modal title={studentModal.mode === 'create' ? '+ Novo Aluno' : 'Editar Aluno'} onClose={() => setStudentModal(null)}>
          {error && <div style={{ background: '#ef444420', color: '#ef4444', padding: '0.7rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nome do Aluno *</label>
              <input className="input-field" placeholder="Nome completo" value={studentForm.name}
                onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>E-mail *</label>
              <input className="input-field" type="email" placeholder="aluno@escola.com" value={studentForm.email}
                onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Turma</label>
              <select className="input-field" value={studentForm.turmaId}
                onChange={e => setStudentForm(f => ({ ...f, turmaId: e.target.value }))}
                style={{ width: '100%' }}>
                <option value="">— Sem turma —</option>
                {turmas.map(t => <option key={t._id} value={t._id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Observações</label>
              <textarea className="input-field" placeholder="Notas sobre o aluno..." value={studentForm.notes}
                onChange={e => setStudentForm(f => ({ ...f, notes: e.target.value }))}
                style={{ width: '100%', resize: 'vertical', minHeight: 80 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button onClick={() => setStudentModal(null)} style={{
              flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600
            }}>Cancelar</button>
            <button onClick={saveStudent} disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? '...' : (studentModal.mode === 'create' ? 'Adicionar Aluno' : 'Salvar')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
