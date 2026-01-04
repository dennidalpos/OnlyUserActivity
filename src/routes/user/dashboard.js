const express = require('express');
const router = express.Router();
const { requireUserAuth } = require('../../middlewares/userAuth');
const { getCurrentDate } = require('../../services/utils/dateUtils');

router.use(requireUserAuth);

router.get('/dashboard', (req, res) => {
  res.render('user/dashboard', {
    title: 'Dashboard',
    user: req.user,
    token: req.session.user.token,
    currentDate: getCurrentDate()
  });
});

module.exports = router;
