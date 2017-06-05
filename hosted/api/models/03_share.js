module.exports = function (sequelize, DataTypes) {
	var app = sequelize.app; 

	var Share = sequelize.define('Share', 
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
	      primaryKey: true
			},

			trackedDeviceDevicename: {
				type : DataTypes.STRING,
				allowNull: true
			},

			accepted: {
				type: DataTypes.BOOLEAN,
				allowNull: false
			},
		}, {
		hooks: {
                                afterCreate: function(instance, options, fn){
                                        //app.statsd.increment("shares");
                                        fn();
                                },
                                afterDestroy: function(instance, options, fn){
                                        //app.statsd.decrement("shares");
                                        fn();
                                }

                        },
		  indexes: [
		    {
		      name: 'Shares_trackedUserId_trackingUserId_trackedDeviceId_unique',
		      unique: true,
		      method: 'BTREE',
		      fields: ['trackingUserId', 'trackedUserId', 'trackedDeviceId']
		    },
		  ],

			instanceMethods : {

			},
			classMethods : {
				associate: function(models){
					Share.belongsTo(models.Device, {foreignKey: 'trackedDeviceId'});
					Share.belongsTo(models.User, {foreignKey: 'trackedUserId', as: 'trackedUser'});
					Share.belongsTo(models.User, {foreignKey: 'trackingUserId', as: 'trackingUser'});
				}
			}
		}
	);
	return Share; 
}

