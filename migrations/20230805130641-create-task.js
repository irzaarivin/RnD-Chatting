'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      project: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Projects',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING
      },
      personincharge: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('progress', 'done', 'stack'),
        defaultValue: 'progress'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Tasks');
  }
};