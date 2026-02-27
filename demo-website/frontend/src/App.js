import React, { useEffect, useState } from 'react';
import './App.css';
import nginxPic from './images/nginxpic.png';

function App() {
  const [facts, setFacts] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/facts')
      .then(res => res.json())
      .then(data => setFacts(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Nginx Fun Facts</h1>
        <img src={nginxPic} alt="Nginx Architecture" className="hero-img" />
      </header>

      <main className="fact-list">
        {facts.map(f => (
          <section key={f.id} className="fact-item">
            <h2>{f.title}</h2>
            <p>{f.detail}</p>
          </section>
        ))}
      </main>
    </div>
  );
}

export default App;