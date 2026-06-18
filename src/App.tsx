import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import PuzzleTest from "@/pages/PuzzleTest";
import { GameResult } from "@/components/layout/GameResult";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/result" element={<GameResult />} />
        <Route path="/test" element={<PuzzleTest />} />
      </Routes>
    </Router>
  );
}
