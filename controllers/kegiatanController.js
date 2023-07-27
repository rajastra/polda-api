const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Kegiatan = require('../models/kegiatanModel');
const handlerFactory = require('./handlerFactory');
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.serviceAccountKey);

const storage = new Storage({
  projectId: 'project-polda',
  credentials: serviceAccount,
});

const bucketName = 'bucket-polda';

const upload = multer({
  storage: multer.memoryStorage(),
});

exports.uploadKegiatanPhoto = upload.single('photo_url');

exports.getAllKegiatan = handlerFactory.getAll(Kegiatan);

exports.createKegiatan = catchAsync(async (req, res, next) => {
  const { title, description } = req.body;
  const { file } = req;
  console.log(title, description, file);
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

    const kegiatan = await Kegiatan.create({
      title,
      description,
      photo_url: url,
    });

    res.status(201).json({
      status: 'success',
      data: {
        kegiatan,
      },
    });
  });
  stream.end(file.buffer);
});

exports.deleteAssociatedFile = catchAsync(async (req, res, next) => {
  const handicraft = await Kegiatan.findByPk(req.params.id);

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

exports.deleteHandicraft = handlerFactory.deleteOne(Kegiatan);
