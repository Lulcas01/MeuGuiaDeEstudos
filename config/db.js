import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Substitua a string abaixo pela sua URI do MongoDB ou use variável de ambiente
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meuguia';
    
    const conn = await mongoose.connect(uri);
    
    console.log(`✅ Banco de dados conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Erro ao conectar ao banco de dados: ${error.message}`);
    // Encerra o processo em caso de falha na conexão
    process.exit(1); 
  }
};

export default connectDB;