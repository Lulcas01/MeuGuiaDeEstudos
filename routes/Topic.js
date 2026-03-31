import mongoose from 'mongoose';

// ---------- sub-schemas ----------

const subtopicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  feynman: { type: String, default: '🔴 Novo' },
});

const flashcardSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
});

const fileRefSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String }, // URL pública (se usar cloud storage) ou nome do arquivo
  type: { type: String }, // MIME type
  uploadedAt: { type: Date, default: Date.now },
});

// ---------- main schema ----------

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Título do tópico é obrigatório'],
      trim: true,
      maxlength: [200, 'Título pode ter no máximo 200 caracteres'],
    },

    // Matéria a que pertence
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },

    // Quem criou (professor ou aluno)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // --- Método Feynman ---
    feynman: { type: String, default: '🔴 Novo' },

    // --- Domínio (1-5) ---
    domain: { type: Number, default: 1, min: 1, max: 5 },

    // --- Revisão espaçada (Ebbinghaus) ---
    reviewLevel: { type: Number, default: 0 },
    lastStudiedDate: { type: String, default: null }, // YYYY-MM-DD
    nextReviewDate: { type: String, default: null },  // YYYY-MM-DD

    // --- Prazo da tarefa ---
    deadline: { type: String, default: '' }, // YYYY-MM-DD

    // --- Notas livres ---
    notes: { type: String, default: '' },

    // --- Estrutura ---
    subtopics: [subtopicSchema],

    // --- Flashcards ---
    flashcards: [flashcardSchema],

    // --- Arquivos (referências) ---
    files: [fileRefSchema],
    exercises: [fileRefSchema],

    // Se visível apenas para o owner ou para toda a turma
    visibility: {
      type: String,
      enum: ['private', 'class'],
      default: 'private',
    },
  },
  { timestamps: true }
);

const Topic = mongoose.model('Topic', topicSchema);
export default Topic;
