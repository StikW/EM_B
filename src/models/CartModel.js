const prisma = require('../config/prisma');

const ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      image: true,
      category: true,
      stock: true
    }
  }
};

class CartModel {
  /**
   * Devuelve el carrito del usuario. Si no existe, lo crea vacío.
   */
  static async getOrCreateByUserId(userId) {
    const existing = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: ITEM_INCLUDE, orderBy: { createdAt: 'asc' } } }
    });
    if (existing) return existing;

    return prisma.cart.create({
      data: { userId },
      include: { items: { include: ITEM_INCLUDE } }
    });
  }

  /**
   * Agrega un producto al carrito o suma a la cantidad existente.
   */
  static async addItem(userId, productId, quantity) {
    const cart = await this.getOrCreateByUserId(userId);

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } }
    });

    if (existing) {
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: ITEM_INCLUDE
      });
    }

    return prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
      include: ITEM_INCLUDE
    });
  }

  /**
   * Reemplaza la cantidad de un item específico.
   */
  static async updateItemQuantity(userId, productId, quantity) {
    const cart = await this.getOrCreateByUserId(userId);
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity },
      include: ITEM_INCLUDE
    });
  }

  /**
   * Elimina un item del carrito.
   */
  static async removeItem(userId, productId) {
    const cart = await this.getOrCreateByUserId(userId);
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId } }
    });
  }

  /**
   * Vacía el carrito (borra todos los items pero conserva el carrito).
   */
  static async clear(userId) {
    const cart = await this.getOrCreateByUserId(userId);
    const result = await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return result.count;
  }

  /**
   * Verifica si un producto existe y devuelve su stock.
   */
  static async getProductStock(productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, name: true }
    });
    return product;
  }

  /**
   * Calcula totales del carrito (cantidad y subtotal).
   */
  static computeTotals(cart) {
    let totalItems = 0;
    let subtotal = 0;
    for (const item of cart.items || []) {
      totalItems += item.quantity;
      subtotal += item.quantity * (item.product?.price || 0);
    }
    return { totalItems, subtotal };
  }

  /**
   * Serializa el carrito al formato público de la API.
   */
  static toPublic(cart) {
    if (!cart) return null;
    const { totalItems, subtotal } = this.computeTotals(cart);
    return {
      id: cart.id,
      userId: cart.userId,
      items: (cart.items || []).map(it => ({
        id: it.id,
        productId: it.productId,
        quantity: it.quantity,
        product: it.product,
        lineTotal: it.quantity * (it.product?.price || 0)
      })),
      totalItems,
      subtotal,
      updatedAt: cart.updatedAt
    };
  }
}

module.exports = CartModel;
