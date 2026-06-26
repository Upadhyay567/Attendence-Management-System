import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = 'js/db.js'
with open(db_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(435, min(len(lines), 515)):
    print(f"{idx+1}: {lines[idx]}", end="")
