import React, { useEffect, useState } from 'react';
import './App.css';
import nginxPic from './images/nginxpic.png';

function App() {
  const [facts, setFacts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/facts')
      .then(res => res.json())
      .then(data => setFacts(data))
      .catch(err => console.error(err));
  }, []);

  const nextFact = () => {
    // This moves to the next index, or loops back to 0 if we at the end
    setCurrentIndex((prevIndex) => (prevIndex + 1) % facts.length);
  };

  // Guard clause: don't try to render if facts haven't loaded yet
  if (facts.length === 0) return <div className="container">Loading facts...</div>;

  return (
    <div className="container">
      <header>
        <h1>Nginx Fun Facts</h1>
        <img src={nginxPic} alt="Nginx Architecture" className="hero-img" />
      </header>

      <main className="slideshow-container">
        <div className="fact-card">
          <h2>{facts[currentIndex].title}</h2>
          <p>{facts[currentIndex].detail}</p>
        </div>

        <button className="next-btn" onClick={nextFact}>
          Next Fact 🚀
        </button>

        <p className="counter">
          Fact {currentIndex + 1} of {facts.length}
        </p>
      </main>
    </div>
  );
}

export default App;