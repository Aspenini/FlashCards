#!/usr/bin/env python3
"""
Script to build bundled-sets.js from all JSON files in the bundled/ directory.
This generates a JavaScript file that can be directly included in the HTML.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BUNDLED_DIR = Path("bundled")
OUTPUT_FILE = Path("public/bundled-sets.js")
INDEX_HTML = Path("index.html")


def validate_set_structure(data: Dict[str, Any]) -> tuple[bool, List[str]]:
    """Validate that a set has the required structure."""
    errors = []
    
    if not isinstance(data, dict):
        errors.append("Set is not a JSON object")
        return False, errors
    
    # Check required fields
    if "name" not in data:
        errors.append("Missing 'name' field")
    elif not isinstance(data["name"], str):
        errors.append("'name' must be a string")
    
    if "cards" not in data:
        errors.append("Missing 'cards' field")
    elif not isinstance(data["cards"], list):
        errors.append("'cards' must be an array")
    else:
        # Validate card structure
        for i, card in enumerate(data["cards"]):
            if not isinstance(card, dict):
                errors.append(f"Card {i+1} is not an object")
                continue
            
            if "answer" not in card:
                errors.append(f"Card {i+1} missing 'answer' field")
            
            if "questions" not in card:
                errors.append(f"Card {i+1} missing 'questions' field")
            elif not isinstance(card["questions"], list):
                errors.append(f"Card {i+1} 'questions' must be an array")
            else:
                # Validate question structure
                for j, question in enumerate(card["questions"]):
                    if not isinstance(question, dict):
                        errors.append(f"Card {i+1}, Question {j+1} is not an object")
                    elif "text" not in question:
                        errors.append(f"Card {i+1}, Question {j+1} missing 'text' field")
                    elif not isinstance(question["text"], str):
                        errors.append(f"Card {i+1}, Question {j+1} 'text' must be a string")
    
    return len(errors) == 0, errors


def load_bundled_sets() -> List[Dict[str, Any]]:
    """Load and validate all bundled sets from the bundled directory."""
    if not BUNDLED_DIR.exists():
        print(f"❌ Bundled directory '{BUNDLED_DIR}' does not exist")
        return []
    
    json_files = list(BUNDLED_DIR.glob("*.json"))
    # Exclude index.json from the list
    json_files = [f for f in json_files if f.name != "index.json"]
    
    if not json_files:
        print(f"⚠️  No JSON files found in '{BUNDLED_DIR}' directory")
        return []
    
    print(f"📁 Found {len(json_files)} JSON file(s) in '{BUNDLED_DIR}' directory\n")
    
    valid_sets = []
    
    for json_file in sorted(json_files):
        print(f"📄 Processing: {json_file.name}")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            is_valid, errors = validate_set_structure(data)
            
            if is_valid:
                # Store the original filename
                data['bundledFileName'] = json_file.name
                valid_sets.append(data)
                card_count = len(data.get("cards", []))
                name = data.get("name", "Unknown")
                print(f"   ✅ Valid set: '{name}' ({card_count} cards)")
            else:
                print(f"   ❌ Invalid set structure:")
                for error in errors:
                    print(f"      - {error}")
        
        except json.JSONDecodeError as e:
            print(f"   ❌ Invalid JSON: {e}")
        except Exception as e:
            print(f"   ❌ Error reading file: {e}")
        
        print()
    
    return valid_sets


def update_index_html_cache_bust(content_hash: str) -> None:
    """Update the bundled-sets.js script tag in index.html with the new content hash."""
    import re
    if not INDEX_HTML.exists():
        print(f"⚠️  {INDEX_HTML} not found, skipping HTML update")
        return
    try:
        text = INDEX_HTML.read_text(encoding='utf-8')
        pattern = r'(src="bundled-sets\.js\?v=)[a-f0-9]+(")'
        replacement = rf'\g<1>{content_hash}\2'
        new_text, count = re.subn(pattern, replacement, text)
        if count == 0:
            print(f"   ⚠️  No bundled-sets.js script tag found in {INDEX_HTML}")
            return
        INDEX_HTML.write_text(new_text, encoding='utf-8')
        print(f"   ✅ Updated {INDEX_HTML} cache-bust: bundled-sets.js?v={content_hash}")
    except Exception as e:
        print(f"   ⚠️  Failed to update {INDEX_HTML}: {e}")


def generate_js_file(sets: List[Dict[str, Any]]) -> None:
    """Generate the bundled-sets.js file and update index.html cache-bust."""
    import hashlib
    from datetime import datetime
    
    if not sets:
        import hashlib
        print("⚠️  No valid sets to generate")
        content_hash = hashlib.md5(b"[]").hexdigest()[:8]
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("// Auto-generated by build_bundled_sets.py\n")
            f.write("// No bundled sets found\n")
            f.write("const bundledSetsData = [];\n")
        print(f"✅ Generated empty '{OUTPUT_FILE}'")
        update_index_html_cache_bust(content_hash)
        return
    
    try:
        content_str = json.dumps(sets, sort_keys=True, ensure_ascii=False)
        content_hash = hashlib.md5(content_str.encode('utf-8')).hexdigest()[:8]
        build_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("// Auto-generated by build_bundled_sets.py\n")
            f.write(f"// Build time: {build_time}\n")
            f.write(f"// Content hash: {content_hash}\n")
            f.write("// Do not edit this file manually - run build_bundled_sets.py to regenerate\n\n")
            f.write("const bundledSetsData = ")
            json.dump(sets, f, indent=2, ensure_ascii=False)
            f.write(";\n")
        
        print(f"✅ Generated '{OUTPUT_FILE}' with {len(sets)} set(s)")
        print(f"   Content hash: {content_hash}")
        update_index_html_cache_bust(content_hash)
    except Exception as e:
        print(f"❌ Failed to generate '{OUTPUT_FILE}': {e}")
        sys.exit(1)


def main():
    """Main function."""
    print("=" * 60)
    print("🔨 Building Bundled Sets JavaScript File")
    print("=" * 60)
    print()
    
    sets = load_bundled_sets()
    
    print("=" * 60)
    print("📊 Summary")
    print("=" * 60)
    print(f"Total valid sets: {len(sets)}")
    
    if sets:
        print("\nSets included:")
        for s in sets:
            name = s.get("name", "Unknown")
            card_count = len(s.get("cards", []))
            filename = s.get("bundledFileName", "Unknown")
            print(f"  - {filename}: {name} ({card_count} cards)")
    
    print()
    print("=" * 60)
    generate_js_file(sets)
    print("=" * 60)
    print("\n✅ Build complete!")


if __name__ == "__main__":
    main()

