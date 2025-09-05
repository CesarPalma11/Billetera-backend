import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  alias: { type: String, required: true, unique: true },
  email: { type: String },
  cvu: { type: String, unique: true },
  saldo: { type: Number, default: 0 },
  movimientos: [
    {
      tipo: String, // "ingreso" | "egreso"
      monto: Number,
      descripcion: String,
      fecha: { type: Date, default: Date.now },
    }
  ]
});

const User = mongoose.model("User", userSchema);
export default User;
