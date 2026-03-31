import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome pode ter no máximo 100 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'E-mail inválido'],
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
      select: false, // nunca retorna a senha em queries normais
    },
    // 'teacher' = professor | 'student' = aluno
    role: {
      type: String,
      enum: ['teacher', 'student'],
      default: 'student',
    },
    // Turmas em que o aluno está matriculado (referência a Class)
    enrolledClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  },
  { timestamps: true }
);

// Hash a senha antes de salvar (CORRIGIDO: Sem o 'next')
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove a senha do JSON retornado
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;