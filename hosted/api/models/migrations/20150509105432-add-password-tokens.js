'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    migration.addColumn('Users', 'passwordResetToken', {type: DataTypes.STRING, allowNull: true, default: null})
    migration.addColumn('Users', 'passwordResetTokenExpires', {type: DataTypes.TIME, allowNull: true, default: null})
  },

  down: function (queryInterface, Sequelize) {
    migration.removeColumn('Users', 'passwordResetToken');
    migration.removeColumn('Users', 'passwordResetTokenExpires');
  }
};
