import re

with open('web/static/app.js', 'r') as f:
    content = f.read()

# Replace processTriggers body
new_func = """        processTriggers(fullText) {
            if (window.StreamParser) {
                window.StreamParser.processTriggers(this, fullText);
            } else {
                console.warn("StreamParser not found. Please include stream_parser.js.");
            }
        },"""

# Regex to match processTriggers up to its end. 
# We look for processTriggers(fullText) { ... }
# We can find the start index, and then find the matching closing brace.
start_idx = content.find('processTriggers(fullText) {')

if start_idx != -1:
    brace_count = 0
    in_string = False
    in_regex = False
    escape = False
    end_idx = -1
    for i in range(start_idx + len('processTriggers(fullText) '), len(content)):
        char = content[i]
        if char == '{' and not in_string and not in_regex:
            brace_count += 1
        elif char == '}' and not in_string and not in_regex:
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
                
        # Basic string handling to avoid counting braces inside strings
        if char == '\\':
            escape = not escape
        else:
            if char in ["'", '"', '`'] and not in_regex:
                if not in_string:
                    in_string = char
                elif in_string == char and not escape:
                    in_string = False
            elif char == '/' and not in_string:
                if not in_regex:
                    in_regex = True
                elif not escape:
                    in_regex = False
            escape = False
            
    if end_idx != -1:
        # Check for trailing comma
        if end_idx < len(content) and content[end_idx] == ',':
            end_idx += 1
        
        new_content = content[:start_idx] + new_func + content[end_idx:]
        with open('web/static/app.js', 'w') as f:
            f.write(new_content)
        print("Successfully replaced processTriggers.")
    else:
        print("Failed to find end of processTriggers.")
else:
    print("Failed to find processTriggers.")
