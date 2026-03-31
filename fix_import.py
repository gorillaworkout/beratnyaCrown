import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Add a check to avoid crashing if division is missing from crown-athletes
content = re.sub(
    r'division: athlete\.division',
    'division: athlete.division || "Coed"',
    content
)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
