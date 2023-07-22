const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Tag = sequelize.define(
  'Tag',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
  },
  { timestamps: false }
);

module.exports = Tag;
