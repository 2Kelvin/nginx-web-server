import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [facts, setFacts] = useState([]);
  const [formData, setFormData] = useState({ title: '', detail: '' });
  const [editingId, setEditingId] = useState(null);
  
  const fetchFacts = () => {
    // fetch('http://localhost:5000/api/facts') // use this for normal development
    fetch('/api/facts') // use this for nginx to reverse proxy
      .then(res => res.json())
      .then(data => setFacts(data));
  };

  useEffect(() => { fetchFacts(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/facts/${editingId}` : '/api/facts';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then(() => {
      setFormData({ title: '', detail: '' });
      setEditingId(null);
      fetchFacts();
    });
  };

  const deleteFact = (id) => {
    fetch(`/api/facts/${id}`, { method: 'DELETE' }).then(() => fetchFacts());
  };

  const startEdit = (fact) => {
    setEditingId(fact.id);
    setFormData({ title: fact.title, detail: fact.detail });
  };

  return (
    <div className="container">
      <h1>Nginx Fact Manager</h1>
      
      <form onSubmit={handleSubmit}>
        <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        <textarea placeholder="Detail" value={formData.detail} onChange={e => setFormData({...formData, detail: e.target.value})} required />
        <button type="submit">{editingId ? 'Update' : 'Add'} Fact</button>
      </form>

      <div className="fact-list">
        {facts.map(fact => (
          <div key={fact.id} className="fact-card">
            <h3>{fact.title}</h3>
            <p>{fact.detail}</p>
            <button onClick={() => startEdit(fact)}>Edit</button>
            <button onClick={() => deleteFact(fact.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;