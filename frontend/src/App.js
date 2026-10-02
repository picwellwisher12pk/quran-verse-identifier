import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Statistics from './pages/Statistics';
import Marketing from './pages/Marketing';
import DebugLogsModal from './components/DebugLogsModal';
import BugReportModal from './components/BugReportModal';
import { Analytics } from '@vercel/analytics/react';
import './styles/index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
        <Header />
        <main className="flex-grow flex flex-col min-h-[calc(100vh-6.5rem)] min-h-[calc(100dvh-6.5rem)] sm:min-h-[calc(100vh-7rem)] sm:min-h-[calc(100dvh-7rem)]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/about" element={<About />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </main>
        <Footer />
        <DebugLogsModal />
        <BugReportModal />
        <Analytics />
      </div>
    </Router>
  );
}

export default App;
