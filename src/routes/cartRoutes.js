const { Router } = require('express');
const CartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', CartController.getCart);
router.post('/items', CartController.addItem);
router.patch('/items/:productId', CartController.updateItem);
router.delete('/items/:productId', CartController.removeItem);
router.delete('/', CartController.clearCart);

module.exports = router;
