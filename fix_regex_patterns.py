"""Fix broken regex patterns in product_rules_master_truth.js"""
import re

# Read the file
with open('product_rules_master_truth.js', 'r') as f:
    content = f.read()

# Count how many broken patterns we find
broken_count = len(re.findall(r'pattern: /\^\(\\\\', content))
print(f'Found {broken_count} broken regex patterns')

# Fix the patterns:
# 1. Remove double $$ before closing /
content = content.replace(').*$$/\$,', ').*$/,')

# 2. Remove double backslashes (\\PREFIX -> PREFIX)
content = re.sub(r'pattern: /\^\(\\\\', r'pattern: /^(', content)

# Write back
with open('product_rules_master_truth.js', 'w') as f:
    f.write(content)

print('Fixed all regex patterns in product_rules_master_truth.js')

# Verify fix
with open('product_rules_master_truth.js', 'r') as f:
    fixed_content = f.read()

remaining_broken = len(re.findall(r'pattern: /\^\(\\\\', fixed_content))
print(f'Remaining broken patterns: {remaining_broken}')
