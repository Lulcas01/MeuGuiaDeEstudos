import React, { useState } from 'react';
import { getTodayDate, formatDateBR } from '../App';

const FEYNMAN_LEVELS = ['🔴 Novo', '🟡 Quase lá', '🟢 Explicado'];
const EBBINGHAUS_LABELS = ['Nunca revisado', 'Revisão 24h', 'Revisão 1 Sem', 'Revisão 1 Mês'];

function feynmanBadgeClass(feynman) {
  if (!feynman) return '';
  if (feynman.includes('Explicado')) return 'badge-green';
  if (feynman.includes('Quase')) return 'badge-yellow';
  return 'badge-red';
}

function DomainDots({ level }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className={`domain-dot ${n <= level ? 'lit' : ''}`} />
      ))}
    </div>
  );
}

function Flashcard({ question, answer }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      onClick={() => setIsFlipped(!isFlipped)}
      style={{
        background: isFlipped ? 'var(--bg-surface)' : 'var(--bg-elevated)',
        border: `1px solid ${isFlipped ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', minHeight: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <span style={{ fontSize: '0.85rem', fontWeight: isFlipped ? 400 : 500, color: isFlipped ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
        {isFlipped ? answer : question}
      </span>
    </div>
  );
}

export default function TopicView({ 
  activeSubject, activeTopics, onBack, onAddTopic, 
  onFileUpload, onExerciseUpload, onReviewTopic, onAddFlashcard,
  onUpdateNotes, onUpdateDeadline, onAddSubtopic, onCycleSubtopicFeynman, onRemoveSubtopic
}) {
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [newCardQ, setNewCardQ] = useState('');
  const [newCardA, setNewCardA] = useState('');
  
  // Estado local para o input de novo subtópico (chaveado pelo id do tópico)
  const [newSubtopic, setNewSubtopic] = useState({});
  const [viewingFile, setViewingFile] = useState(null);

  const todayDate = getTodayDate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTopic(newTitle.trim());
    setNewTitle('');
  };

  const handleAddFlashcard = (topicId) => {
    if (!newCardQ.trim() || !newCardA.trim()) return;
    onAddFlashcard(topicId, { question: newCardQ, answer: newCardA });
    setNewCardQ('');
    setNewCardA('');
  };

  const barClass = activeSubject?.color || 'bar-blue';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem', position: 'relative' }}>

      <button onClick={onBack} className="fade-up" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem', padding: 0, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'var(--accent)'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>
        ← Voltar
      </button>

      <header className="fade-up delay-1" style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div className={`subject-accent-bar ${barClass}`} style={{ width: 28, height: 4 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Matéria</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{activeSubject?.name}</h1>
      </header>

      <form onSubmit={handleSubmit} className="fade-up delay-2" style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input className="input-field" style={{ flex: '1 1 240px' }} type="text" placeholder="Qual tópico você quer estudar?" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
        <button type="submit" className="btn-primary">+ Tópico</button>
      </form>

      {activeTopics.length === 0 ? (
        <div className="fade-up delay-3" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📖</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>Nenhum tópico ainda</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeTopics.map((topic, i) => {
            const isExpanded = expandedId === topic.id;
            const delayClass = `delay-${Math.min(i + 3, 6)}`;
            
            const subtopics = topic.subtopics || [];
            const flashcards = topic.flashcards || [];
            const exercises = topic.exercises || [];
            const files = topic.files || [];
            
            const isReviewDue = topic.nextReviewDate && topic.nextReviewDate <= todayDate;
            const reviewLevelLabel = EBBINGHAUS_LABELS[Math.min(topic.reviewLevel || 0, 3)];
            const localSubtopicText = newSubtopic[topic.id] || '';
            
            return (
              <div key={topic.id} className={`card fade-up ${delayClass}`} style={{ cursor: 'default', overflow: 'hidden', borderLeft: isReviewDue ? '4px solid #ef4444' : 'none' }}>
                <div onClick={() => setExpandedId(isExpanded ? null : topic.id)} style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>▶</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.01em', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {topic.title}
                      {isReviewDue && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>⚠️ REVISÃO</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge ${feynmanBadgeClass(topic.feynman)}`}>{topic.feynman}</span>
                      <span className="badge" style={{ background: 'var(--bg-elevated)' }}>{reviewLevelLabel}</span>
                    </div>
                  </div>

                  {topic.deadline && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      📅 Prazo: {formatDateBR(topic.deadline)}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* BARRA SUPERIOR: CURVA DE ESQUECIMENTO E PRAZOS */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '2', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius)', border: isReviewDue ? '1px solid #fca5a5' : '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Curva de Esquecimento</div>
                          <div style={{ fontSize: '0.75rem', color: isReviewDue ? '#ef4444' : 'var(--text-muted)' }}>
                            {topic.nextReviewDate ? `Próxima: ${formatDateBR(topic.nextReviewDate)}` : 'Não agendado'}
                          </div>
                        </div>
                        <button onClick={() => onReviewTopic && onReviewTopic(topic.id)} style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: isReviewDue ? '#ef4444' : '#10b981', color: '#fff' }}>
                          {isReviewDue ? '🚨 Fazer Revisão Agora' : '✅ Revisão em dia (clique para adiantar)'}
                        </button>
                      </div>

                      <div style={{ flex: '1', minWidth: '150px', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Prazo da Tarefa</div>
                        <input type="date" className="input-field" style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }} value={topic.deadline || ''} onChange={(e) => onUpdateDeadline && onUpdateDeadline(topic.id, e.target.value)} />
                      </div>
                    </div>

                    {/* NOVO: SEÇÃO DE SUBTÓPICOS */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Subtópicos (Estrutura)</div>
                      
                      {subtopics.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          {subtopics.map(st => (
                            <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{st.title}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => onCycleSubtopicFeynman(topic.id, st.id)}
                                  className={`badge ${feynmanBadgeClass(st.feynman)}`} 
                                  style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                                  title="Clique para alternar status"
                                >
                                  {st.feynman}
                                </button>
                                <button onClick={() => onRemoveSubtopic(topic.id, st.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" className="input-field" placeholder="Ex: 1.1 Estimativa pontual..." style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }} value={localSubtopicText} onChange={e => setNewSubtopic({ ...newSubtopic, [topic.id]: e.target.value })} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); onAddSubtopic(topic.id, localSubtopicText); setNewSubtopic({ ...newSubtopic, [topic.id]: '' }); } }} />
                        <button type="button" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => { onAddSubtopic(topic.id, localSubtopicText); setNewSubtopic({ ...newSubtopic, [topic.id]: '' }); }}>+ Add</button>
                      </div>
                    </div>

                    {/* BLOCO DE NOTAS */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Notas do Tópico</div>
                      <textarea className="input-field" style={{ width: '100%', minHeight: '100px', resize: 'vertical', padding: '1rem', fontSize: '0.85rem', lineHeight: 1.5 }} placeholder="Escreva suas anotações..." value={topic.notes || ''} onChange={(e) => onUpdateNotes && onUpdateNotes(topic.id, e.target.value)} />
                    </div>

                    {/* MATERIAIS E EXERCÍCIOS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}><span>Materiais de Apoio</span><label style={{ cursor: 'pointer', color: 'var(--accent)' }}>+ Anexar <input type="file" style={{ display: 'none' }} onChange={e => onFileUpload(topic.id, e.target.files[0])} /></label></div>
                        {files.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum material.</div> : (
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {files.map((f, idx) => <li key={idx} onClick={() => setViewingFile(f)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#93c5fd', cursor: 'pointer', textDecoration: 'underline' }}><span>📄</span> {f.name || f}</li>)}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}><span>Listas de Exercícios</span><label style={{ cursor: 'pointer', color: 'var(--accent)' }}>+ Anexar <input type="file" style={{ display: 'none' }} onChange={e => onExerciseUpload && onExerciseUpload(topic.id, e.target.files[0])} /></label></div>
                        {exercises.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma lista.</div> : (
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {exercises.map((f, idx) => <li key={idx} onClick={() => setViewingFile(f)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#fca5a5', cursor: 'pointer', textDecoration: 'underline' }}><span>📝</span> {f.name || f}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* FLASHCARDS */}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1.5rem' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Flashcards de Revisão</div>
                      {flashcards.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                          {flashcards.map((card, idx) => <Flashcard key={idx} question={card.question} answer={card.answer} />)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        <input className="input-field" style={{ flex: '1 1 150px', fontSize: '0.8rem', padding: '0.5rem' }} placeholder="Pergunta..." value={newCardQ} onChange={e => setNewCardQ(e.target.value)} />
                        <input className="input-field" style={{ flex: '1 1 150px', fontSize: '0.8rem', padding: '0.5rem' }} placeholder="Resposta..." value={newCardA} onChange={e => setNewCardA(e.target.value)} />
                        <button type="button" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => handleAddFlashcard(topic.id)}>+ Card</button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewingFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'white' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Lendo: {viewingFile.name}</h3>
            <button onClick={() => setViewingFile(null)} style={{ background: 'var(--bg-surface)', border: 'none', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}>Fechar ✕</button>
          </div>
          <div style={{ flex: 1, background: 'white', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {viewingFile.url ? <iframe src={viewingFile.url} style={{ width: '100%', height: '100%', border: 'none' }} title="Leitor de Documentos" /> : <div style={{ color: '#666', textAlign: 'center', padding: '2rem' }}><p>Faça o upload de um arquivo real (PDF, TXT, etc.) do seu computador para visualizá-lo aqui!</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}