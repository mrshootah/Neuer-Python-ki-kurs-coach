/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Code2, 
  List, 
  Play, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Terminal,
  Lightbulb,
  ArrowRight,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

// --- Components ---

const CodingTask: React.FC<{ 
  title: string, 
  task: string, 
  initialCode: string, 
  solution: string,
  hint?: string 
}> = ({ title, task, initialCode, solution, hint }) => {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-100 overflow-hidden shadow-sm mb-8">
      <div className="bg-emerald-600 px-6 py-3 flex items-center gap-2 text-white">
        <Code2 size={18} />
        <h4 className="font-bold text-sm uppercase tracking-wider">{title}</h4>
      </div>
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Play size={20} />
          </div>
          <div>
            <p className="text-zinc-800 font-medium mb-2">{task}</p>
            {hint && (
              <div className="flex items-start gap-2 text-xs text-zinc-500 italic">
                <Lightbulb size={14} className="mt-0.5 text-amber-500" />
                <span>Tipp: {hint}</span>
              </div>
            )}
          </div>
        </div>

        <PythonRunner initialCode={initialCode} />

        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setShowSolution(!showSolution)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            {showSolution ? 'Lösung verbergen' : 'Musterlösung anzeigen'}
            <ChevronRight size={14} className={showSolution ? 'rotate-90' : ''} />
          </button>
        </div>

        <AnimatePresence>
          {showSolution && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Musterlösung:</p>
                <pre className="text-xs font-mono text-zinc-700 leading-relaxed">
                  {solution}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const PythonRunner: React.FC<{ initialCode: string }> = ({ initialCode }) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);

  useEffect(() => {
    async function initPyodide() {
      if ((window as any).loadPyodide) {
        const py = await (window as any).loadPyodide();
        setPyodide(py);
      }
    }
    initPyodide();
  }, []);

  const runCode = async () => {
    if (!pyodide) return;
    setIsRunning(true);
    setOutput([]);
    
    try {
      // Redirect stdout to a buffer
      pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
      `);
      
      await pyodide.runPythonAsync(code);
      
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      setOutput(stdout.split('\n').filter((line: string) => line !== ''));
    } catch (err: any) {
      setOutput([`Fehler: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-emerald-400" />
          <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Python Editor</span>
        </div>
        <button 
          onClick={runCode}
          disabled={isRunning || !pyodide}
          className="flex items-center gap-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded transition-colors"
        >
          {isRunning ? <RefreshCcw size={14} className="animate-spin" /> : <Play size={14} />}
          AUSFÜHREN
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 h-[300px]">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full p-4 bg-zinc-950 text-emerald-50 text-sm font-mono outline-none resize-none border-r border-zinc-800"
          spellCheck={false}
        />
        <div className="bg-black p-4 font-mono text-sm overflow-y-auto">
          <div className="text-zinc-500 mb-2 border-b border-zinc-800 pb-1 text-[10px] uppercase">Ausgabe:</div>
          {output.length === 0 ? (
            <span className="text-zinc-700 italic">Noch keine Ausgabe...</span>
          ) : (
            output.map((line, i) => (
              <div key={i} className={line.startsWith('Fehler:') ? 'text-red-400' : 'text-emerald-400'}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Quiz: React.FC<{ questions: QuizQuestion[] }> = ({ questions }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === questions[currentIdx].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const next = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelected(null);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 mb-2">Quiz beendet!</h3>
        <p className="text-zinc-600 mb-6">Du hast {score} von {questions.length} Fragen richtig beantwortet.</p>
        <button 
          onClick={() => { setCurrentIdx(0); setSelected(null); setShowResult(false); setScore(0); }}
          className="px-6 py-2 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition-colors"
        >
          Nochmal versuchen
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Frage {currentIdx + 1} von {questions.length}</span>
        <div className="h-1 w-24 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 mb-6">{q.question}</h3>
      <div className="space-y-3 mb-8">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
              selected === null 
                ? 'border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/30' 
                : i === q.correctAnswer 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                  : i === selected 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-zinc-100 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </div>
          </button>
        ))}
      </div>
      
      {selected !== null && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl mb-6 ${selected === q.correctAnswer ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
        >
          <div className="flex gap-2">
            <Lightbulb size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm">{q.explanation}</p>
          </div>
        </motion.div>
      )}

      {selected !== null && (
        <button 
          onClick={next}
          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          {currentIdx < questions.length - 1 ? 'Nächste Frage' : 'Ergebnis sehen'}
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('functions');

  const lessons: Lesson[] = [
    {
      id: 'functions',
      title: 'Funktionen (Vertiefung)',
      icon: <Code2 size={20} />,
      content: (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Vertiefung: Funktionen mit Logik</h2>
            <p className="text-zinc-600 mb-6">
              In Funktionen kannst du alles nutzen, was du bereits kennst: Variablen, Verzweigungen (<code className="text-red-500">if</code>) und Schleifen. 
              Hier ist eine neue Herausforderung für dich.
            </p>
            
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl mb-6">
              <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <Terminal size={18} />
                Beispiel: Der Temperatur-Check
              </h4>
              <p className="text-sm text-amber-800 mb-4">
                Hier siehst du, wie eine Funktion mit einer Verzweigung arbeitet.
              </p>
              <PythonRunner initialCode={`def check_wetter(grad):
    if grad > 25:
        return "Heiß"
    else:
        return "Angenehm"

print(check_wetter(30))`} />
            </div>

            <CodingTask 
              title="Deine Aufgabe: BMI-Rechner"
              task="Erstelle eine Funktion 'berechne_bmi(gewicht, groesse)', die den BMI berechnet (Formel: gewicht / (groesse * groesse)). Die Funktion soll den Wert zurückgeben."
              initialCode={`def berechne_bmi(gewicht, groesse):
    # Dein Code hier
    pass

# Teste deine Funktion
# print(berechne_bmi(80, 1.80))`}
              solution={`def berechne_bmi(gewicht, groesse):
    bmi = gewicht / (groesse * groesse)
    return bmi`}
              hint="Vergiss das 'return' nicht, um das Ergebnis zurückzugeben!"
            />
          </section>

          <section className="pt-8 border-t border-zinc-100">
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Alternative Quiz-Fragen</h3>
            <Quiz questions={[
              {
                id: 101,
                question: "Was passiert, wenn eine Funktion kein 'return' hat, aber man das Ergebnis einer Variable zuweist?",
                options: [
                  "Das Programm stürzt ab.",
                  "Die Variable erhält den Wert 'None'.",
                  "Die Variable behält ihren alten Wert.",
                  "Python fragt den Benutzer nach einem Wert."
                ],
                correctAnswer: 1,
                explanation: "In Python geben Funktionen, die kein explizites 'return' haben, automatisch den speziellen Wert 'None' zurück."
              },
              {
                id: 102,
                question: "Kann eine Funktion eine andere Funktion aufrufen?",
                options: [
                  "Nein, das ist verboten.",
                  "Ja, das ist ein wichtiges Konzept (Modularität).",
                  "Nur wenn beide Funktionen den gleichen Namen haben.",
                  "Nur innerhalb einer Schleife."
                ],
                correctAnswer: 1,
                explanation: "Ja! Man kann Funktionen ineinander verschachteln, um komplexe Probleme in kleine, lösbare Teile zu zerlegen."
              }
            ]} />
          </section>
        </div>
      )
    },
    {
      id: 'lists',
      title: 'Listen (Praxis)',
      icon: <List size={20} />,
      content: (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Praxis-Training: Listen manipulieren</h2>
            <p className="text-zinc-600 mb-6">
              Listen sind dynamisch. Wir können sie filtern, sortieren und verändern. 
              Hier sind Aufgaben, die über das einfache Erstellen hinausgehen.
            </p>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-6">
              <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                <Terminal size={18} />
                Beispiel: Der Noten-Filter
              </h4>
              <p className="text-sm text-emerald-800 mb-4">
                Wir haben eine Liste mit Noten. Erstelle eine neue Liste, die nur die "guten" Noten (1 und 2) enthält.
              </p>
              <PythonRunner initialCode={`noten = [1, 4, 2, 5, 3, 1, 2, 6]
gute_noten = []

for n in noten:
    if n <= 2:
        gute_noten.append(n)

print("Nur gute Noten:", gute_noten)`} />
            </div>

            <CodingTask 
              title="Deine Aufgabe: Durchschnittsberechnung"
              task="Schreibe ein Programm, das den Durchschnitt der Zahlen in der Liste 'werte' berechnet. Nutze eine Schleife, um die Summe zu bilden."
              initialCode={`werte = [10, 20, 30, 40, 50]
summe = 0

# Nutze eine for-Schleife
# ...

durchschnitt = summe / len(werte)
print("Durchschnitt:", durchschnitt)`
              }
              solution={`summe = 0
for w in werte:
    summe += w
durchschnitt = summe / len(werte)`}
              hint="Du musst jedes Element der Liste zur Variable 'summe' addieren."
            />
          </section>

          <section className="pt-8 border-t border-zinc-100">
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Listen-Quiz (Neu)</h3>
            <Quiz questions={[
              {
                id: 201,
                question: "Was passiert bei 'liste.append(5)'?",
                options: [
                  "Die 5 wird am Anfang der Liste eingefügt.",
                  "Die 5 wird am Ende der Liste hinzugefügt.",
                  "Alle Elemente der Liste werden mit 5 multipliziert.",
                  "Die Liste wird gelöscht und nur die 5 bleibt übrig."
                ],
                correctAnswer: 1,
                explanation: "append() fügt ein neues Element immer ganz hinten an die bestehende Liste an."
              },
              {
                id: 202,
                question: "Wie greifst du auf das LETZTE Element einer Liste zu, ohne die Länge zu kennen?",
                options: ["liste[last]", "liste[0]", "liste[-1]", "liste[end]"],
                correctAnswer: 2,
                explanation: "In Python kannst du negative Indizes nutzen. -1 ist immer das letzte Element, -2 das vorletzte, usw."
              },
              {
                id: 203,
                question: "Was ist das Ergebnis von [1, 2] * 3?",
                options: ["[3, 6]", "[1, 2, 1, 2, 1, 2]", "[1, 2, 3]", "Fehlermeldung"],
                correctAnswer: 1,
                explanation: "Der Multiplikations-Operator bei Listen bewirkt eine Wiederholung der Liste."
              }
            ]} />
          </section>
        </div>
      )
    },
    {
      id: 'algorithms',
      title: 'Bubble Sort',
      icon: <RefreshCcw size={20} />,
      content: (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Algorithmen: Bubble Sort</h2>
            <p className="text-zinc-600 mb-6">
              Bubble Sort ist ein einfacher Sortieralgorithmus. Er vergleicht benachbarte Elemente und vertauscht sie, wenn sie in der falschen Reihenfolge sind. 
            </p>

            <CodingTask 
              title="Deine Aufgabe: Absteigend sortieren"
              task="Der aktuelle Bubble Sort sortiert aufsteigend (klein nach groß). Ändere den Code so ab, dass er absteigend sortiert (groß nach klein)."
              initialCode={`liste = [5, 2, 9, 1, 5, 6]
n = len(liste)

for i in range(n-1):
    for j in range(n-i-1):
        # Ändere hier das Vergleichszeichen!
        if liste[j] > liste[j+1]:
            liste[j], liste[j+1] = liste[j+1], liste[j]

print("Sortiert:", liste)`}
              solution={`if liste[j] < liste[j+1]:
    liste[j], liste[j+1] = liste[j+1], liste[j]`}
              hint="Schau dir das '>' Zeichen genau an. Was passiert, wenn du es umdrehst?"
            />
          </section>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
              <Code2 size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Python Lern-Coach</h1>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Interaktives Training</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <BookOpen size={16} />
              <span>Themen: Listen & Funktionen</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation */}
          <nav className="lg:col-span-3 space-y-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 mb-4">Lernpfad</p>
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => setActiveTab(lesson.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  activeTab === lesson.id 
                    ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200 translate-x-1' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-100'
                }`}
              >
                {lesson.icon}
                <span className="font-bold text-sm">{lesson.title}</span>
                {activeTab === lesson.id && <ArrowRight size={14} className="ml-auto" />}
              </button>
            ))}
            
            <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">Pro-Tipp</h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Nutze den Editor unten in jedem Kapitel, um eigenen Code auszuprobieren. Experimentieren ist der beste Weg zum Lernen!
              </p>
            </div>
          </nav>

          {/* Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {lessons.find(l => l.id === activeTab)?.content}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-zinc-200 mt-12 text-center">
        <p className="text-zinc-400 text-sm">
          Erstellt für den Python-Unterricht • Themen: Funktionen & Listen
        </p>
      </footer>
    </div>
  );
}
