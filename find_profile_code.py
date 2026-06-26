import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

app_path = 'js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function renderEmployeeProfile' in line:
        print(f"--- Line {i+1} ---")
        for j in range(i, min(len(lines), i+180)):
            print(f"{j+1}: {lines[j]}", end="")
        break
