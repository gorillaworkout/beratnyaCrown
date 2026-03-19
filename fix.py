from pathlib import Path
p = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx')
text = p.read_text()
text = text.replace('    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-4 text-slate-100 sm:p-6">\n      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24">', '<main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-4 text-slate-100 sm:p-6">\n      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">')

text = text.replace('      </div>\n    </div>\n  );\n}', '      </div>\n    </main>\n  );\n}')
p.write_text(text)
