'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const password = await bcrypt.hash('admin', 10);
    await queryInterface.bulkInsert('Users', [{
      name: 'admin',
      email: 'admin@gmail.com',
      password: password,
      role: 'teacher',
      value: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
