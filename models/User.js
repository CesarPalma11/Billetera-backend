import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // ✅ IMPORTANTE




const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  alias: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  cvu: { type: String, unique: true },
  saldo: { type: Number, default: 4500 },
  fcmToken: { type: String }, 
  movimientos: [
    {
      tipo: String,
      monto: Number,
      descripcion: String,
      fecha: { type: Date, default: Date.now },
    },
  ],
});

// ✅ Hash automático antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Método para comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
