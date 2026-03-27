"use client";

import { useState, useEffect } from "react";
import { Check, Flame, Trophy, Shield, Dumbbell, Activity, ChevronRight, Zap } from "lucide-react";

type Task = { id: string; name: string; rep: string; done: boolean; exp: number };
type WorkoutLevel = {
  id: number;
  rank: string;
  title: string;
  description: string;
  tasks: Task[];
  reward: string;
};

const INITIAL_QUESTS: WorkoutLevel[] = [
  {
    id: 1,
    rank: "E-Rank",
    title: "Rookie Conditioning",
    description: "Persiapan fisik dasar untuk bertahan hidup sebagai cheer.",
    reward: "Stamina +5",
    tasks: [
      { id: "q1-1", name: "Jumping Jacks", rep: "50x", done: false, exp: 10 },
      { id: "q1-2", name: "Push Ups", rep: "10x", done: false, exp: 15 },
      { id: "q1-3", name: "Squats", rep: "20x", done: false, exp: 10 },
      { id: "q1-4", name: "Plank", rep: "30s", done: false, exp: 15 },
    ],
  },
  {
    id: 2,
    rank: "C-Rank",
    title: "Core & Explosiveness",
    description: "Meningkatkan core untuk balance dan power.",
    reward: "Strength +10",
    tasks: [
      { id: "q2-1", name: "Burpees", rep: "20x", done: false, exp: 20 },
      { id: "q2-2", name: "V-Ups / Core", rep: "30x", done: false, exp: 20 },
      { id: "q2-3", name: "Jump Squats", rep: "25x", done: false, exp: 15 },
      { id: "q2-4", name: "Hollow Body Hold", rep: "45s", done: false, exp: 20 },
    ],
  },
  {
    id: 3,
    rank: "S-Rank",
    title: "National Elite",
    description: "Latihan intensitas tinggi untuk elite athlete.",
    reward: "Agility +20",
    tasks: [
      { id: "q3-1", name: "Handstand Push Ups", rep: "15x", done: false, exp: 30 },
      { id: "q3-2", name: "Pistol Squats", rep: "20x / leg", done: false, exp: 30 },
      { id: "q3-3", name: "Tuck Jumps", rep: "50x", done: false, exp: 25 },
      { id: "q3-4", name: "L-Sit Hold", rep: "30s", done: false, exp: 25 },
    ],
  },
];

export default function WorkoutSoloLeveling() {
  const [quests, setQuests] = useState<WorkoutLevel[]>(INITIAL_QUESTS);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [maxExp, setMaxExp] = useState(100);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<{show: boolean, msg: string}>({ show: false, msg: "" });

  const [showConfirm, setShowConfirm] = useState<{show: boolean, type: 'daily' | 'all' | null, title: string, desc: string}>({show: false, type: null, title: "", desc: ""});

  // Load state from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("solo_leveling_workout");
    if (savedData) {
      const { quests: savedQuests, level: savedLevel, exp: savedExp, maxExp: savedMaxExp } = JSON.parse(savedData);
      setQuests(savedQuests);
      setLevel(savedLevel);
      setExp(savedExp);
      setMaxExp(savedMaxExp || 100);
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("solo_leveling_workout", JSON.stringify({ quests, level, exp, maxExp }));
    }
  }, [quests, level, exp, maxExp, mounted]);

  const toggleTask = (questId: number, taskId: string) => {
    setQuests((prev) => {
      let taskExp = 0;
      let isCompleting = false;

      const newQuests = prev.map((q) => {
        if (q.id !== questId) return q;
        return {
          ...q,
          tasks: q.tasks.map((t) => {
            if (t.id === taskId) {
              taskExp = t.exp;
              isCompleting = !t.done;
              return { ...t, done: !t.done };
            }
            return t;
          }),
        };
      });

      // Handle EXP and Leveling up
      if (isCompleting) {
        let newExp = exp + taskExp;
        if (newExp >= maxExp) {
          // LEVEL UP!
          setLevel((l) => l + 1);
          setExp(newExp - maxExp);
          setMaxExp(Math.floor(maxExp * 1.5)); // Next level needs more EXP
          triggerLevelUp();
        } else {
          setExp(newExp);
          showToast(`Quest Completed! +${taskExp} EXP`);
        }
      } else {
        // Unchecking task
        let newExp = exp - taskExp;
        if (newExp < 0 && level > 1) {
          // Level down (edge case)
          setLevel((l) => l - 1);
          const prevMax = Math.floor(maxExp / 1.5);
          setMaxExp(prevMax);
          setExp(prevMax + newExp);
        } else {
          setExp(Math.max(0, newExp));
        }
      }

      return newQuests;
    });
  };

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3000);
  };

  const triggerLevelUp = () => {
    setLevelUpAnim(true);
    setTimeout(() => setLevelUpAnim(false), 3000);
  };

  const resetProgress = () => {
    setShowConfirm({
      show: true, 
      type: 'all', 
      title: "RESET SYSTEM?", 
      desc: "Perhatian: Semua data Level, EXP, dan Rank akan dihapus secara permanen. Anda akan kembali ke Level 1. Lanjutkan?"
    });
  };

  const resetDailyTasks = () => {
    setShowConfirm({
      show: true, 
      type: 'daily', 
      title: "RESET DAILY QUESTS?", 
      desc: "Level dan total EXP tetap aman. Anda hanya akan mereset task agar bisa digrinding ulang untuk hari ini."
    });
  };

  const executeConfirm = () => {
    if (showConfirm.type === 'all') {
      setQuests(INITIAL_QUESTS);
      setLevel(1);
      setExp(0);
      setMaxExp(100);
      showToast("System Reset to Default.");
    } else if (showConfirm.type === 'daily') {
      setQuests((prev) => 
        prev.map(q => ({
          ...q,
          tasks: q.tasks.map(t => ({ ...t, done: false }))
        }))
      );
      showToast("Daily Quests Reset for New EXP Grinding.");
    }
    setShowConfirm({show: false, type: null, title: "", desc: ""});
  };

  const calculateProgress = (tasks: Task[]) => {
    const done = tasks.filter((t) => t.done).length;
    return Math.round((done / tasks.length) * 100);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* 3D Toast Notification System */}
      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-10 fade-in duration-300">
          <div className="relative group perspective-1000">
            {/* 3D Depth layers */}
            <div className="absolute inset-0 bg-cyan-500/30 blur-md rounded-xl transform translate-y-2 scale-95 opacity-50"></div>
            <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-xl"></div>
            
            {/* Main Toast Body */}
            <div className="relative flex items-center gap-3 bg-black/80 backdrop-blur-xl border-t border-l border-cyan-400/50 border-r border-b border-cyan-900/50 px-5 py-3 rounded-xl shadow-[0_10px_30px_rgba(6,182,212,0.3)] transform-gpu transition-transform hover:scale-105">
              <div className="w-1 h-full absolute left-0 top-0 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-l-xl"></div>
              
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
              
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-cyan-500 tracking-widest uppercase font-bold">System Notice</span>
                <span className="text-sm text-white font-medium tracking-wide drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                  {toast.msg}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Hologram Modal Confirmation */}
      {showConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm({show: false, type: null, title: "", desc: ""})}></div>
          <div className="relative z-10 w-full max-w-md perspective-1000 animate-in zoom-in-95 fade-in duration-300">
            
            <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-2xl transform scale-110"></div>
            
            <div className="relative bg-[#0a0a0a]/90 backdrop-blur-xl border border-red-500/40 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)]">
              {/* Scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              
              <div className="p-6 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-red-400 uppercase tracking-wider drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                      {showConfirm.title}
                    </h3>
                  </div>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {showConfirm.desc}
                </p>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => setShowConfirm({show: false, type: null, title: "", desc: ""})}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white transition-colors text-slate-300 font-bold tracking-widest text-sm uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeConfirm}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all font-bold tracking-widest text-sm uppercase"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Overlay Animation */}
      {levelUpAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center transform animate-in zoom-in-50 spin-in-12 duration-500">
            <div className="text-yellow-400 mb-4 animate-bounce">
              <Zap className="w-24 h-24 mx-auto drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]" />
            </div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
              LEVEL UP!
            </h1>
            <p className="text-2xl mt-2 text-white font-mono tracking-widest uppercase">
              You are now Level {level}
            </p>
          </div>
        </div>
      )}

      {/* SYSTEM HEADER HUD */}
      <div className="max-w-4xl mx-auto mb-10 mt-4 relative z-10">
        <div className="relative border border-cyan-500/20 bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-widest mb-4">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                SYSTEM ACTIVE
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                Daily Quest <span className="text-cyan-500">Arise</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                "Sistem telah memilihmu. Selesaikan misi harian atau hadapi Penalty Zone."
              </p>
            </div>
            
            {/* Player Stats HUD */}
            <div className="flex items-center gap-6 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 w-full md:w-auto shadow-inner relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full"></div>
              
              <div className="text-center relative z-10 min-w-[80px]">
                <p className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold mb-1">Player Lvl</p>
                <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{level}</p>
              </div>
              
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-slate-700 to-transparent relative z-10"></div>
              
              <div className="relative z-10 flex-1 md:w-48">
                <div className="flex justify-between text-xs mb-2 font-mono">
                  <span className="text-slate-400 tracking-wider">EXP</span>
                  <span className="text-cyan-400 font-bold">{Math.floor(exp)} <span className="text-slate-600">/ {maxExp}</span></span>
                </div>
                <div className="h-3 bg-black rounded-full overflow-hidden border border-slate-800 relative">
                  <div className="absolute inset-0 bg-slate-900"></div>
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-700 ease-out"
                    style={{ width: `${Math.min((exp / maxExp) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest Cards */}
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {quests.map((quest) => {
          const progress = calculateProgress(quest.tasks);
          const isComplete = progress === 100;
          
          return (
            <div 
              key={quest.id} 
              className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
                isComplete 
                  ? "border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-slate-900/40" 
                  : "border border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40"
              } backdrop-blur-md`}
            >
              {isComplete && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-transparent pointer-events-none"></div>
              )}

              {/* Quest Header */}
              <div className="p-6 md:p-8 border-b border-slate-800/50 relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      isComplete 
                        ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {quest.id === 1 ? <Dumbbell className="w-6 h-6" /> : quest.id === 2 ? <Shield className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          isComplete ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-300"
                        }`}>{quest.rank}</span>
                        <h2 className={`font-black text-xl md:text-2xl tracking-tight ${isComplete ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : "text-slate-200"}`}>
                          {quest.title}
                        </h2>
                      </div>
                      <p className="text-sm text-slate-400">{quest.description}</p>
                    </div>
                  </div>
                  
                  {isComplete && (
                    <div className="flex items-center gap-2 text-sm font-black text-cyan-300 bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/30 animate-in fade-in zoom-in duration-300">
                      <Trophy className="w-4 h-4" />
                      CLEARED
                    </div>
                  )}
                </div>
                
                {/* Progress Bar for the rank */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-black rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-700 ease-out ${
                        isComplete ? "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]" : "bg-slate-600"
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-mono font-bold w-10 text-right ${isComplete ? "text-cyan-400" : "text-slate-500"}`}>
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-6 md:p-8 bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {quest.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(quest.id, task.id)}
                      className={`group relative flex items-center p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                        task.done
                          ? "bg-cyan-500/5 border-cyan-500/30"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80"
                      }`}
                    >
                      {/* Active Task Background Glow */}
                      {task.done && (
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-50"></div>
                      )}

                      <div className="relative z-10 flex items-center gap-4 w-full">
                        {/* Checkbox */}
                        <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-300 ${
                          task.done 
                            ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                            : "border-slate-600 text-transparent group-hover:border-slate-400"
                        }`}>
                          <Check className={`w-4 h-4 stroke-[3] transition-transform duration-300 ${task.done ? "scale-100" : "scale-0"}`} />
                        </div>
                        
                        {/* Task Name & Exp */}
                        <div className="flex-1 text-left">
                          <p className={`font-semibold text-sm transition-all duration-300 ${
                            task.done ? "text-cyan-100" : "text-slate-300 group-hover:text-white"
                          }`}>
                            {task.name}
                          </p>
                          <p className={`text-[10px] font-mono mt-0.5 ${task.done ? "text-cyan-500/70" : "text-slate-500"}`}>
                            +{task.exp} EXP
                          </p>
                        </div>

                        {/* Reps */}
                        <div className={`flex items-center gap-1 font-mono text-sm font-bold bg-black/40 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                          task.done ? "border-cyan-500/20 text-cyan-400" : "border-slate-800 text-slate-400"
                        }`}>
                          {task.rep}
                        </div>
                      </div>

                      {/* Strikethrough line animation */}
                      <div className={`absolute top-1/2 left-14 h-[1.5px] bg-cyan-500/50 transition-all duration-500 ease-out z-20 pointer-events-none ${
                        task.done ? "w-[40%] opacity-100" : "w-0 opacity-0"
                      }`}></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward Footer */}
              <div className={`p-4 flex items-center justify-between text-xs font-mono font-bold tracking-widest ${
                isComplete 
                  ? "bg-cyan-900/30 text-cyan-300 border-t border-cyan-500/20" 
                  : "bg-black/40 text-slate-500 border-t border-slate-800"
              }`}>
                <span className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  REWARD
                </span>
                <span className={isComplete ? "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" : ""}>
                  {quest.reward}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Footer & Reset */}
      <div className="max-w-4xl mx-auto mt-12 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600 text-xs font-mono">
        <p className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Penalty Zone: 10 KM RUN if daily quest is incomplete.
        </p>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={resetDailyTasks}
            className="px-4 py-2 rounded-lg border border-cyan-500/20 text-cyan-500/80 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.1)]"
          >
            RESET DAILY TASKS
          </button>
          
          <button 
            onClick={resetProgress}
            className="px-4 py-2 rounded-lg border border-red-500/20 text-red-500/60 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
          >
            RESET ALL
          </button>
        </div>
      </div>

    </div>
  );
}