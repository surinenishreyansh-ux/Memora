const crypto = require('crypto');

const createSlug = (name) => {
  const randomStr = crypto.randomBytes(6).toString('hex');
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + randomStr;
};

module.exports = createSlug;
