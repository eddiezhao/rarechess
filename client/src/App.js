import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import { useState } from "react";
import Game from './components/Game';
import HomePage from './components/HomePage';


function App(props) {
  const [side, setSide] = useState();

  return (
    <main>
      <div>
        <Routes>
          <Route exact path="/" element={<HomePage/>} />
          <Route exact path="/game" element={<Game/>} />
        </Routes>
      </div>
    </main>
  );
}

export default App;
