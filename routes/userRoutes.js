import express from "express";
import User from "../models/User.js";

const router = express.Router();

// POST /api/users/register
router.post("/register", async (req, res) => {
  try {
    const { nombre, alias, email } = req.body;

    const aliasNormalized = alias.trim().ToLowerCase();

    // Verificamos si el alias ya existe
    const existing = await User.findOne({ alias: aliasNormalized });
    if (existing) {
      return res.status(400).json({ error: "Alias ya registrado" });
    }

    // Creamos nuevo usuario
    const newUser = new User({
      nombre,
      alias: aliasNormalized,
      email: email || "",
      cvu: "0000001234567890123456",
    });

    await newUser.save();

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { alias } = req.body;

    const user = await User.findOne({ alias: aliasNormalized });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

export default router;
