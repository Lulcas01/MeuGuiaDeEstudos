import React, { useState } from 'react';
import HomeView from './Components/Home'; 
import TopicView from './Components/TopicView'; 

// Funções de tempo
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

const initialSubjects = [
  { 
    id: 1, name: 'Estatística', color: 'bar-blue', 
    deadlines: [
      { id: 1, title: 'P1 de Estatística', date: '2026-04-16' },
      { id: 2, title: 'Trabalho Final', date: '2026-06-20' }
    ] 
  },
  { id: 2, name: 'Programação', color: 'bar-purple', deadlines: [] },
];

const initialTopics = [
  { 
    id: 1, subjectId: 1, title: 'Estimação Intervalar', feynman: '🟡 Quase lá', domain: 3, 
    subtopics: [
      { id: 1, title: '1.1 Estimativa pontual', feynman: '🟢 Explicado' },
      { id: 2, title: '1.2 Intervalo de confiança', feynman: '🟡 Quase lá' },
      { id: 3, title: '1.3 Estimadores: precisão e viés', feynman: '🔴 Novo' }
    ],
    files: [{ name: 'GCC1625_03_estimacao_intervalar.pdf', url: null }], 
    exercises: [], flashcards: [], notes: '',
    deadline: '2026-04-10', reviewLevel: 1, lastStudiedDate: null, nextReviewDate: getTodayDate()
  },
];

const COLORS = ['bar-blue','bar-purple','bar-green','bar-amber','bar-rose','bar-cyan'];

export default function App() {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [topics, setTopics] = useState(initialTopics);
  const [activeSubjectId, setActiveSubjectId] = useState(null);

  // --- MATÉRIAS E MÚLTIPLAS DATAS ---
  const handleAddSubject = (name, colorKey) => {
    const newId = subjects.length ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    const color = colorKey || COLORS[subjects.length % COLORS.length];
    setSubjects([...subjects, { id: newId, name, color, deadlines: [] }]);
  };

  const handleDeleteSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id));
    setTopics(topics.filter(t => t.subjectId !== id));
  };

  const handleAddSubjectDeadline = (subjectId, title, date) => {
    if (!title || !date) return;
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        const newDId = s.deadlines.length ? Math.max(...s.deadlines.map(d => d.id)) + 1 : 1;
        return { ...s, deadlines: [...s.deadlines, { id: newDId, title, date }] };
      }
      return s;
    }));
  };

  const handleRemoveSubjectDeadline = (subjectId, deadlineId) => {
    setSubjects(subjects.map(s => s.id === subjectId ? { ...s, deadlines: s.deadlines.filter(d => d.id !== deadlineId) } : s));
  };

  // --- TÓPICOS E SUBTÓPICOS ---
  const handleAddTopic = (title) => {
    const newId = topics.length ? Math.max(...topics.map(t => t.id)) + 1 : 1;
    setTopics([...topics, { 
      id: newId, subjectId: activeSubjectId, title, feynman: '🔴 Novo', domain: 1, 
      subtopics: [], files: [], exercises: [], flashcards: [], notes: '', deadline: '',
      reviewLevel: 0, lastStudiedDate: null, nextReviewDate: getTodayDate() 
    }]);
  };

  const handleAddSubtopic = (topicId, title) => {
    if (!title.trim()) return;
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        const newSId = t.subtopics?.length ? Math.max(...t.subtopics.map(st => st.id)) + 1 : 1;
        return { ...t, subtopics: [...(t.subtopics || []), { id: newSId, title, feynman: '🔴 Novo' }] };
      }
      return t;
    }));
  };

  const handleCycleSubtopicFeynman = (topicId, subtopicId) => {
    const cycle = { '🔴 Novo': '🟡 Quase lá', '🟡 Quase lá': '🟢 Explicado', '🟢 Explicado': '🔴 Novo' };
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        return {
          ...t,
          subtopics: t.subtopics.map(st => st.id === subtopicId ? { ...st, feynman: cycle[st.feynman] || '🔴 Novo' } : st)
        };
      }
      return t;
    }));
  };

  const handleRemoveSubtopic = (topicId, subtopicId) => {
    setTopics(topics.map(t => t.id === topicId ? { ...t, subtopics: t.subtopics.filter(st => st.id !== subtopicId) } : t));
  };

  // --- OUTRAS FUNÇÕES DOS TÓPICOS ---
  const handleFileUpload = (topicId, file) => {
    if (!file) return;
    const fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
    setTopics(topics.map(t => t.id === topicId ? { ...t, files: [...(t.files || []), fileData] } : t));
  };

  const handleExerciseUpload = (topicId, file) => {
    if (!file) return;
    const fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
    setTopics(topics.map(t => t.id === topicId ? { ...t, exercises: [...(t.exercises || []), fileData] } : t));
  };

  const handleReviewTopic = (topicId) => {
    const today = getTodayDate();
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        let nextLevel = (t.reviewLevel || 0) + 1;
        let daysToAdd = 1;
        if (nextLevel === 1) daysToAdd = 1; 
        else if (nextLevel === 2) daysToAdd = 7; 
        else if (nextLevel >= 3) { daysToAdd = 30; nextLevel = 3; } 
        
        const newDomain = Math.min((t.domain || 1) + 1, 5);
        let newFeynman = t.feynman;
        if (newDomain >= 4) newFeynman = '🟢 Explicado';
        else if (newDomain >= 2) newFeynman = '🟡 Quase lá';

        return { ...t, domain: newDomain, feynman: newFeynman, reviewLevel: nextLevel, lastStudiedDate: today, nextReviewDate: addDays(today, daysToAdd) };
      }
      return t;
    }));
  };

  const handleAddFlashcard = (topicId, flashcard) => {
    setTopics(topics.map(t => t.id === topicId ? { ...t, flashcards: [...(t.flashcards || []), flashcard] } : t));
  };

  const handleUpdateNotes = (topicId, notes) => {
    setTopics(topics.map(t => t.id === topicId ? { ...t, notes } : t));
  };

  const handleUpdateDeadline = (topicId, deadline) => {
    setTopics(topics.map(t => t.id === topicId ? { ...t, deadline } : t));
  };

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
        />
      )}
    </div>
  );
}