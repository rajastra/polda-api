const express = require('express');

const router = express.Router();

const kegiatanController = require('../controllers/kegiatanController');

router
  .route('/')
  .get(kegiatanController.getAllKegiatan)
  .post(
    kegiatanController.uploadKegiatanPhoto,
    kegiatanController.createKegiatan
  );

// router
//   .route('/:id')
//   .get(kegiatanController.getHandicraft)
//   .patch(
//     kegiatanController.uploadHandicraftPhoto,
//     kegiatanController.updateHandicraft
//   )
//   .delete(
//     kegiatanController.deleteAssociatedFile,
//     kegiatanController.deleteHandicraft
//   );

module.exports = router;
