const bcrypt = require('../../node_modules/bcryptjs');

process.env.JWT_SECRET = 'pytest_secret';
process.env.CORS_ORIGIN = 'http://localhost:4200';

const app = require('../../src/app');
const UserModel = require('../../src/models/UserModel');

// Datos mock de usuarios para las pruebas
const users = new Map();

// Helper para crear usuarios de prueba
function addUser({ id, name, email, password, role = 'CUSTOMER' }) {
  const user = {
    id,
    name,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 4),
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  users.set(user.email, user);
  return user;
}

// Usuario administrador de prueba
addUser({
  id: 'admin-1',
  name: 'Administrador EcoMart',
  email: 'admin@ecomart.com',
  password: 'Admin123!',
  role: 'ADMIN'
});

// Usuario cliente de prueba
addUser({
  id: 'customer-1',
  name: 'Cliente de Prueba',
  email: 'cliente@ecomart.com',
  password: 'Cliente123!'
});

// Mock de busqueda de usuario por email
UserModel.findByEmail = async email => {
  if (!email) return null;
  return users.get(String(email).toLowerCase()) || null;
};

// Mock de busqueda de usuario por id
UserModel.findById = async id => {
  return [...users.values()].find(user => user.id === id) || null;
};

// Mock de creacion de usuario
UserModel.create = async ({ name, email, passwordHash }) => {
  const user = {
    id: `user-${users.size + 1}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'CUSTOMER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  users.set(user.email, user);
  return user;
};

// Servidor Express aislado para pytest
const server = app.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  process.stdout.write(JSON.stringify({ url: `http://127.0.0.1:${port}` }) + '\n');
});

// Cierre limpio del servidor
function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
