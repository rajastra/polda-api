const express = require('express');

const router = express.Router();

const handicraftController = require('../controllers/handicraftController');

router
  .route('/')
  .get(handicraftController.getAllHandicrafts)
  .post(
    handicraftController.uploadHandicraftPhoto,
    handicraftController.createHandicraft
  );

router
  .route('/:id')
  .get(handicraftController.getHandicraft)
  .patch(
    handicraftController.uploadHandicraftPhoto,
    handicraftController.updateHandicraft
  )
  .delete(
    handicraftController.deleteAssociatedFile,
    handicraftController.deleteHandicraft
  );

module.exports = router;
