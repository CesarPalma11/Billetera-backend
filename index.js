import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());



app.use("/api/users", userRoutes);
// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB conectado 🚀"))
.catch(err => console.error(err));

// Rutas de prueba
app.get("/", (req, res) => {
  res.send("API de Billetera funcionando ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
