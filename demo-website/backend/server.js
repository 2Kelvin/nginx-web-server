const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

const nginxFacts = [
    { id: 1, title: "The C10k Problem", detail: "NGINX was born to handle 10,000+ concurrent connections, something older servers struggled with." },
    { id: 2, title: "The Swiss Army Knife", detail: "It's not just a web server; it's a load balancer, content cache, and reverse proxy." },
    { id: 3, title: "High Performance", detail: "Because it's event-driven and asynchronous, it uses very little RAM even under heavy load." },
    { id: 4, title: "SSL Termination", detail: "NGINX can handle the heavy lifting of encrypting/decrypting HTTPS traffic for your apps." }
];

app.get('/api/facts', (req, res) => {
    res.json(nginxFacts);
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));