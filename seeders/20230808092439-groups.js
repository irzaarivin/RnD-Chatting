'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
     await queryInterface.bulkInsert('Groups', [{
      name: 'Barudag Sunda Team',
      description: 'Grup untuk project Management Kementrian',
      admin: 1,
      member: '123',
      createdAt: new Date(),
      updatedAt: new Date()
     }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Groups', null, {});
  }
};
