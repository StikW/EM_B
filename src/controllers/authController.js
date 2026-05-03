const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

/**
 * Validación de email en tiempo lineal (sin regex vulnerable a ReDoS, Sonar S5852).
 * Equivale al patrón anterior salvo límites RFC (local ≤64, dominio ≤253) que el regex no aplicaba.
 */
function isValidEmail(raw) {
  if (typeof raw !== 'string') return false;
  // Mismo criterio que el regex antiguo (^…$): sin espacios al inicio ni al final del string.
  if (raw !== raw.trim()) return false;
  const email = raw;
  if (email.length === 0 || email.length > 254) return false;
  if (/\s/.test(email)) return false;

  const at = email.indexOf('@');
  if (at <= 0) return false;
  if (email.indexOf('@', at + 1) !== -1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  // RFC 5321: parte local ≤ 64, dominio ≤ 253 (el regex antiguo no lo limitaba; aquí sí, por corrección).
  if (local.length > 64 || domain.length === 0 || domain.length > 253) return false;

  const dot = domain.lastIndexOf('.');
  if (dot <= 0 || dot === domain.length - 1) return false;

  const tld = domain.slice(dot + 1);
  if (tld.length === 0) return false;

  for (const part of domain.split('.')) {
    if (part.length === 0) return false;
  }
  return true;
}

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
      if (!isValidEmail(email)) {
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
