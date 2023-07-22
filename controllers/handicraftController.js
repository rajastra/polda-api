const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Handicraft = require('../models/handicraftModel');
const Tag = require('../models/tagModel');
const handlerFactory = require('./handlerFactory');
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.serviceAccountKey);

const storage = new Storage({
  projectId: 'rewaste-220523',
  credentials: serviceAccount,
});

const bucketName = 'rewaste-bucket-capstone';

const upload = multer({
  storage: multer.memoryStorage(),
});

exports.uploadHandicraftPhoto = upload.single('photo_url');

exports.createHandicraft = catchAsync(async (req, res, next) => {
  const { name, description, tags, steps } = req.body;
  const { file } = req;
  // Generate a unique filename for the uploaded file
  const filename = `${uuidv4()}${path.extname(file.originalname)}`;

  // Upload the file to Google Cloud Storage
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(filename);
  const stream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
    },
  });
  stream.on('error', (err) => {
    next(new AppError(err.message, 400));
  });
  stream.on('finish', async () => {
    // Create an array of tag names from the request body
    const tagNames = tags.split(',');
    console.log(tagNames);

    // Find or create the tag records by name
    const tagsItem = await Promise.all(
      tagNames.map((tname) =>
        Tag.findOrCreate({
          where: { name: tname },
        })
      )
    );

    // Construct the URL for the uploaded file
    const url = `https://storage.googleapis.com/${bucketName}/${filename}`;

    // Create an array of steps from the request body
    const stepList = steps.split('\n');

    // Create a new Handicraft record with the uploaded file URL
    const handicraft = await Handicraft.create({
      name,
      description,
      photo_url: url,
      steps: stepList,
    });

    await handicraft.addTags(tagsItem.map((tag) => tag[0]));

    res.status(201).json({
      status: 'success',
      data: {
        handicraft,
        tags: tagNames,
      },
    });
  });
  stream.end(file.buffer);
});

exports.deleteAssociatedFile = catchAsync(async (req, res, next) => {
  const handicraft = await Handicraft.findByPk(req.params.id);

  const filename = handicraft.photo_url.split('/').pop();

  console.log(filename);

  if (!handicraft) {
    return res.status(404).json({
      status: 'fail',
      message: 'Handicraft not found',
    });
  }

  // Delete the associated file from Google Cloud Storage
  const file = storage.bucket('rewaste-bucket-capstone').file(filename);
  await file.delete();
  next();
});

exports.getAllHandicrafts = catchAsync(async (req, res, next) => {
  let handicrafts;

  if (req.query.tags) {
    const tagNames = req.query.tags.split(',');
    const tags = await Tag.findAll({ where: { name: tagNames } });
    if (tags.length !== tagNames.length) {
      return res.status(404).json({
        status: 'fail',
        message: 'One or more tags not found',
      });
    }

    // Find the handicraft records that have the tags
    handicrafts = await Handicraft.findAll({
      include: [
        {
          model: Tag,
          as: 'tags',
          where: { name: { [Op.in]: tagNames } },
          through: { attributes: [] },
        },
      ],
    });
  } else {
    // Return all handicraft records
    handicrafts = await Handicraft.findAll({
      include: {
        model: Tag,
        as: 'tags',
      },
    });
  }

  // Extract the tag names from the handicrafts
  handicrafts = handicrafts.map((handicraft) => {
    const tagNames = handicraft.tags.map((tag) => tag.name);
    return {
      ...handicraft.toJSON(),
      tags: tagNames,
    };
  });

  res.status(200).json({
    status: 'success',
    results: handicrafts.length,
    data: handicrafts,
  });
});

exports.getHandicraft = catchAsync(async (req, res, next) => {
  const handicraft = await Handicraft.findByPk(req.params.id, {
    include: {
      model: Tag,
      as: 'tags',
      attributes: ['name'],
      through: { attributes: [] },
    },
  });

  if (!handicraft) {
    return next(new AppError('No document found with that ID', 404));
  }

  const tagNames = handicraft.tags.map((tag) => tag.name);

  res.status(200).json({
    status: 'success',
    data: {
      ...handicraft.toJSON(),
      tags: tagNames,
    },
  });
});

exports.updateHandicraft = catchAsync(async (req, res, next) => {
  const { name, description, tags, steps } = req.body;
  const { file } = req;

  // Find the handicraft record by ID
  const handicraft = await Handicraft.findByPk(req.params.id);

  if (!handicraft) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update the handicraft record with the new data
  if (name) handicraft.name = name;
  if (description) handicraft.description = description;
  if (file) {
    // Generate a unique filename for the uploaded file
    const filename = `${uuidv4()}${path.extname(file.originalname)}`;

    // Upload the file to Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(filename);
    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });
    stream.on('error', (err) => {
      next(new AppError(err.message, 400));
    });
    stream.on('finish', async () => {
      // Construct the URL for the uploaded file
      const url = `https://storage.googleapis.com/${bucketName}/${filename}`;

      // Update the handicraft record with the uploaded file URL
      handicraft.photo_url = url;
      await handicraft.save();
    });
    stream.end(file.buffer);
  }
  if (steps) handicraft.steps = steps.split('\n');
  await handicraft.save();

  // Update the tags associated with the handicraft
  if (tags) {
    // Create an array of tag names from the request body
    const tagNames = tags.split(',');

    // Find or create the tag records by name
    const tagsItem = await Promise.all(
      tagNames.map((tname) =>
        Tag.findOrCreate({
          where: { name: tname },
        })
      )
    );

    // Update the handicraft's tags
    await handicraft.setTags(tagsItem.map((tag) => tag[0]));
  }

  // Return the updated handicraft record
  const updatedHandicraft = await Handicraft.findByPk(req.params.id, {
    include: {
      model: Tag,
      as: 'tags',
      attributes: ['name'],
      through: { attributes: [] },
    },
  });

  const tagNames = updatedHandicraft.tags.map((tag) => tag.name);

  res.status(200).json({
    status: 'success',
    data: {
      ...updatedHandicraft.toJSON(),
      tags: tagNames,
    },
  });
});

exports.deleteHandicraft = handlerFactory.deleteOne(Handicraft);
