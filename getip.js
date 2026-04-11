const os = require('os');
const n = os.networkInterfaces();
Object.keys(n).forEach(k => {
  n[k].forEach(a => {
    if (a.family === 'IPv4' && !a.internal) {
      console.log(k + ': ' + a.address);
    }
  });
});
