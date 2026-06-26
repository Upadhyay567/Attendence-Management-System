import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = 'js/db.js'
with open(db_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'checkin' in line.lower() or 'checkout' in line.lower():
        print(f"Line {i+1}: {line.strip()}")
