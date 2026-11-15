// Local static files only; no API proxy and no workspace directory listing.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const flows=process.argv.includes('--flows');
const port=flows ? 4176 : 4175;
const output = path.join(root,'.test-build',flows ? 'posting-flows' : 'posting-components');
http.createServer((req,res) => {
  const url = new URL(req.url,'http://localhost');
  const name = path.posix.basename(url.pathname);
  let file;
  if (url.pathname === '/') file = path.join(output,'index.html');
  else if (url.pathname === '/bundle.js') file = path.join(output,'bundle.js');
  else if (/^Satoshi-(Regular|Bold|Medium|Light|Black|Italic)\.otf$/.test(name)) file = path.join(root,'assets/images/fonts',name);
  else if (/^MaterialIcons.*\.ttf$/.test(name)) file = path.join(root,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf');
  if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type',file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html' : 'font/otf');
  fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('Static preview at http://127.0.0.1:'+port));
