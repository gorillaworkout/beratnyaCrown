from pathlib import Path

p = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/page.tsx')
text = p.read_text()

old_burpee = '''                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=auBLPXO8Fww" target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">Burpee <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">20</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>'''

new_burpee = '''                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=auBLPXO8Fww" target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">Burpee <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">10</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>'''

old_plank = '''                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=pSHjTRCQxIw" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Plank <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">1 Min</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>'''

new_plank = '''                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=pSHjTRCQxIw" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Plank <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">30 Sec</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>'''

text = text.replace(old_burpee, new_burpee)
text = text.replace(old_plank, new_plank)

p.write_text(text)
print("Updated physical exercises successfully")
