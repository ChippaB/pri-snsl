"""
Fix the double backslash issue in generated JavaScript file
"""


def fix_regex_escaping():
    with open("product_rules_master_truth.js", "r") as f:
        content = f.read()

    # Fix double backslashes - replace \\\\ with \\
    lines = content.split("\n")
    fixed_lines = []

    for line in lines:
        if "pattern: /^(\\\\" in line:
            # Replace \\\\ with \\
            line = line.replace("\\\\\\\\", "\\\\")
        fixed_lines.append(line)

    fixed_content = "\n".join(fixed_lines)

    with open("product_rules_master_truth.js", "w") as f:
        f.write(fixed_content)

    print("Fixed double backslash issue in product_rules_master_truth.js")


if __name__ == "__main__":
    fix_regex_escaping()
