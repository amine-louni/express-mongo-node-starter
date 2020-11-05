const express = require('express');

const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const router = express.Router();

// CRUD routes
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead'),
    tourController.createTour
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead'),
    tourController.deleteTour
  );

// GEOSPATIAL Route
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getTourWithin);

//Aggregation

router.route('/stats').get(tourController.tourStats);
router
  .route('/month/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead'),
    tourController.monthlyPlan
  );
// Geospatial  aggregation
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

//Aliases
router
  .route('/top-5')
  .get(tourController.topFiveTours, tourController.getAllTours);
router
  .route('/brief')
  .get(tourController.briefTours, tourController.getAllTours);

module.exports = router;
