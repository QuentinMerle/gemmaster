import re

with open('web/static/app.js', 'r') as f:
    content = f.read()

replacement = """processTriggers(fullText) {
            if (window.StreamParser) {
                window.StreamParser.processTriggers(this, fullText);
            } else {
                console.warn("StreamParser not found.");
            }
        },"""

# Use regex to find processTriggers down to // --- Mechanics ---
pattern = re.compile(r'processTriggers\(fullText\)\s*\{.*?(?=\n\s+// --- Mechanics ---)', re.DOTALL)

new_content = pattern.sub(replacement, content)

with open('web/static/app.js', 'w') as f:
    f.write(new_content)

print("Replaced successfully." if new_content != content else "No match found.")
