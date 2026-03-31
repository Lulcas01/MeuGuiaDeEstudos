import express from 'express';
import jwt from 'jsonwebtoken';
import User from './User.js';
import { protect } from './auth.js';

const router = express.Router();

// Helper: gera JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// -------------------------------------------------------
// POST /api/auth/register
// Cria conta de aluno ou professor
// Body: { name, email, password, role? }
// -------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'E-mail já cadastrado' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'teacher' ? 'teacher' : 'student',
    });

    const token = signToken(user._id);

    res.status(201).json({
      message: 'Conta criada com sucesso',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// -------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
    }

    // Busca com a senha (select: false no schema)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    const token = signToken(user._id);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------
// GET /api/auth/me  (autenticado)
// Retorna o usuário logado
// -------------------------------------------------------
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

// -------------------------------------------------------
// PATCH /api/auth/me  (autenticado)
// Atualiza nome
// -------------------------------------------------------
router.patch('/me', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (name) req.user.name = name;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
