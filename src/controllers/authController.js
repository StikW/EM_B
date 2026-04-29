const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body || {};

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
      }
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'El email no tiene un formato válido.' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'Ya existe un usuario registrado con ese email.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
        name: name.trim(),
        email: email.trim(),
        passwordHash
      });
      const token = signToken(user);

      return res.status(201).json({
        message: 'Usuario registrado correctamente.',
        user: UserModel.toPublic(user),
        token
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son obligatorios.' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const token = signToken(user);
      return res.json({
        message: 'Inicio de sesión exitoso.',
        user: UserModel.toPublic(user),
        token
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.sub);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      return res.json({ user: UserModel.toPublic(user) });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
