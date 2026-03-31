import express from 'express';
import Topic from './Topic.js';
import Subject from './subjects.js';
import Class from './classes.js';
import { protect } from './auth.js';

const router = express.Router();
router.use(protect);

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
async function getSubjectAndCheckAccess(subjectId, user) {
  const subject = await Subject.findById(subjectId);
  if (!subject) return { error: 'Matéria não encontrada', status: 404 };

  const isOwner = subject.owner.toString() === user._id.toString();
  if (isOwner) return { subject, canWrite: true };

  // Aluno pode ler tópicos de turma
  if (subject.visibility === 'class' && subject.classId) {
    const turma = await Class.findById(subject.classId);
    if (turma && turma.students.some(s => s.toString() === user._id.toString())) {
      return { subject, canWrite: false }; // leitura apenas
    }
  }
  return { error: 'Sem permissão', status: 403 };
}

// -------------------------------------------------------
// POST /api/topics
// Cria um tópico em uma matéria
// -------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { subjectId, title, feynman, domain, notes, deadline } = req.body;
    if (!subjectId || !title) {
      return res.status(400).json({ message: 'subjectId e title são obrigatórios' });
    }

    const { subject, canWrite, error, status } = await getSubjectAndCheckAccess(subjectId, req.user);
    if (error) return res.status(status).json({ message: error });
    if (!canWrite) return res.status(403).json({ message: 'Alunos não podem criar tópicos em matérias do professor' });

    const getTodayDate = () => new Date().toISOString().slice(0, 10);

    const topic = await Topic.create({
      title,
      subject: subjectId,
      owner: req.user._id,
      feynman: feynman || '🔴 Novo',
      domain: domain || 1,
      notes: notes || '',
      deadline: deadline || '',
      nextReviewDate: getTodayDate(),
      visibility: subject.visibility,
    });

    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// POST /api/topics/bulk-import
// Cria um tópico com vários subtópicos de uma vez
// Body: { subjectId, topicTitle, lines: ["linha 1", "linha 2"] }
// -------------------------------------------------------
router.post('/bulk-import', async (req, res) => {
  try {
    const { subjectId, topicTitle, lines } = req.body;
    if (!subjectId || !topicTitle || !Array.isArray(lines)) {
      return res.status(400).json({ message: 'subjectId, topicTitle e lines são obrigatórios' });
    }

    const { canWrite, error, status } = await getSubjectAndCheckAccess(subjectId, req.user);
    if (error) return res.status(status).json({ message: error });
    if (!canWrite) return res.status(403).json({ message: 'Sem permissão' });

    const getTodayDate = () => new Date().toISOString().slice(0, 10);

    const subtopics = lines
      .map(line => line.replace(/([.]+|\s+)\d+$/, '').trim())
      .filter(Boolean)
      .map((title, idx) => ({ title, feynman: '🔴 Novo' }));

    const topic = await Topic.create({
      title: topicTitle,
      subject: subjectId,
      owner: req.user._id,
      subtopics,
      nextReviewDate: getTodayDate(),
    });

    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// GET /api/topics?subjectId=xxx
// Lista tópicos de uma matéria
// -------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ message: 'subjectId é obrigatório' });

    const { error, status } = await getSubjectAndCheckAccess(subjectId, req.user);
    if (error) return res.status(status).json({ message: error });

    const topics = await Topic.find({ subject: subjectId }).sort({ createdAt: 1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// GET /api/topics/:id
// -------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });

    const { error, status } = await getSubjectAndCheckAccess(topic.subject, req.user);
    if (error) return res.status(status).json({ message: error });

    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// PATCH /api/topics/:id
// Atualiza campos simples do tópico (notas, deadline, etc.)
// -------------------------------------------------------
router.patch('/:id', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const allowed = ['title', 'feynman', 'domain', 'notes', 'deadline', 'visibility'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) topic[field] = req.body[field];
    });

    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/topics/:id
// -------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const topic = await Topic.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado ou sem permissão' });
    res.json({ message: 'Tópico removido' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// REVISÃO – curva de Ebbinghaus
// POST /api/topics/:id/review
// ============================================================
router.post('/:id/review', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const addDays = (dateStr, days) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };

    let nextLevel = (topic.reviewLevel || 0) + 1;
    let daysToAdd = 1;
    if (nextLevel === 1) daysToAdd = 1;
    else if (nextLevel === 2) daysToAdd = 7;
    else if (nextLevel >= 3) { daysToAdd = 30; nextLevel = 3; }

    const newDomain = Math.min((topic.domain || 1) + 1, 5);
    let newFeynman = topic.feynman;
    if (newDomain >= 4) newFeynman = '🟢 Explicado';
    else if (newDomain >= 2) newFeynman = '🟡 Quase lá';

    topic.domain = newDomain;
    topic.feynman = newFeynman;
    topic.reviewLevel = nextLevel;
    topic.lastStudiedDate = today;
    topic.nextReviewDate = addDays(today, daysToAdd);

    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// SUBTÓPICOS
// ============================================================

// POST /api/topics/:id/subtopics
router.post('/:id/subtopics', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Título é obrigatório' });

    topic.subtopics.push({ title, feynman: '🔴 Novo' });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/topics/:id/subtopics/:subtopicId – cicla o Feynman
router.patch('/:id/subtopics/:subtopicId', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const st = topic.subtopics.id(req.params.subtopicId);
    if (!st) return res.status(404).json({ message: 'Subtópico não encontrado' });

    if (req.body.feynman !== undefined) {
      st.feynman = req.body.feynman;
    } else {
      // ciclo automático
      const cycle = { '🔴 Novo': '🟡 Quase lá', '🟡 Quase lá': '🟢 Explicado', '🟢 Explicado': '🔴 Novo' };
      st.feynman = cycle[st.feynman] || '🔴 Novo';
    }

    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/topics/:id/subtopics/:subtopicId
router.delete('/:id/subtopics/:subtopicId', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    topic.subtopics.pull({ _id: req.params.subtopicId });
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// FLASHCARDS
// ============================================================

// POST /api/topics/:id/flashcards
router.post('/:id/flashcards', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Pergunta e resposta são obrigatórios' });

    topic.flashcards.push({ question, answer });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/topics/:id/flashcards/:flashcardId
router.delete('/:id/flashcards/:flashcardId', async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    topic.flashcards.pull({ _id: req.params.flashcardId });
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// ARQUIVOS (referências – não faz upload, apenas registra metadados)
// Para upload real: integre com Cloudinary, S3, etc.
// ============================================================

// POST /api/topics/:id/files  ou  /api/topics/:id/exercises
const addFileRef = (field) => async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Tópico não encontrado' });
    if (topic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const { name, url, type } = req.body;
    if (!name) return res.status(400).json({ message: 'name é obrigatório' });

    topic[field].push({ name, url: url || '', type: type || '' });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.post('/:id/files', addFileRef('files'));
router.post('/:id/exercises', addFileRef('exercises'));

export default router;
