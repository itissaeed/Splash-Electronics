const appPromise = require('../server');

module.exports = async (req, res) => {
  const app = await appPromise;
  return app(req, res);
};
