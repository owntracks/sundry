module.exports = function (sequelize, DataTypes) {
	var app = sequelize.app; 

	var Session = sequelize.define('Session', 
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
	      			primaryKey: true
			},
			secret: {type: DataTypes.STRING, allowNull: false},
			type: {
				type: DataTypes.ENUM,
				values: ['generic', 'mobile', 'web'],
				defaultValue: 'generic'	
			}

		}, {

			instanceMethods : {

			},
			classMethods : {
				associate: function(models){
					Session.belongsTo(models.User, {foreignKey: 'userId'});
				}
			}
		}
	);
	return Session; 
}

