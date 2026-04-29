const prisma = require('../config/prisma');

class UserModel {
  static async findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  static async findByEmail(email) {
    if (!email) return null;
    return prisma.user.findUnique({
      where: { email: String(email).toLowerCase() }
    });
  }

  static async findById(id) {
    if (!id) return null;
    return prisma.user.findUnique({ where: { id } });
  }

  static async create({ name, email, passwordHash }) {
    return prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash
      }
    });
  }

  static toPublic(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

module.exports = UserModel;
