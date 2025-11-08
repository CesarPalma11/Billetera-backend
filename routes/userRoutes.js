import express from "express";
import User from "../models/User.js";
import admin from "../firebase.js";

const router = express.Router();

// 🟢 REGISTRO DE USUARIO
router.post("/register", async (req, res) => {
  try {
    const { nombre, alias, email, password } = req.body;

    if (!email) return res.status(400).json({ error: "El correo electrónico es obligatorio" });
    if (!password || password.length < 6)
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

    const aliasNormalized = alias.trim().toLowerCase();
    const emailNormalized = email.trim().toLowerCase();

    // Verificar si ya existe usuario con ese email o alias
    const existingEmail = await User.findOne({ email: emailNormalized });
    const existingAlias = await User.findOne({ alias: aliasNormalized });
    if (existingEmail) return res.status(400).json({ error: "El correo electrónico ya está registrado" });
    if (existingAlias) return res.status(400).json({ error: "El alias ya está en uso" });

    // Generar CVU
    const generateCVU = () => Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join("");
    const cvu = generateCVU();

    const newUser = new User({
      nombre,
      alias: aliasNormalized,
      email: emailNormalized,
      password,
      cvu,
      saldo: 4500, // 👈 saldo inicial opcional
      movimientos: [],
    });

    await newUser.save();

    res.status(201).json({
      message: "Usuario registrado con éxito",
      nombre: newUser.nombre,
      alias: newUser.alias,
      email: newUser.email,
      saldo: newUser.saldo,
      cvu: newUser.cvu,
    });
  } catch (err) {
    console.error("❌ Error en /register:", err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// 🟢 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Debe ingresar correo y contraseña" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Contraseña incorrecta" });

    res.json({
      nombre: user.nombre,
      alias: user.alias,
      email: user.email,
      saldo: user.saldo,
      cvu: user.cvu,
      movimientos: user.movimientos,
    });
  } catch (err) {
    console.error("❌ Error en /login:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// 🟢 ACTUALIZAR ALIAS
router.patch("/update-alias", async (req, res) => {
  try {
    const { email, newAlias } = req.body;

    if (!email || !newAlias)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    const aliasNormalized = newAlias.trim().toLowerCase();

    const aliasExists = await User.findOne({ alias: aliasNormalized });
    if (aliasExists) return res.status(400).json({ error: "Alias ya en uso" });

    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { alias: aliasNormalized },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({ message: "Alias actualizado correctamente", alias: user.alias });
  } catch (err) {
    console.error("❌ Error en /update-alias:", err);
    res.status(500).json({ error: "Error al actualizar alias" });
  }
});

// 🟢 TRANSFERENCIA
router.post("/transfer", async (req, res) => {
  try {
    const { fromEmail, toAlias, amount, description } = req.body;

    // Validaciones básicas
    if (!fromEmail || !toAlias || !amount || amount <= 0) {
      return res.status(400).json({ error: "Datos incompletos o inválidos" });
    }

    // Buscar remitente
    const sender = await User.findOne({ email: fromEmail.trim().toLowerCase() });
    if (!sender) return res.status(404).json({ error: "Usuario remitente no encontrado" });

    // Buscar destinatario
    const receiver = await User.findOne({ alias: toAlias.trim().toLowerCase() });
    if (!receiver) return res.status(404).json({ error: "Usuario destinatario no encontrado" });

    // Validar saldo
    if (sender.saldo < amount) return res.status(400).json({ error: "Saldo insuficiente" });

    // Actualizar saldos
    sender.saldo -= amount;
    receiver.saldo += amount;

    // Registrar movimientos
    sender.movimientos.push({
      tipo: "transferencia-enviada",
      monto: -amount,
      descripcion: description || `Transferencia a ${toAlias}`,
    });

    receiver.movimientos.push({
      tipo: "transferencia-recibida",
      monto: amount,
      descripcion: description || `Transferencia de ${sender.alias}`,
    });

    await sender.save();
    await receiver.save();

    // 💬 Enviar notificación push al receptor si tiene token
    if (receiver.fcmToken) {
      const message = {
        token: receiver.fcmToken,
        notification: {
          title: "¡Has recibido una transferencia!",
          body: `Recibiste $${amount} de ${sender.alias}`,
        },
        data: {
          type: "transferencia",
          amount: amount.toString(),
          from: sender.alias,
        },
      };

      try {
        await admin.messaging().send(message);
        console.log(`✅ Notificación enviada a ${receiver.alias}`);
      } catch (err) {
        console.error(`❌ Error al enviar notificación a ${receiver.alias}:`, err);
      }
    } else {
      console.log(`ℹ️ Usuario ${receiver.alias} no tiene token push`);
    }

    res.json({
      message: `Transferencia de $${amount} realizada a ${toAlias}`,
      saldoActual: sender.saldo,
    });
  } catch (err) {
    console.error("❌ Error en /transfer:", err);
    res.status(500).json({ error: "Error al realizar la transferencia" });
  }
});


// 🟢 GASTOS
router.post("/spend", async (req, res) => {
  try {
    const { email, amount, description } = req.body;

    if (!email || !amount || amount <= 0)
      return res.status(400).json({ error: "Datos incompletos o inválidos" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (user.saldo < amount)
      return res.status(400).json({ error: "Saldo insuficiente" });

    user.saldo -= amount;
    user.movimientos.push({
      tipo: "gasto",
      monto: -amount,
      descripcion: description || "Gasto realizado",
    });

    await user.save();

    res.json({
      message: `Se gastaron $${amount}`,
      saldoActual: user.saldo,
    });
  } catch (err) {
    console.error("❌ Error en /spend:", err);
    res.status(500).json({ error: "Error al registrar el gasto" });
  }
});



// 🟢 OBTENER USUARIO POR EMAIL (para refrescar datos en la app)
// 🟢 OBTENER DATOS DEL USUARIO POR EMAIL
router.get("/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      nombre: user.nombre,
      alias: user.alias,
      email: user.email,
      saldo: user.saldo,
      cvu: user.cvu,
      movimientos: user.movimientos,
    });
  } catch (err) {
    console.error("❌ Error en GET /:email:", err);
    res.status(500).json({ error: "Error al obtener datos del usuario" });
  }
});


// 🟢 GUARDAR FCM TOKEN
router.post("/save-token", async (req, res) => {
  try {
    const { email, fcmToken } = req.body;
    if (!email || !fcmToken)
      return res.status(400).json({ error: "Datos faltantes" });

    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { fcmToken },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({ message: "Token guardado", fcmToken: user.fcmToken });
  } catch (err) {
    console.error("❌ Error en /save-token:", err);
    res.status(500).json({ error: "Error al guardar el token" });
  }
});


export default router;
