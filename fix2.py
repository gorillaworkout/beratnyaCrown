from pathlib import Path
p = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx')
text = p.read_text()
text = text.replace('  return (\n<main ', '  return (\n    <main ')
p.write_text(text)
