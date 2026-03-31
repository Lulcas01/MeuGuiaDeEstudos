import React, { useState } from 'react';
import { getTodayDate, formatDateBR } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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

// ─── Markdown Renderer simples ────────────────────────────────────────────────
function MarkdownViewer({ content }) {
  return (
    <div style={{
      background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '1.5rem',
      fontFamily: 'var(--font-body)', overflowY: 'auto', height: '100%', lineHeight: 1.7
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Aqui você mantém o visual que já tinha criado:
          h1: ({node, ...props}) => <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '1.5rem 0 0.75rem', color: 'var(--text-primary)' }} {...props} />,
          h2: ({node, ...props}) => <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '1.2rem 0 0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem' }} {...props} />,
          h3: ({node, ...props}) => <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '1rem 0 0.4rem', color: 'var(--text-primary)' }} {...props} />,
          p: ({node, ...props}) => <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0.2rem 0' }} {...props} />,
          code: ({node, inline, ...props}) => (
            <code style={{ background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }} {...props} />
          ),
          blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem', margin: '0.5rem 0', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem' }} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── File Viewer ──────────────────────────────────────────────────────────────
function FileViewer({ file, onClose }) {
  const isMd = file.name?.toLowerCase().endsWith('.md') || file.type === 'text/markdown';
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'white' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
          {isMd ? '📝' : '📄'} {file.name}
        </h3>
        <button onClick={onClose} style={{ background: 'var(--bg-surface)', border: 'none', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}>
          Fechar ✕
        </button>
      </div>

      <div style={{ flex: 1, background: isMd ? 'var(--bg-surface)' : 'white', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}>
        {isMd && file.mdContent ? (
          <MarkdownViewer content={file.mdContent} />
        ) : file.url ? (
          <iframe src={file.url} style={{ width: '100%', height: '100%', border: 'none' }} title="Leitor de Documentos" />
        ) : (
          <div style={{ color: '#666', textAlign: 'center', padding: '2rem', margin: 'auto' }}>
            <p>Faça o upload de um arquivo do seu computador para visualizá-lo aqui!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TopicView({
  activeSubject, activeTopics, onBack, onAddTopic,
  onFileUpload, onExerciseUpload, onReviewTopic, onAddFlashcard,
  onUpdateNotes, onUpdateDeadline, onAddSubtopic, onCycleSubtopicFeynman, onRemoveSubtopic,
  onImportAITopic
}) {
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [newCardQ, setNewCardQ] = useState('');
  const [newCardA, setNewCardA] = useState('');
  const [newSubtopic, setNewSubtopic] = useState({});
  const [viewingFile, setViewingFile] = useState(null);

  // IA upload state — 'idle' | 'pdf' | 'md'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState('');

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

  // ─── Upload PDF via IA ───
  const handleUploadPDF = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setProcessingType('pdf');
    const formData = new FormData();
    formData.append('pdfFile', file);
    try {
      const response = await fetch('http://localhost:3000/api/upload-pdf', { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok && result.data) {
        const fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
        onImportAITopic(activeSubject.id, result.data, fileData);
        alert('Tópico gerado com sucesso pela IA! 🚀');
      } else {
        alert('Erro: ' + result.message);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro de comunicação com o servidor.');
    } finally {
      setIsProcessing(false);
      setProcessingType('');
      event.target.value = null;
    }
  };

  // ─── Upload .MD via IA ───
  const handleUploadMD = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setProcessingType('md');
    const formData = new FormData();
    formData.append('mdFile', file);

    // Lê o conteúdo do arquivo localmente para o viewer
    const mdContent = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    });

    try {
      const response = await fetch('http://localhost:3000/api/upload-md', { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok && result.data) {
        // Inclui o conteúdo MD no fileData para exibição inline
        const fileData = { name: file.name, type: 'text/markdown', url: null, mdContent };
        onImportAITopic(activeSubject.id, result.data, fileData);
        alert('Arquivo Markdown processado com sucesso! 🚀');
      } else {
        alert('Erro: ' + result.message);
      }
    } catch (error) {
      console.error('Erro no upload MD:', error);
      alert('Erro de comunicação com o servidor.');
    } finally {
      setIsProcessing(false);
      setProcessingType('');
      event.target.value = null;
    }
  };

  // ─── Abrir arquivo .MD localmente (sem IA) ───
  const handleOpenMDFile = (topicId, file) => {
    if (!file) return;
    const isMd = file.name?.toLowerCase().endsWith('.md');
    if (isMd) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const mdContent = e.target.result;
        const fileData = { name: file.name, type: 'text/markdown', url: null, mdContent };
        onFileUpload(topicId, { name: file.name, type: 'text/markdown', mdContent });
        setViewingFile(fileData);
      };
      reader.readAsText(file);
    } else {
      onFileUpload(topicId, file);
    }
  };

  const barClass = activeSubject?.color || 'bar-blue';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem', position: 'relative' }}>

      <button onClick={onBack} className="fade-up" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem', padding: 0, transition: 'color 0.2s' }}
        onMouseEnter={e => e.target.style.color = 'var(--accent)'}
        onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>
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
        <input className="input-field" style={{ flex: '1 1 240px' }} type="text" placeholder="Criar Tópico Manualmente" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
        <button type="submit" className="btn-primary">+ Tópico</button>
      </form>

      {/* ─── BOTÕES DE IA ─── */}
      <div className="fade-up delay-2" style={{
        padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem',
        background: isProcessing ? 'var(--bg-surface)' : '#10b98115',
        border: isProcessing ? '1px solid var(--border)' : '1px solid #10b98140',
      }}>
        <h3 style={{ margin: '0 0 0.3rem', fontSize: '1rem', color: isProcessing ? 'var(--text-primary)' : '#059669' }}>
          ✨ Gerar Tópico com IA
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Faça upload de um PDF ou arquivo Markdown — a IA criará resumo, subtópicos e flashcards automaticamente.
        </p>

        {isProcessing ? (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
            🧠 {processingType === 'md' ? 'Lendo Markdown' : 'Lendo PDF'} e pensando...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label className="btn-primary" style={{ cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📄 Enviar PDF
              <input type="file" accept="application/pdf" onChange={handleUploadPDF} style={{ display: 'none' }} />
            </label>
            <label className="btn-primary" style={{ cursor: 'pointer', background: '#7c3aed', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📝 Enviar Markdown (.md)
              <input type="file" accept=".md,text/markdown,text/plain" onChange={handleUploadMD} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

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

                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Subtópicos (Estrutura)</div>
                      {subtopics.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          {subtopics.map(st => (
                            <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{st.title}</span>
                                {st.page && files.length > 0 && (
                                  <button
                                    title={`Ir para a página ${st.page}`}
                                    onClick={() => setViewingFile({ ...files[0], url: files[0].url ? `${files[0].url}#page=${st.page}` : null })}
                                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--accent)' }}
                                  >
                                    📄 Pág {st.page}
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => onCycleSubtopicFeynman(topic.id, st.id)} className={`badge ${feynmanBadgeClass(st.feynman)}`} style={{ cursor: 'pointer', border: 'none', outline: 'none' }} title="Clique para alternar status">
                                  {st.feynman}
                                </button>
                                <button onClick={() => onRemoveSubtopic(topic.id, st.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" className="input-field" placeholder="Ex: 1.1 Estimativa pontual..." style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                          value={localSubtopicText}
                          onChange={e => setNewSubtopic({ ...newSubtopic, [topic.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddSubtopic(topic.id, localSubtopicText); setNewSubtopic({ ...newSubtopic, [topic.id]: '' }); } }}
                        />
                        <button type="button" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                          onClick={() => { onAddSubtopic(topic.id, localSubtopicText); setNewSubtopic({ ...newSubtopic, [topic.id]: '' }); }}>
                          + Add
                        </button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Notas do Tópico</div>
                      <textarea className="input-field" style={{ width: '100%', minHeight: '100px', resize: 'vertical', padding: '1rem', fontSize: '0.85rem', lineHeight: 1.5 }}
                        placeholder="Escreva suas anotações..." value={topic.notes || ''}
                        onChange={(e) => onUpdateNotes && onUpdateNotes(topic.id, e.target.value)} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      {/* Materiais de Apoio — aceita PDF e .md */}
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Materiais de Apoio</span>
                          <label style={{ cursor: 'pointer', color: 'var(--accent)' }}>
                            + Anexar
                            <input type="file" accept=".pdf,.md,application/pdf,text/markdown,text/plain" style={{ display: 'none' }}
                              onChange={e => handleOpenMDFile(topic.id, e.target.files[0])} />
                          </label>
                        </div>
                        {files.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum material.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {files.map((f, idx) => {
                              const isMd = f.name?.toLowerCase().endsWith('.md') || f.type === 'text/markdown';
                              return (
                                <li key={idx} onClick={() => setViewingFile(f)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: isMd ? '#c084fc' : '#93c5fd', cursor: 'pointer', textDecoration: 'underline' }}>
                                  <span>{isMd ? '📝' : '📄'}</span> {f.name || f}
                                  {isMd && <span style={{ fontSize: '0.65rem', background: '#7c3aed20', color: '#7c3aed', padding: '0.1rem 0.4rem', borderRadius: 20, fontWeight: 600 }}>MD</span>}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {/* Listas de Exercícios */}
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Listas de Exercícios</span>
                          <label style={{ cursor: 'pointer', color: 'var(--accent)' }}>
                            + Anexar
                            <input type="file" style={{ display: 'none' }} onChange={e => onExerciseUpload && onExerciseUpload(topic.id, e.target.files[0])} />
                          </label>
                        </div>
                        {exercises.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma lista.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {exercises.map((f, idx) => (
                              <li key={idx} onClick={() => setViewingFile(f)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#fca5a5', cursor: 'pointer', textDecoration: 'underline' }}>
                                <span>📝</span> {f.name || f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

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

      {/* ─── VISUALIZADOR DE ARQUIVO ─── */}
      {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
}
