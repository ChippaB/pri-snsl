"""Fix broken regex patterns in app.js"""
import re

# Read app.js
with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the PRODUCT_SERIAL_RULES section
# Match patterns like: pattern: /^(\PREFIX\d{N}).*$/,
# where PREFIX starts with a backslash followed by a digit or letter

# Count broken patterns
broken_patterns = re.findall(r'pattern: /\^\(\\[0-9A-Z]', content)
print(f'Found {len(broken_patterns)} broken regex patterns in app.js')

# Replace patterns with backslash-digit (like \7, \1, etc)
content = re.sub(r'pattern: /\^\(\\([0-9]+[A-Z0-9]*\\d\{\d+\})\)\.\*\$/,', r'pattern: /^(\1).*$/,', content)

# Write back
with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed regex patterns in app.js')

# Verify
with open('app.js', 'r', encoding='utf-8') as f:
    fixed_content = f.read()
remaining = re.findall(r'pattern: /\^\(\\[0-9]', fixed_content)
print(f'Remaining broken patterns with \\digit: {len(remaining)}')
