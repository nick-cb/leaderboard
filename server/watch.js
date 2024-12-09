const fs = require("fs");
const util = require('util');

const modules = Object.keys(require.cache).filter(
  (k) => !k.includes("node_modules"),
);

console.log(modules);
function watchFile(filePath) {
  fs.watchFile(filePath, () => {
    console.log(`File ${filePath} has changes`);
  });
}

for (const module of modules) {
  watchFile(module);
}
