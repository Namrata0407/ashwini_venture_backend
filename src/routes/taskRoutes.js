const express = require('express');
const auth = require('../middleware/auth');
const { list, create, update, remove } = require('../controllers/taskController');

const router = express.Router();

router.use(auth);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
