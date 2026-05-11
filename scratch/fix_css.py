import sys

path = "/Users/quentin/Documents/ai/gemmaster/web/static/style.css"
with open(path, 'r') as f:
    lines = f.readlines()

new_bubble = [
    ".user-bubble {\n",
    "    background: linear-gradient(135deg, rgba(51, 114, 245, 0.25), rgba(139, 92, 246, 0.25));\n",
    "    backdrop-filter: blur(40px);\n",
    "    border: 1px solid rgba(51, 114, 245, 0.4);\n",
    "    padding: 1.2rem 2.5rem;\n",
    "    border-radius: 30px 30px 4px 30px;\n",
    "    font-family: var(--font-header);\n",
    "    font-size: 1.4rem;\n",
    "    font-weight: 700;\n",
    "    font-style: italic;\n",
    "    color: white;\n",
    "    text-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);\n",
    "    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(51, 114, 245, 0.1);\n",
    "    animation: intentPillIn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;\n",
    "    max-width: 85%;\n",
    "}\n",
    "\n",
    "@keyframes intentPillIn {\n",
    "    from { opacity: 0; transform: translateY(20px) scale(0.9); filter: blur(10px); }\n",
    "    to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }\n",
    "}\n"
]

# Find the start and end of .user-bubble block
start = -1
for i, line in enumerate(lines):
    if ".user-bubble {" in line:
        start = i
        break

if start != -1:
    end = start
    while end < len(lines) and "}" not in lines[end]:
        end += 1
    
    # Replace lines from start to end
    lines[start:end+1] = new_bubble
    
    with open(path, 'w') as f:
        f.writelines(lines)
    print("Successfully updated style.css")
else:
    print("Could not find .user-bubble")
