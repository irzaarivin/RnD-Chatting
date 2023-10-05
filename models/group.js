'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      Group.belongsTo(models.User, {
        foreignKey: 'admin',
        as: 'adminGroup',
      });
    }
  }
  Group.init({
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    admin: DataTypes.INTEGER,
    member: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Group',
  });
  return Group;
};