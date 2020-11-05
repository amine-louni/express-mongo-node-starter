const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/ApiFeatures');

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let filter;
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const apiFeats = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .selectFields()
      .paginate();

    //EXECUTE QUERY
    const docs = await apiFeats.mongoQuery;
    res.status(200).json({
      status: 'success ✔',
      results: docs.length,
      req_at: req.requestedTime,
      data: {
        docs,
      },
    });
  });
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('no document found with that id', 404));
    }
    res.status(200).json({
      status: 'success ✔',
      data: {
        data: doc,
      },
    });
  });
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success ✔',
      data: doc,
    });
  });
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      runValidators: true,
      new: true,
    });
    if (!doc) {
      return next(new AppError('no doc found with that id', 404));
    }
    res.status(201).json({
      status: 'success ✔',
      data: doc,
    });
  });
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('no document found with that id', 404));
    }
    res.status(204).json({
      status: 'success ✔',
      data: null,
    });
  });
