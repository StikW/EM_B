const prisma = require('../config/prisma');

class ProductModel {
  static async findAll({ category, search } = {}) {
    const where = {};
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    return prisma.product.findMany({
      where,
      orderBy: { id: 'asc' }
    });
  }

  static async findById(id) {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return null;
    return prisma.product.findUnique({ where: { id: numericId } });
  }

  static async getCategories() {
    const rows = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    return rows.map(r => r.category);
  }
}

module.exports = ProductModel;
