const http = require('http');

http.get('http://localhost:5000/api/projects/public', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response data length:', data.length);
    try {
      const parsed = JSON.parse(data);
      console.log('Projects count:', parsed.data ? parsed.data.length : 'undefined');
      console.log('Projects:', JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.log('Raw data:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching API:', err);
});
