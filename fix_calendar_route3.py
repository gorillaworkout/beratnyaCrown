import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'r') as f:
    content = f.read()

# Fix my previous script where I accidentally restored prevColorIdx to the definition but the call didn't match.
old_hash = """function getDeterministicShirtColor(dateStr: string): number {"""
new_hash = """function getDeterministicShirtColor(dateStr: string, _ignore?: number): number {"""
content = content.replace(old_hash, new_hash)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'w') as f:
    f.write(content)
