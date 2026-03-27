"use client";

import { useState } from "react";
import { Check, Flame, Trophy, Shield, Dumbbell, Activity, Calendar } from "lucide-react";

type WorkoutLevel = {
  id: number;
  title: string;
  description: string;
  tasks: { id: string; name: string; rep: string; done: boolean }[];
  reward: string;
};

const DAILY_QUESTS: WorkoutLevel[] = [
  {
    id: 1,
    title: "E-Rank Hunter (Rookie)",
    description: "Persiapan fisik dasar untuk bertahan hidup sebagai cheer.",
    reward: "10 EXP | Stamina +5",
    tasks: [
      { id: "q1-1", name: "Jumping Jacks", rep: "50x", done: false },
      { id: "q1-2", name: "Push Ups", rep: "10x", done: false },
      { id: "q1-3", name: "Squats", rep: "20x", done: false },
      { id: "q1-4", name: "Plank", rep: "30s", done: false },
    ],
  },
  {
    id: 2,
    title: "C-Rank Hunter (Stunter/Flyer)",
    description: "Meningkatkan core dan explosiveness.",
    reward: "50 EXP | Strength +10",
    tasks: [
      { id: "q2-1", name: "Burpees", rep: "20x", done: false },
      { id: "q2-2", name: "V-Ups / Core", rep: "30x", done: false },
      { id: "q2-3", name: "Jump Squats", rep: "25x", done: false },
      { id: "q2-4", name: "Hollow Body Hold", rep: "45s", done: false },
    ],
  },
  {
    id: 3,
    title: "S-Rank Hunter (National Level)",
    description: "Latihan intensitas tinggi untuk elite athlete.",
    reward: "200 EXP | Agility +20",
    tasks: [
      { id: "q3-1", name: "Handstand Push Ups", rep: "15x", done: false },
      { id: "q3-2", name: "Pistol Squats", rep: "20x / leg", done: false },
      { id: "q3-3", name: "Tuck Jumps", rep: "50x", done: false },
      { id: "q3-4", name: "L-Sit Hold", rep: "30s", done: false },
    ],
  },
];

export default function WorkoutSoloLeveling() {
  const [quests, setQuests] = useState<WorkoutLevel[]>(DAILY_QUESTS);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);

  const toggleTask = (levelId: number, taskId: string) => {
    setQuests((prev) =>
      prev.map((l) => {
        if (l.id !== levelId) return l;
        return {
          ...l,
          tasks: l.tasks.map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t
          ),
        };
      })
    );
    
    // Give some exp for clicking
    setExp(prev => prev + 5);
  };

  const calculateProgress = (tasks: any[]) => {
    const done = tasks.filter((t) => t.done).length;
    return Math.round((done / tasks.length) * 100);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      
      {/* Header Panel - Solo Leveling System UI vibe */}
      <div className="max-w-4xl mx-auto mb-8 relative">
        <div className="absolute inset-0 bg-blue-600/10 blur-xl rounded-full"></div>
        <div className="relative border border-blue-500/30 bg-black/60 backdrop-blur-md p-6 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono tracking-widest mb-3">
                <Activity className="w-3 h-3" />
                SYSTEM ALERT
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 uppercase tracking-tight">
                Daily Quest: <span className="text-white">Arise</span>
              </h1>
              <p className="text-slate-400 mt-1">Selesaikan misi harian untuk meningkatkan status fisik Anda.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase font-bold">Level</p>
                <p className="text-2xl font-black text-blue-400">{level}</p>
              </div>
              <div className="w-px h-10 bg-slate-800"></div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">EXP</span>
                  <span className="text-blue-400 font-mono">{exp} / 100</span>
                </div>
                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min((exp / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest List */}
      <div className="max-w-4xl mx-auto space-y-6">
        {quests.map((quest) => {
          const progress = calculateProgress(quest.tasks);
          const isComplete = progress === 100;
          
          return (
            <div 
              key={quest.id} 
              className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                isComplete 
                  ? "border border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] bg-gradient-to-br from-blue-900/20 to-black/80" 
                  : "border border-slate-800 bg-black/40 hover:border-slate-700"
              }`}
            >
              {/* Quest Header */}
              <div className="p-5 border-b border-slate-800/50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isComplete ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400"}`}>
                      {quest.id === 1 ? <Dumbbell className="w-5 h-5" /> : quest.id === 2 ? <Shield className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className={`font-bold text-lg uppercase tracking-wide ${isComplete ? "text-blue-300" : "text-white"}`}>
                        {quest.title}
                      </h2>
                      <p className="text-sm text-slate-400">{quest.description}</p>
                    </div>
                  </div>
                  {isComplete && (
                    <div className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                      <Trophy className="w-3 h-3" />
                      CLEARED
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isComplete ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "bg-slate-500"}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-mono text-slate-400 w-8 text-right">{progress}%</span>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quest.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(quest.id, task.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        task.done
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
                          : "bg-slate-900/50 border-transparent hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-md border ${
                          task.done ? "bg-blue-500 border-blue-400 text-black" : "border-slate-600"
                        }`}>
                          {task.done && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                        <span className={`font-medium ${task.done ? "line-through opacity-70" : ""}`}>
                          {task.name}
                        </span>
                      </div>
                      <span className={`font-mono text-sm ${task.done ? "text-blue-400/70" : "text-slate-500"}`}>
                        {task.rep}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward Footer */}
              <div className={`p-3 text-center text-xs font-mono tracking-widest ${
                isComplete ? "bg-blue-500/10 text-blue-300 border-t border-blue-500/20" : "bg-slate-900/80 text-slate-500 border-t border-slate-800"
              }`}>
                REWARD: {quest.reward}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer warning */}
      <div className="max-w-4xl mx-auto mt-12 text-center text-slate-600 text-xs">
        <p>Peringatan Sistem: Jika Daily Quest tidak diselesaikan, Anda akan dikirim ke Penalty Zone (10 km Lari).</p>
      </div>

    </div>
  );
}