const https = require('https');

function fetchSvg(url, name) {
  https.get(url, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
      console.log(`=== ${name} ===`);
      const match = data.match(/d="([^"]+)"/);
      if (match) {
        console.log(match[1]);
      } else {
        console.log('No path found. Raw:', data);
      }
    });
  });
}

fetchSvg('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/express.svg', 'Express.js');
fetchSvg('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/netlify.svg', 'Netlify');
