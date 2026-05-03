const CartModel = require('../models/CartModel');

function parseProductId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function parseQuantity(raw) {
  const q = Number(raw);
  if (!Number.isInteger(q) || q <= 0) return null;
  return q;
}

class CartController {
  /**
   * GET /api/cart
   * Devuelve el carrito del usuario autenticado (lo crea vacío si no existe).
   */
  static async getCart(req, res, next) {
    try {
      const cart = await CartModel.getOrCreateByUserId(req.user.sub);
      return res.json({ cart: CartModel.toPublic(cart) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/cart/items
   * Body: { productId: number, quantity?: number }
   * Agrega un producto al carrito o aumenta su cantidad.
   */
  static async addItem(req, res, next) {
    try {
      const productId = parseProductId(req.body?.productId);
      const quantity = parseQuantity(req.body?.quantity ?? 1);

      if (!productId) {
        return res.status(400).json({ message: 'productId inválido o faltante.' });
      }
      if (!quantity) {
        return res.status(400).json({ message: 'quantity debe ser un entero mayor a 0.' });
      }

      const product = await CartModel.getProductStock(productId);
      if (!product) {
        return res.status(404).json({ message: 'El producto no existe.' });
      }

      // Validar stock disponible considerando lo que ya hay en el carrito
      const currentCart = await CartModel.getOrCreateByUserId(req.user.sub);
      const existingItem = currentCart.items.find(it => it.productId === productId);
      const futureQuantity = (existingItem?.quantity || 0) + quantity;
      if (futureQuantity > product.stock) {
        return res.status(409).json({
          message: `Stock insuficiente. Disponibles: ${product.stock}, en carrito: ${existingItem?.quantity || 0}.`
        });
      }

      await CartModel.addItem(req.user.sub, productId, quantity);
      const cart = await CartModel.getOrCreateByUserId(req.user.sub);

      return res.status(201).json({
        message: 'Producto agregado al carrito.',
        cart: CartModel.toPublic(cart)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/cart/items/:productId
   * Body: { quantity: number }
   * Reemplaza la cantidad de un item existente.
   */
  static async updateItem(req, res, next) {
    try {
      const productId = parseProductId(req.params.productId);
      const quantity = parseQuantity(req.body?.quantity);

      if (!productId) {
        return res.status(400).json({ message: 'productId inválido.' });
      }
      if (!quantity) {
        return res.status(400).json({ message: 'quantity debe ser un entero mayor a 0.' });
      }

      const product = await CartModel.getProductStock(productId);
      if (!product) {
        return res.status(404).json({ message: 'El producto no existe.' });
      }
      if (quantity > product.stock) {
        return res.status(409).json({
          message: `Stock insuficiente. Disponibles: ${product.stock}.`
        });
      }

      try {
        await CartModel.updateItemQuantity(req.user.sub, productId, quantity);
      } catch (err) {
        if (err.code === 'P2025') {
          return res.status(404).json({ message: 'El item no existe en el carrito.' });
        }
        throw err;
      }

      const cart = await CartModel.getOrCreateByUserId(req.user.sub);
      return res.json({
        message: 'Cantidad actualizada.',
        cart: CartModel.toPublic(cart)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/cart/items/:productId
   * Elimina un item del carrito.
   */
  static async removeItem(req, res, next) {
    try {
      const productId = parseProductId(req.params.productId);
      if (!productId) {
        return res.status(400).json({ message: 'productId inválido.' });
      }

      try {
        await CartModel.removeItem(req.user.sub, productId);
      } catch (err) {
        if (err.code === 'P2025') {
          return res.status(404).json({ message: 'El item no existe en el carrito.' });
        }
        throw err;
      }

      const cart = await CartModel.getOrCreateByUserId(req.user.sub);
      return res.json({
        message: 'Item eliminado del carrito.',
        cart: CartModel.toPublic(cart)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/cart
   * Vacía completamente el carrito.
   */
  static async clearCart(req, res, next) {
    try {
      const removed = await CartModel.clear(req.user.sub);
      const cart = await CartModel.getOrCreateByUserId(req.user.sub);
      return res.json({
        message: `Carrito vaciado. Items eliminados: ${removed}.`,
        cart: CartModel.toPublic(cart)
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CartController;
