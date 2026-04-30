const assert = require('node:assert/strict');
const bcrypt = require('../../node_modules/bcryptjs');

process.env.JWT_SECRET = 'unit_test_secret';

function loadAuthController(fakeUserModel) {
  const userModelPath = require.resolve('../../src/models/UserModel');
  const controllerPath = require.resolve('../../src/controllers/authController');

  delete require.cache[controllerPath];
  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: fakeUserModel
  };

  return require('../../src/controllers/authController');
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createUserModel(overrides = {}) {
  return {
    findByEmail: async () => null,
    create: async payload => ({
      id: 'user-1',
      name: payload.name,
      email: payload.email,
      passwordHash: payload.passwordHash,
      role: 'CUSTOMER'
    }),
    toPublic: user => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    },
    ...overrides
  };
}

function resetAuthControllerCache() {
  delete require.cache[require.resolve('../../src/controllers/authController')];
  delete require.cache[require.resolve('../../src/models/UserModel')];
}

async function runController(handler, body, userModel) {
  const AuthController = loadAuthController(userModel);
  const req = { body };
  const res = createResponse();
  let nextError = null;

  await AuthController[handler](req, res, error => {
    nextError = error;
  });

  resetAuthControllerCache();
  assert.equal(nextError, null);
  return res;
}

// Prueba unitaria de validacion del registro
async function testRegisterRequiredFields() {
  const res = await runController(
    'register',
    { email: 'ana@example.com' },
    createUserModel()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /obligatorios/i);
}

// Prueba unitaria de correo duplicado
async function testRegisterDuplicateEmail() {
  const res = await runController(
    'register',
    { name: 'Ana', email: 'ana@example.com', password: 'secret123' },
    createUserModel({
      findByEmail: async () => ({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hash'
      })
    })
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /Ya existe/i);
}

// Prueba unitaria de registro exitoso
async function testRegisterSuccess() {
  let createdPayload;
  const res = await runController(
    'register',
    { name: ' Ana ', email: 'ana@example.com', password: 'secret123' },
    createUserModel({
      create: async payload => {
        createdPayload = payload;
        return {
          id: 'user-1',
          name: payload.name,
          email: payload.email,
          passwordHash: payload.passwordHash,
          role: 'CUSTOMER'
        };
      }
    })
  );

  assert.equal(res.statusCode, 201);
  assert.equal(createdPayload.name, 'Ana');
  assert.notEqual(createdPayload.passwordHash, 'secret123');
  assert.equal(res.body.user.email, 'ana@example.com');
  assert.equal(res.body.user.passwordHash, undefined);
  assert.equal(typeof res.body.token, 'string');
}

// Prueba unitaria de validacion del login
async function testLoginRequiredFields() {
  const res = await runController(
    'login',
    { email: 'ana@example.com' },
    createUserModel()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /obligatorios/i);
}

// Prueba unitaria de login con credenciales incorrectas
async function testLoginWrongCredentials() {
  const passwordHash = await bcrypt.hash('secret123', 4);
  const res = await runController(
    'login',
    { email: 'ana@example.com', password: 'incorrecta' },
    createUserModel({
      findByEmail: async () => ({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash
      })
    })
  );

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /Credenciales/i);
}

// Prueba unitaria de login exitoso
async function testLoginSuccess() {
  const passwordHash = await bcrypt.hash('secret123', 4);
  const res = await runController(
    'login',
    { email: 'ana@example.com', password: 'secret123' },
    createUserModel({
      findByEmail: async () => ({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash,
        role: 'CUSTOMER'
      })
    })
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.email, 'ana@example.com');
  assert.equal(res.body.user.passwordHash, undefined);
  assert.equal(typeof res.body.token, 'string');
}

async function main() {
  const cases = {
    register_required_fields: testRegisterRequiredFields,
    register_duplicate_email: testRegisterDuplicateEmail,
    register_success: testRegisterSuccess,
    login_required_fields: testLoginRequiredFields,
    login_wrong_credentials: testLoginWrongCredentials,
    login_success: testLoginSuccess
  };
  const selectedCase = process.argv[2];

  if (selectedCase) {
    assert.ok(cases[selectedCase], `Caso unitario no encontrado: ${selectedCase}`);
    await cases[selectedCase]();
    return;
  }

  for (const runCase of Object.values(cases)) {
    await runCase();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
