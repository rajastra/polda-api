const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const Tag = require('./tagModel');

const Handicraft = sequelize.define(
  'Handicraft',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    photo_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    steps: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
  },
  { timestamps: false }
);

Handicraft.belongsToMany(Tag, { through: 'HandicraftTag', as: 'tags' });
Tag.belongsToMany(Handicraft, { through: 'HandicraftTag', as: 'handicrafts' });

module.exports = Handicraft;
