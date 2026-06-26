import subprocess
import json
import os

with open('package.json', 'w') as f:
    json.dump({'type': 'module'}, f)

try:
    res = subprocess.run(['node', '--check', 'js/app.js', 'js/db.js'], capture_output=True, text=True)
    if res.returncode == 0:
        print("Syntax check passed successfully!")
    else:
        print("Syntax check failed:")
        print(res.stderr)
        print(res.stdout)
finally:
    if os.path.exists('package.json'):
        os.remove('package.json')
