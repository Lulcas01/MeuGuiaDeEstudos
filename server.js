import * as dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do arquivo .env

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pdfExtraction from 'pdf-extraction';
import { GoogleGenerativeAI } from '@google/generative-ai';

import User from './routes/User.js';

const app = express();

// O Render injeta automaticamente a porta na variável process.env.PORT
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors());

// ==========================================
// MOLDES DO BANCO DE DADOS (SCHEMAS)
// ==========================================

// 1. Molde da Matéria (Subject)
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: 'bar-blue' },
  deadlines: [{ title: String, date: String }]
}, { timestamps: true });
const Subject = mongoose.model('Subject', subjectSchema);

// 2. Molde do Tópico (Topic)
const subtopicSchema = new mongoose.Schema({ title: String, page: Number, feynman: { type: String, default: '🔴 Novo' } });
const flashcardSchema = new mongoose.Schema({ question: String, answer: String });
const topicSchema = new mongoose.Schema({
  subjectId: { type: String, required: true },
  title: { type: String, required: true },
  feynman: { type: String, default: '🔴 Novo' },
  domain: { type: Number, default: 1 },
  subtopics: [subtopicSchema],
  flashcards: [flashcardSchema],
  notes: { type: String, default: '' },
  deadline: { type: String, default: '' },
  reviewLevel: { type: Number, default: 0 },
  lastStudiedDate: { type: String, default: null },
  nextReviewDate: { type: String, default: '' },
  files: { type: Array, default: [] },
  exercises: { type: Array, default: [] }
}, { timestamps: true });
const Topic = mongoose.model('Topic', topicSchema);

// ==========================================
// 3. NOVO: Molde do Aluno (Student)
// ==========================================
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  turmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Turma', default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });
const Student = mongoose.model('Student', studentSchema);

// ==========================================
// 4. NOVO: Molde da Turma (Class)
// ==========================================
const turmaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, default: '' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  color: { type: String, default: 'bar-blue' },
  schedule: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: true });
const Turma = mongoose.model('Turma', turmaSchema);

// ==========================================
// CONEXÃO COM O MONGODB ATLAS & GEMINI
// ==========================================
// Puxando as credenciais do .env
const MONGO_URI = process.env.MONGO_URI;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
  .catch((err) => { console.error('❌ Erro ao conectar no MongoDB:', err.message); process.exit(1); });

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO (JWT)
// ==========================================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

const teacherOnly = (req, res, next) => {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ message: 'Acesso restrito a professores.' });
  }
  next();
};

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });

    const name = email.split('@')[0];
    const userRole = role === 'teacher' ? 'teacher' : 'student';
    await User.create({ name, email, password, role: userRole });
    res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno no servidor ao criar conta.' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'E-mail ou senha incorretos.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'E-mail ou senha incorretos.' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      message: 'Login bem-sucedido!', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao fazer login.' });
  }
});

// ==========================================
// ROTAS DE MATÉRIAS (SUBJECTS)
// ==========================================
app.get('/api/subjects', async (req, res) => {
  try { res.json(await Subject.find()); }
  catch (error) { res.status(500).json({ message: 'Erro ao buscar matérias.' }); }
});

app.post('/api/subjects', async (req, res) => {
  try { res.status(201).json(await Subject.create(req.body)); }
  catch (error) { res.status(500).json({ message: 'Erro ao criar matéria.' }); }
});

app.put('/api/subjects/:id', async (req, res) => {
  try { res.json(await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (error) { res.status(500).json({ message: 'Erro ao atualizar matéria.' }); }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    await Topic.deleteMany({ subjectId: req.params.id });
    res.json({ message: 'Matéria deletada.' });
  } catch (error) { res.status(500).json({ message: 'Erro ao deletar matéria.' }); }
});

// ==========================================
// ROTAS DE TÓPICOS (TOPICS)
// ==========================================
app.get('/api/topics', async (req, res) => {
  try { res.json(await Topic.find()); }
  catch (error) { res.status(500).json({ message: 'Erro ao buscar tópicos.' }); }
});

app.post('/api/topics', async (req, res) => {
  try { res.status(201).json(await Topic.create(req.body)); }
  catch (error) { res.status(500).json({ message: 'Erro ao criar tópico.' }); }
});

app.put('/api/topics/:id', async (req, res) => {
  try { res.json(await Topic.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (error) { res.status(500).json({ message: 'Erro ao atualizar tópico.' }); }
});

app.delete('/api/topics/:id', async (req, res) => {
  try { await Topic.findByIdAndDelete(req.params.id); res.json({ message: 'Tópico deletado.' }); }
  catch (error) { res.status(500).json({ message: 'Erro ao deletar tópico.' }); }
});

// ==========================================
// ROTAS DE TURMAS (CLASSES) — Apenas Professores
// ==========================================
app.get('/api/turmas', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const turmas = await Turma.find({ teacherId: req.user.id });
    res.json(turmas);
  } catch (error) { res.status(500).json({ message: 'Erro ao buscar turmas.' }); }
});

app.post('/api/turmas', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const turma = await Turma.create({ ...req.body, teacherId: req.user.id });
    res.status(201).json(turma);
  } catch (error) { res.status(500).json({ message: 'Erro ao criar turma.' }); }
});

app.put('/api/turmas/:id', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const turma = await Turma.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user.id },
      req.body, { new: true }
    );
    if (!turma) return res.status(404).json({ message: 'Turma não encontrada.' });
    res.json(turma);
  } catch (error) { res.status(500).json({ message: 'Erro ao atualizar turma.' }); }
});

app.delete('/api/turmas/:id', authMiddleware, teacherOnly, async (req, res) => {
  try {
    await Turma.findOneAndDelete({ _id: req.params.id, teacherId: req.user.id });
    await Student.updateMany({ turmaId: req.params.id }, { $set: { turmaId: null } });
    res.json({ message: 'Turma deletada.' });
  } catch (error) { res.status(500).json({ message: 'Erro ao deletar turma.' }); }
});

// ==========================================
// ROTAS DE ALUNOS (STUDENTS) — Apenas Professores
// ==========================================
app.get('/api/students', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const students = await Student.find({ teacherId: req.user.id }).populate('turmaId', 'name color');
    res.json(students);
  } catch (error) { res.status(500).json({ message: 'Erro ao buscar alunos.' }); }
});

app.post('/api/students', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const student = await Student.create({ ...req.body, teacherId: req.user.id });
    const populated = await student.populate('turmaId', 'name color');
    res.status(201).json(populated);
  } catch (error) { res.status(500).json({ message: 'Erro ao criar aluno.' }); }
});

app.put('/api/students/:id', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user.id },
      req.body, { new: true }
    ).populate('turmaId', 'name color');
    if (!student) return res.status(404).json({ message: 'Aluno não encontrado.' });
    res.json(student);
  } catch (error) { res.status(500).json({ message: 'Erro ao atualizar aluno.' }); }
});

app.delete('/api/students/:id', authMiddleware, teacherOnly, async (req, res) => {
  try {
    await Student.findOneAndDelete({ _id: req.params.id, teacherId: req.user.id });
    res.json({ message: 'Aluno removido.' });
  } catch (error) { res.status(500).json({ message: 'Erro ao deletar aluno.' }); }
});

// ==========================================
// ROTA DE IA E PDF
// ==========================================
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    const pdfData = await pdfExtraction(req.file.buffer);
    const textoExtraido = pdfData.text;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Atue como um professor especialista. Leia o seguinte texto extraído de um PDF.
      Sua tarefa é extrair a estrutura EXATA do sumário do documento e criar flashcards para cada seção.
      Retorne ESTRITAMENTE um objeto JSON com esta estrutura:
      {
        "title": "Nome da Matéria ou Título Principal do PDF",
        "notes": "Um resumo de 3 parágrafos sobre o assunto geral do PDF.",
        "subtopics": [
          {
            "title": "1.1 Estimativa pontual",
            "page": 4,
            "flashcards": [
              {"question": "Pergunta específica sobre o tópico 1.1", "answer": "Resposta curta"}
            ]
          }
        ]
      }
      TEXTO DO PDF:
      ${textoExtraido}
    `;

    const result = await model.generateContent(prompt);
    const iaResponse = JSON.parse(result.response.text());
    res.json({ message: 'Matéria processada com sucesso!', data: iaResponse });
  } catch (error) {
    console.error('Erro na IA:', error);
    res.status(500).json({ message: 'Erro ao processar com a Inteligência Artificial.' });
  }
});

// ==========================================
// NOVA ROTA: PROCESSAMENTO DE ARQUIVOS .MD
// ==========================================
app.post('/api/upload-md', upload.single('mdFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    const mdText = req.file.buffer.toString('utf-8');

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Atue como um professor especialista em exatas. Leia o conteúdo Markdown abaixo.
      
      INSTRUÇÕES IMPORTANTES PARA MATEMÁTICA:
      1. Se encontrar fórmulas matemáticas, PRESERVE-AS exatamente no formato LaTeX.
      2. Use $$ para fórmulas em bloco e $ para fórmulas na linha (inline).
      3. No JSON, certifique-se de que as barras invertidas do LaTeX sejam escapadas corretamente (ex: use \\\\frac em vez de \\frac) para que o JSON seja válido.
      4. Extraia subtópicos baseados nos títulos (#) e crie flashcards de perguntas e respostas.

      ESTRUTURA DO JSON:
      {
        "title": "Título do documento",
        "notes": "Resumo detalhado contendo as fórmulas principais em LaTeX se houver.",
        "subtopics": [
          {
            "title": "Nome do subtópico",
            "page": 1,
            "flashcards": [
              {"question": "Pergunta", "answer": "Resposta contendo a fórmula LaTeX se necessário"}
            ]
          }
        ]
      }

      CONTEÚDO MARKDOWN:
      ${mdText}
    `;

    const result = await model.generateContent(prompt);
    const iaResponse = JSON.parse(result.response.text());
    res.json({ message: 'Markdown processado!', data: iaResponse });
  } catch (error) {
    console.error('Erro ao processar MD:', error);
    res.status(500).json({ message: 'Erro ao processar o arquivo.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`=========================================\n`);
});