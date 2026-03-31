import React, { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export default function LoginView({ onLogin }) {
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha!');
      return;
    }

    const endpoint = isRegistering ? '/auth/register' : '/auth/login';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message);
        return;
      }

      if (isRegistering) {
        setSuccessMessage('Conta criada com sucesso! Faça login agora.');
        setIsRegistering(false);
        setPassword('');
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        onLogin(data.user.role, data.user);
      }
    } catch (error) {
      setErrorMessage('Erro de comunicação. O servidor está rodando?');
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', padding: '1rem',
      background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-elevated) 100%)'
    }}>
      <div
        className="fade-up"
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '2.5rem', width: '100%',
          maxWidth: '420px', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}
      >
        {/* Header */}
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🧠</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
          Central de Estudos
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          {isRegistering ? 'Crie sua conta para começar.' : 'Faça login para acessar seus resumos.'}
        </p>

        {/* Seletor de Perfil */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
          marginBottom: '1.75rem', background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)', padding: '0.25rem'
        }}>
          {[
            { value: 'student', icon: '🎓', label: 'Aluno' },
            { value: 'teacher', icon: '👨‍🏫', label: 'Professor' }
          ].map(({ value, icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              style={{
                padding: '0.6rem 1rem', borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                transition: 'all 0.2s ease',
                background: role === value ? 'var(--accent)' : 'transparent',
                color: role === value ? '#fff' : 'var(--text-muted)',
                boxShadow: role === value ? '0 2px 8px rgba(var(--accent-rgb, 99,102,241), 0.35)' : 'none'
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Mensagens */}
        {errorMessage && (
          <div style={{
            background: '#ef444420', color: '#ef4444', padding: '0.75rem',
            borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem',
            border: '1px solid #ef444440'
          }}>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div style={{
            background: '#10b98120', color: '#10b981', padding: '0.75rem',
            borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem',
            border: '1px solid #10b98140'
          }}>
            {successMessage}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="email"
              className="input-field"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '0.85rem', width: '100%' }}
            />
            <input
              type="password"
              className="input-field"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '0.85rem', width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%', padding: '0.9rem', fontSize: '1rem',
              justifyContent: 'center', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {role === 'teacher' ? '👨‍🏫' : '🎓'}
            {isRegistering ? 'Criar Conta' : `Entrar como ${role === 'teacher' ? 'Professor' : 'Aluno'}`}
          </button>
        </form>

        <div
          onClick={() => { setIsRegistering(!isRegistering); setErrorMessage(''); setSuccessMessage(''); }}
          style={{ fontSize: '0.85rem', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isRegistering ? 'Já tem conta? Faça login aqui.' : 'Não tem conta? Registre-se aqui.'}
        </div>
      </div>
    </div>
  );
}