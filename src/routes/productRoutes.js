const { Router } = require('express');
const ProductController = require('../controllers/productController');

const router = Router();

router.get('/', ProductController.list);
router.get('/categories', ProductController.categories);
router.get('/:id', ProductController.getById);

module.exports = router;
