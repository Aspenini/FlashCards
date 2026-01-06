#!/usr/bin/env python3
"""
Script to detect and validate bundled flashcard sets in the bundled/ directory.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BUNDLED_DIR = Path("bundled")
INDEX_FILE = BUNDLED_DIR / "index.json"


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


def detect_bundled_sets() -> List[Dict[str, Any]]:
    """Detect and validate all bundled sets."""
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
    
    detected_sets = []
    
    for json_file in sorted(json_files):
        print(f"📄 Analyzing: {json_file.name}")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            is_valid, errors = validate_set_structure(data)
            
            if is_valid:
                card_count = len(data.get("cards", []))
                name = data.get("name", "Unknown")
                exported_at = data.get("exportedAt", "Not specified")
                
                print(f"   ✅ Valid set: '{name}'")
                print(f"      Cards: {card_count}")
                print(f"      Exported: {exported_at}")
                
                detected_sets.append({
                    "file": json_file.name,
                    "name": name,
                    "card_count": card_count,
                    "exported_at": exported_at,
                    "valid": True
                })
            else:
                print(f"   ❌ Invalid set structure:")
                for error in errors:
                    print(f"      - {error}")
                
                detected_sets.append({
                    "file": json_file.name,
                    "name": data.get("name", "Unknown"),
                    "valid": False,
                    "errors": errors
                })
        
        except json.JSONDecodeError as e:
            print(f"   ❌ Invalid JSON: {e}")
            detected_sets.append({
                "file": json_file.name,
                "name": "Unknown",
                "valid": False,
                "errors": [f"JSON decode error: {e}"]
            })
        except Exception as e:
            print(f"   ❌ Error reading file: {e}")
            detected_sets.append({
                "file": json_file.name,
                "name": "Unknown",
                "valid": False,
                "errors": [str(e)]
            })
        
        print()
    
    return detected_sets


def update_index_file(detected_sets: List[Dict[str, Any]]) -> None:
    """Update or create the index.json file with valid sets."""
    valid_files = [s["file"] for s in detected_sets if s.get("valid", False)]
    
    if not valid_files:
        print("⚠️  No valid sets to add to index.json")
        return
    
    index_data = {"files": valid_files}
    
    try:
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, indent=2)
        print(f"✅ Updated '{INDEX_FILE}' with {len(valid_files)} set(s)")
    except Exception as e:
        print(f"❌ Failed to update '{INDEX_FILE}': {e}")


def main():
    """Main function."""
    print("=" * 60)
    print("🔍 Bundled Flashcard Sets Detector")
    print("=" * 60)
    print()
    
    detected_sets = detect_bundled_sets()
    
    if not detected_sets:
        return
    
    # Summary
    print("=" * 60)
    print("📊 Summary")
    print("=" * 60)
    
    valid_count = sum(1 for s in detected_sets if s.get("valid", False))
    invalid_count = len(detected_sets) - valid_count
    
    print(f"Total sets found: {len(detected_sets)}")
    print(f"  ✅ Valid: {valid_count}")
    print(f"  ❌ Invalid: {invalid_count}")
    
    if valid_count > 0:
        print()
        print("Valid sets:")
        for s in detected_sets:
            if s.get("valid", False):
                print(f"  - {s['file']}: {s['name']} ({s['card_count']} cards)")
    
    if invalid_count > 0:
        print()
        print("Invalid sets:")
        for s in detected_sets:
            if not s.get("valid", False):
                print(f"  - {s['file']}: {', '.join(s.get('errors', ['Unknown error']))}")
    
    # Always update the index file
    print()
    print("=" * 60)
    update_index_file(detected_sets)


if __name__ == "__main__":
    main()

