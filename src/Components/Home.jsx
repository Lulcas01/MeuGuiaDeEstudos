import React, { useState } from 'react';
import { getTodayDate, formatDateBR } from '../App'; 

const COLOR_OPTIONS = [
  { label: 'Azul',   key: 'bar-blue',   preview: '#3b82f6' },
  { label: 'Roxo',   key: 'bar-purple', preview: '#7c3aed' },
  { label: 'Verde',  key: 'bar-green',  preview: '#059669' },
  { label: 'Âmbar',  key: 'bar-amber',  preview: '#d97706' },
  { label: 'Rosa',   key: 'bar-rose',   preview: '#be123c' },
  { label: 'Ciano',  key: 'bar-cyan',   preview: '#0891b2' },
];

function getFeynmanForSubject(topics) {
  if (!topics.length) return null;
  const explained = topics.filter(t => t.feynman?.includes('Explicado')).length;
  const total = topics.length;
  return Math.round((explained / total) * 100);
}

const COLOR_MAP = {
  'bar-blue': '#3b82f6', 'bar-purple': '#7c3aed', 'bar-green': '#059669',
  'bar-amber': '#d97706', 'bar-rose': '#be123c', 'bar-cyan': '#0891b2'
};

function calculatePriority(topic, subject, todayDate) {
  let score = 0;
  const tags = [];
  const today = new Date(todayDate + 'T00:00:00');

  // Verifica o prazo do tópico ou o PRAZO MAIS PRÓXIMO da matéria
  let effectiveDeadline = topic.deadline;
  if (!effectiveDeadline && subject?.deadlines?.length > 0) {
    const futureDeadlines = subject.deadlines.filter(d => d.date >= todayDate).sort((a,b) => a.date.localeCompare(b.date));
    if (futureDeadlines.length > 0) effectiveDeadline = futureDeadlines[0].date;
  }

  if (effectiveDeadline) {
    const deadlineDate = new Date(effectiveDeadline + 'T00:00:00');
    const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    if (daysToDeadline >= 0 && daysToDeadline <= 2) { score += 300; tags.push('🚨 Urgente'); }
    else if (daysToDeadline > 2 && daysToDeadline <= 7) { score += 150; tags.push('⚠️ Prazo Curto'); }
    else if (daysToDeadline > 7 && daysToDeadline <= 15) { score += 50; }
  }

  if (topic.nextReviewDate && topic.nextReviewDate <= todayDate) {
    const reviewDate = new Date(topic.nextReviewDate + 'T00:00:00');
    const diffDays = Math.ceil((today - reviewDate) / (1000 * 60 * 60 * 24));
    score += 100 + (diffDays * 10);
    tags.push('🧠 Revisar');
  }

  const domainScore = (5 - (topic.domain || 1)) * 20;
  score += domainScore;
  if (topic.domain <= 2) tags.push('🔴 Ponto Fraco');

  return { score, tags: tags.slice(0, 2) };
}

export default function HomeView({ 
  subjects, topics, onOpenSubject, onAddSubject, onDeleteSubject, 
  onAddSubjectDeadline, onRemoveSubjectDeadline 
}) {
  const [newName, setNewName] = useState('');
  const [colorKey, setColorKey] = useState('bar-blue');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Estados temporários para os formulários de adição de datas
  const [newDeadlineTitle, setNewDeadlineTitle] = useState({});
  const [newDeadlineDate, setNewDeadlineDate] = useState({});

  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const todayDate = getTodayDate();
  const pendingReviews = topics.filter(t => t.nextReviewDate && t.nextReviewDate <= todayDate).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddSubject(newName.trim(), colorKey);
    setNewName('');
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); };

  // Agrupa TODAS as datas de provas da matéria + prazos de tópicos
  const allEvents = [];
  subjects.forEach(s => {
    if (s.deadlines && s.deadlines.length > 0) {
      s.deadlines.forEach(d => {
        allEvents.push({ id: `s-${s.id}-d-${d.id}`, date: d.date, title: d.title, subjectName: s.name, color: s.color, type: 'subject' });
      });
    }
  });
  topics.forEach(t => {
    if (t.deadline) {
      const subj = subjects.find(s => s.id === t.subjectId);
      allEvents.push({ id: `t-${t.id}`, date: t.deadline, title: t.title, subjectName: subj?.name, color: subj?.color || 'bar-blue', type: 'topic' });
    }
  });
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const getTimeRemainingText = (eventDateStr) => {
    const diffDays = Math.ceil((new Date(eventDateStr + 'T00:00:00') - new Date(todayDate + 'T00:00:00')) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje!';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays > 1) return `Em ${diffDays} dias`;
    return `Atrasado ${Math.abs(diffDays)}d`;
  };

  const smartQueue = topics.map(t => {
    const subj = subjects.find(s => s.id === t.subjectId);
    const { score, tags } = calculatePriority(t, subj, todayDate);
    return { ...t, subjName: subj?.name, subjColor: subj?.color, score, tags };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* HEADER & DASHBOARD (Calendário, Prazos, Fila) - Permanece idêntico ao anterior */}
      <header className="fade-up" style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🧠</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.18em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>Central de Estudos</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>Sua base de conhecimento</h1>
      </header>

      <div className="fade-up delay-1" style={{ marginBottom: '3.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
        
        {/* Calendário */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>📅 {monthNames[viewMonth]} {viewYear}</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={prevMonth} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.6rem', color: 'var(--text-primary)' }}>&lt;</button>
              <button onClick={nextMonth} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.6rem', color: 'var(--text-primary)' }}>&gt;</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`blank-${i}`} style={{ padding: '0.5rem' }} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = allEvents.filter(e => e.date === dateStr);
              const isToday = dateStr === todayDate;
              return (
                <div key={day} style={{ padding: '0.4rem 0.2rem', borderRadius: '4px', background: isToday ? 'var(--accent)' : (dayEvents.length > 0 ? 'var(--bg-elevated)' : 'transparent'), color: isToday ? '#fff' : 'var(--text-primary)', textAlign: 'center', fontSize: '0.85rem', border: isToday ? 'none' : '1px solid var(--border)' }}>
                  {day}
                  {dayEvents.length > 0 && !isToday && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                      {dayEvents.slice(0,3).map((ev, idx) => <div key={idx} style={{ width: 4, height: 4, borderRadius: '50%', background: COLOR_MAP[ev.color] || 'var(--accent)' }} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Próximos Eventos */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Prazos e Provas</div>
          {allEvents.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum prazo cadastrado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {allEvents.filter(ev => ev.date >= todayDate).slice(0, 5).map(ev => {
                const diffText = getTimeRemainingText(ev.date);
                const isUrgent = ev.date === todayDate || diffText === 'Amanhã';
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius)', borderLeft: `4px solid ${COLOR_MAP[ev.color] || 'var(--accent)'}` }}>
                    <div style={{ flexShrink: 0, textAlign: 'center', width: '45px' }}>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{monthNames[parseInt(ev.date.split('-')[1])-1].substring(0,3)}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{ev.date.split('-')[2]}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ev.type === 'subject' ? '🚨' : '📝'} {ev.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ev.subjectName}</div>
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: isUrgent ? '#ef444420' : 'var(--bg-surface)', color: isUrgent ? '#ef4444' : 'var(--text-secondary)' }}>
                      {diffText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fila de Estudos Inteligente */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Fila de Estudos</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {smartQueue.length === 0 ? <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum tópico para estudar. Crie um!</div> : (
              smartQueue.map((topic, i) => (
                <div key={topic.id} onClick={() => onOpenSubject(topic.subjectId)} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius)', borderLeft: `3px solid ${COLOR_MAP[topic.subjColor] || 'var(--accent)'}`, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{topic.title}</span><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{topic.subjName}</span></div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {topic.tags.map(tag => <span key={tag} style={{ fontSize: '0.65rem', background: 'var(--bg-surface)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: tag.includes('🚨') || tag.includes('🔴') ? '#ef4444' : 'var(--text-secondary)' }}>{tag}</span>)}
                    {topic.tags.length === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>📚 Recomendado</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FORMULÁRIO MATÉRIA */}
      <form onSubmit={handleSubmit} className="fade-up delay-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Nova matéria</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" style={{ flex: '1 1 240px', minWidth: 180 }} type="text" placeholder="Ex: Cálculo, Filosofia..." value={newName} onChange={e => setNewName(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(opt => <button key={opt.key} type="button" onClick={() => setColorKey(opt.key)} title={opt.label} style={{ width: 22, height: 22, borderRadius: '50%', background: opt.preview, border: colorKey === opt.key ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', outline: colorKey === opt.key ? '2px solid var(--accent)' : 'none', outlineOffset: 2, transition: 'outline 0.15s' }} />)}
          </div>
          <button type="submit" className="btn-primary">+ Adicionar</button>
        </div>
      </form>

      {/* GRID DE MATÉRIAS ATUALIZADO (Com array de Deadlines) */}
      {subjects.length === 0 ? (
        <div className="fade-up delay-3" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Nenhuma matéria ainda</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {subjects.map((subject, i) => {
            const subTopics = topics.filter(t => t.subjectId === subject.id);
            const pct = getFeynmanForSubject(subTopics);
            const barClass = subject.color || 'bar-blue';
            const delayClass = `delay-${Math.min(i + 3, 6)}`;
            
            // Variáveis locais para o mini-form da matéria específica
            const localTitle = newDeadlineTitle[subject.id] || '';
            const localDate = newDeadlineDate[subject.id] || '';

            return (
              <div key={subject.id} className={`card fade-up ${delayClass}`} style={{ overflow: 'hidden', position: 'relative' }} onMouseEnter={e => e.currentTarget.querySelector('.del-btn').style.opacity = '1'} onMouseLeave={e => e.currentTarget.querySelector('.del-btn').style.opacity = '0'}>
                <div className={`subject-accent-bar ${barClass}`} />
                <button className="del-btn" onClick={() => setConfirmDelete(subject.id)} style={{ position: 'absolute', top: 14, right: 14, background: '#ef444420', border: '1px solid #ef444435', borderRadius: 8, color: '#f87171', width: 28, height: 28, cursor: 'pointer', fontSize: '0.7rem', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

                <div style={{ padding: '1.4rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em', marginBottom: '0.5rem', paddingRight: '2rem' }}>{subject.name}</h2>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1.2rem' }}>{subTopics.length} {subTopics.length === 1 ? 'tópico' : 'tópicos'}</div>

                  {/* NOVO: Lista de Datas da Matéria */}
                  <div style={{ marginBottom: '1.2rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Grandes Entregas / Provas:</div>
                    
                    {subject.deadlines?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                        {subject.deadlines.map(d => (
                          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                            <span><span style={{ fontWeight: 600 }}>{d.title}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({formatDateBR(d.date)})</span></span>
                            <button onClick={() => onRemoveSubjectDeadline(subject.id, d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <input type="text" placeholder="Ex: P1" className="input-field" style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }} value={localTitle} onChange={e => setNewDeadlineTitle({ ...newDeadlineTitle, [subject.id]: e.target.value })} />
                      <input type="date" className="input-field" style={{ width: '100px', padding: '0.3rem', fontSize: '0.75rem' }} value={localDate} onChange={e => setNewDeadlineDate({ ...newDeadlineDate, [subject.id]: e.target.value })} />
                      <button 
                        type="button" className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
                        onClick={() => { onAddSubjectDeadline(subject.id, localTitle, localDate); setNewDeadlineTitle({ ...newDeadlineTitle, [subject.id]: '' }); setNewDeadlineDate({ ...newDeadlineDate, [subject.id]: '' }); }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {subTopics.length > 0 && pct !== null && (
                    <div style={{ marginBottom: '1.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Feynman</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>{pct}%</span></div>
                      <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.5s ease' }} /></div>
                    </div>
                  )}
                  <button onClick={() => onOpenSubject(subject.id)} className="btn-secondary" style={{ width: '100%', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>Abrir matéria →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: '#00000080', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 340, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Excluir matéria?</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Todos os tópicos associados também serão removidos.</div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => { onDeleteSubject(confirmDelete); setConfirmDelete(null); }} style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 'var(--radius)', color: '#f87171', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', padding: '0.75rem 1.25rem' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}