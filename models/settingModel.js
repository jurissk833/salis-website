const Setting = require('./settingSchema');

module.exports = {
    // Get a specific setting by key
    get: async (key, defaultValue = null) => {
        const setting = await Setting.findOne({ key }).lean();
        return setting ? setting.value : defaultValue;
    },

    // Get all settings as a key-value object
    getAll: async () => {
        const settings = await Setting.find({}).lean();
        return settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    },

    // Set a setting (update or create)
    set: async (key, value) => {
        return await Setting.findOneAndUpdate(
            { key },
            { key, value },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
};
