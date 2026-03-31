import express from 'express';

const router = express.Router();

// Rota para listar matérias/assuntos
router.get('/', (req, res) => {
  res.json({ message: 'Lista de todas as matérias (subjects)' });
});

export default router;