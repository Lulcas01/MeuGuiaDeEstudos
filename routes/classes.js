import express from 'express';

const router = express.Router();

// Rota GET: Listar todas as classes/aulas
router.get('/', (req, res) => {
  res.json({ message: 'Lista de todas as classes' });
});

// Rota POST: Criar uma nova classe/aula
router.post('/', (req, res) => {
  res.json({ message: 'Classe criada com sucesso!' });
});

// Rota GET: Buscar uma classe/aula específica pelo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Buscando dados da classe com ID: ${id}` });
});

export default router;