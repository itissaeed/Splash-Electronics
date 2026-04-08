const appPromise = require('../server');

module.exports = async (req, res) => {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Serverless bootstrap failed:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server failed to start',
    });
  }
};
