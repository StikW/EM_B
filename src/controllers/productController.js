const ProductModel = require('../models/ProductModel');

class ProductController {
  static async list(req, res, next) {
    try {
      const { category, search } = req.query;
      const products = await ProductModel.findAll({ category, search });
      return res.json({
        count: products.length,
        products
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado.' });
      }
      return res.json({ product });
    } catch (err) {
      next(err);
    }
  }

  static async categories(req, res, next) {
    try {
      const categories = await ProductModel.getCategories();
      return res.json({ categories });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
