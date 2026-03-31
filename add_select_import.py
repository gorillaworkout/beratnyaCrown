import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Check if we need to add the import
if "import {" not in content or "Select," not in content:
    import_statement = 'import {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from "@/components/ui/select";\n'
    
    # Add it after other UI imports
    content = re.sub(
        r'(import \{ Label \} from "@/components/ui/label";)',
        r'\1\n' + import_statement,
        content
    )
    
    with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
        f.write(content)
