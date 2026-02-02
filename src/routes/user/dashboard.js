const express = require('express');
const router = express.Router();
const { requireUserAuth } = require('../../middlewares/userAuth');
const { getCurrentDate } = require('../../services/utils/dateUtils');
const shiftTypesService = require('../../services/admin/shiftTypesService');
const userStorage = require('../../services/storage/userStorage');

router.use(requireUserAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const storedUser = await userStorage.findByUserKey(req.user.userKey);
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const userShift = shiftTypes.find(type => type.name === storedUser?.shift || type.id === storedUser?.shift) || null;

    res.render('user/dashboard', {
      title: 'Dashboard',
      user: {
        ...req.user,
        displayName: storedUser?.displayName || req.user.displayName,
        shift: storedUser?.shift || null
      },
      token: req.session.user.token,
      currentDate: getCurrentDate(),
      userShift
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

module.exports = router;
