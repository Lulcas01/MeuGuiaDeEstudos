import React, { useState, useEffect } from 'react';
import HomeView from './Components/Home';
import TopicView from './Components/TopicView';
import LoginView from './Components/Login';
import TeacherDashboard from './Components/TeacherDashboard';

export const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const addDays = (dateStr, days) => {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T12:00:00Z');
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatDateBR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const COLORS = ['bar-blue', 'bar-purple', 'bar-green', 'bar-amber', 'bar-rose', 'bar-cyan'];

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'student' | 'teacher'
  const [userName, setUserName] = useState('');

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserName(name || '');
    }
  }, []);

  // BUSCA INICIAL DO BANCO (apenas alunos)
  useEffect(() => {
    if (isAuthenticated && userRole === 'student') {
      fetch('http://localhost:3000/api/subjects')
        .then(res => res.json())
        .then(data => setSubjects(data.map(s => ({ ...s, id: s._id }))))
        .catch(err => console.error('Erro ao carregar matérias:', err));

      fetch('http://localhost:3000/api/topics')
        .then(res => res.json())
        .then(data => setTopics(data.map(t => ({ ...t, id: t._id }))))
        .catch(err => console.error('Erro ao carregar tópicos:', err));
    }
  }, [isAuthenticated, userRole]);

  const handleLogin = (role, user) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setUserName(user?.name || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
    setSubjects([]);
    setTopics([]);
    setActiveSubjectId(null);
  };

  // ==========================================
  // FUNÇÕES AUXILIARES DE SINCRONIZAÇÃO
  // ==========================================
  const syncTopicToDB = async (updatedTopic) => {
    try {
      await fetch(`http://localhost:3000/api/topics/${updatedTopic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTopic)
      });
    } catch (err) { console.error('Erro ao atualizar tópico no banco:', err); }
  };

  const syncSubjectToDB = async (updatedSubject) => {
    try {
      await fetch(`http://localhost:3000/api/subjects/${updatedSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSubject)
      });
    } catch (err) { console.error('Erro ao atualizar matéria no banco:', err); }
  };

  // ==========================================
  // HANDLERS DE MATÉRIA (SUBJECT)
  // ==========================================
  const handleAddSubject = async (name, colorKey) => {
    const color = colorKey || COLORS[subjects.length % COLORS.length];
    const newSubjectData = { name, color, deadlines: [] };
    try {
      const response = await fetch('http://localhost:3000/api/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubjectData)
      });
      const savedSubject = await response.json();
      setSubjects([...subjects, { ...savedSubject, id: savedSubject._id }]);
    } catch (err) { console.error('Erro:', err); }
  };

  const handleDeleteSubject = async (id) => {
    try {
      await fetch(`http://localhost:3000/api/subjects/${id}`, { method: 'DELETE' });
      setSubjects(subjects.filter(s => s.id !== id));
      setTopics(topics.filter(t => t.subjectId !== id));
      if (activeSubjectId === id) setActiveSubjectId(null);
    } catch (err) { console.error('Erro:', err); }
  };

  const handleAddSubjectDeadline = (subjectId, title, date) => {
    if (!title || !date) return;
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        const updated = { ...s, deadlines: [...(s.deadlines || []), { title, date }] };
        syncSubjectToDB(updated);
        return updated;
      }
      return s;
    });
    setSubjects(updatedSubjects);
  };

  const handleRemoveSubjectDeadline = (subjectId, deadlineId) => {
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        const updated = { ...s, deadlines: s.deadlines.filter(d => d._id !== deadlineId && d.id !== deadlineId) };
        syncSubjectToDB(updated);
        return updated;
      }
      return s;
    });
    setSubjects(updatedSubjects);
  };

  // ==========================================
  // HANDLERS DE TÓPICOS E IA
  // ==========================================
  const handleAddTopic = async (title) => {
    const newTopicData = {
      subjectId: String(activeSubjectId), title, feynman: '🔴 Novo', domain: 1,
      subtopics: [], files: [], exercises: [], flashcards: [], notes: '', deadline: '',
      reviewLevel: 0, lastStudiedDate: null, nextReviewDate: getTodayDate()
    };
    try {
      const response = await fetch('http://localhost:3000/api/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopicData)
      });
      const savedTopic = await response.json();
      setTopics([...topics, { ...savedTopic, id: savedTopic._id }]);
    } catch (err) { console.error('Erro:', err); }
  };

  const handleImportAITopic = async (subjectId, aiData, fileData) => {
    let allFlashcards = [];
    const newSubtopics = (aiData.subtopics || []).map((st) => {
      if (st.flashcards && st.flashcards.length > 0) {
        const cardsComTag = st.flashcards.map(card => ({
          question: `[${st.title}] ${card.question}`, answer: card.answer
        }));
        allFlashcards = [...allFlashcards, ...cardsComTag];
      }
      return { title: st.title, page: st.page || 1, feynman: '🔴 Novo' };
    });

    const newTopicData = {
      subjectId: String(subjectId), title: aiData.title || 'Tópico Gerado por IA',
      feynman: '🔴 Novo', domain: 1, subtopics: newSubtopics,
      files: fileData ? [fileData] : [], exercises: [], flashcards: allFlashcards,
      notes: aiData.notes || '', deadline: '', reviewLevel: 0, lastStudiedDate: null, nextReviewDate: getTodayDate()
    };

    try {
      const response = await fetch('http://localhost:3000/api/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopicData)
      });
      const savedTopic = await response.json();
      setTopics([...topics, { ...savedTopic, id: savedTopic._id }]);
    } catch (error) { console.error('Erro:', error); }
  };

  const handleBulkImport = async (subjectId, topicTitle, text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const newSubtopics = lines.reduce((acc, line) => {
      const cleanTitle = line.replace(/(\\.+|\\s+)\\d+$/, '').trim();
      if (cleanTitle) acc.push({ title: cleanTitle, feynman: '🔴 Novo' });
      return acc;
    }, []);

    const newTopicData = {
      subjectId: String(subjectId), title: topicTitle, feynman: '🔴 Novo', domain: 1,
      subtopics: newSubtopics, files: [], exercises: [], flashcards: [], notes: '', deadline: '',
      reviewLevel: 0, lastStudiedDate: null, nextReviewDate: getTodayDate()
    };

    try {
      const response = await fetch('http://localhost:3000/api/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopicData)
      });
      const savedTopic = await response.json();
      setTopics([...topics, { ...savedTopic, id: savedTopic._id }]);
    } catch (err) { console.error('Erro:', err); }
  };

  // ==========================================
  // ATUALIZAÇÕES LOCAIS -> SINCRONIZA COM O BANCO
  // ==========================================
  const updateSingleTopic = (topicId, mutatorFn) => {
    const updatedTopics = topics.map(t => {
      if (t.id === topicId) {
        const updated = mutatorFn(t);
        syncTopicToDB(updated);
        return updated;
      }
      return t;
    });
    setTopics(updatedTopics);
  };

  const handleAddSubtopic = (topicId, title) => {
    if (!title.trim()) return;
    updateSingleTopic(topicId, t => ({ ...t, subtopics: [...(t.subtopics || []), { title, feynman: '🔴 Novo' }] }));
  };

  const handleCycleSubtopicFeynman = (topicId, subtopicId) => {
    const cycle = { '🔴 Novo': '🟡 Quase lá', '🟡 Quase lá': '🟢 Explicado', '🟢 Explicado': '🔴 Novo' };
    updateSingleTopic(topicId, t => ({
      ...t, subtopics: t.subtopics.map(st =>
        (st._id === subtopicId || st.id === subtopicId) ? { ...st, feynman: cycle[st.feynman] || '🔴 Novo' } : st
      )
    }));
  };

  const handleRemoveSubtopic = (topicId, subtopicId) => {
    updateSingleTopic(topicId, t => ({
      ...t, subtopics: t.subtopics.filter(st => st._id !== subtopicId && st.id !== subtopicId)
    }));
  };

  const handleFileUpload = (topicId, file) => {
    if (!file) return;
    const fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
    updateSingleTopic(topicId, t => ({ ...t, files: [...(t.files || []), fileData] }));
  };

  const handleExerciseUpload = (topicId, file) => {
    if (!file) return;
    const fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
    updateSingleTopic(topicId, t => ({ ...t, exercises: [...(t.exercises || []), fileData] }));
  };

  const handleAddFlashcard = (topicId, flashcard) => {
    updateSingleTopic(topicId, t => ({ ...t, flashcards: [...(t.flashcards || []), flashcard] }));
  };

  const handleUpdateNotes = (topicId, notes) => {
    updateSingleTopic(topicId, t => ({ ...t, notes }));
  };

  const handleUpdateDeadline = (topicId, deadline) => {
    updateSingleTopic(topicId, t => ({ ...t, deadline }));
  };

  const handleReviewTopic = (topicId) => {
    const today = getTodayDate();
    updateSingleTopic(topicId, t => {
      let nextLevel = (t.reviewLevel || 0) + 1;
      let daysToAdd = nextLevel === 1 ? 1 : (nextLevel === 2 ? 7 : 30);
      if (nextLevel >= 3) nextLevel = 3;
      const newDomain = Math.min((t.domain || 1) + 1, 5);
      let newFeynman = t.feynman;
      if (newDomain >= 4) newFeynman = '🟢 Explicado';
      else if (newDomain >= 2) newFeynman = '🟡 Quase lá';
      return { ...t, domain: newDomain, feynman: newFeynman, reviewLevel: nextLevel, lastStudiedDate: today, nextReviewDate: addDays(today, daysToAdd) };
    });
  };

  // ── RENDER ──
  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (userRole === 'teacher') {
    return <TeacherDashboard userName={userName} onLogout={handleLogout} />;
  }

  // Aluno
  return (
    <div style={{ minHeight: '100vh' }}>
      {activeSubjectId === null ? (
        <HomeView
          subjects={subjects}
          topics={topics}
          onOpenSubject={setActiveSubjectId}
          onAddSubject={handleAddSubject}
          onDeleteSubject={handleDeleteSubject}
          onAddSubjectDeadline={handleAddSubjectDeadline}
          onRemoveSubjectDeadline={handleRemoveSubjectDeadline}
          onBulkImport={handleBulkImport}
          onLogout={handleLogout}
        />
      ) : (
        <TopicView
          activeSubject={subjects.find(s => s.id === activeSubjectId)}
          activeTopics={topics.filter(t => t.subjectId === activeSubjectId)}
          onBack={() => setActiveSubjectId(null)}
          onAddTopic={handleAddTopic}
          onFileUpload={handleFileUpload}
          onExerciseUpload={handleExerciseUpload}
          onReviewTopic={handleReviewTopic}
          onAddFlashcard={handleAddFlashcard}
          onUpdateNotes={handleUpdateNotes}
          onUpdateDeadline={handleUpdateDeadline}
          onAddSubtopic={handleAddSubtopic}
          onCycleSubtopicFeynman={handleCycleSubtopicFeynman}
          onRemoveSubtopic={handleRemoveSubtopic}
          onImportAITopic={handleImportAITopic}
        />
      )}
    </div>
  );
}
