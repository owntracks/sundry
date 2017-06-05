module.exports = function (sequelize, DataTypes) {
	var app = sequelize.app; 

	var Permission = sequelize.define('Permission', 
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
	      primaryKey: true
			},
			username: {
				type : DataTypes.STRING,
				allowNull: false
			},
			topic: {
				type : DataTypes.STRING,
				allowNull: false
			},
			rw: {
				type: DataTypes.ENUM('0', '1', '2'),
				allowNull: false, 
				defaulValue: '0'
			},
			userId: {
				type: DataTypes.INTEGER, 
				allowNull: true
			},
			deviceId: {
				type: DataTypes.INTEGER, 
				allowNull: true

			},
			shareId: {
				type: DataTypes.INTEGER, 
				allowNull: true
			},


		}, {
			instanceMethods : {

			},
			classMethods : {
				associate: function(models){
					Permission.belongsTo(models.Device, {foreignKey: 'deviceId', onDelete: 'cascade'});
					Permission.belongsTo(models.User, {foreignKey: 'userId', onDelete: 'cascade'});
					Permission.belongsTo(models.Share, {foreignKey: 'shareId', onDelete: 'cascade'});

				}
			}
		}
	);
	return Permission; 
}

