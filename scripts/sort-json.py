import json
import os


def sort_json_recursive(item):
    """Recursively sorts dictionary keys."""
    if isinstance(item, dict):
        return {k: sort_json_recursive(v) for k, v in sorted(item.items())}
    if isinstance(item, list):
        return [sort_json_recursive(i) for i in item]
    return item


def process_directory(directory_path):
    """Walks through the directory and sorts every .json file found."""
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.lower().endswith(".json"):
                file_path = os.path.join(root, file)
                
                try:
                    # Read the original content
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    # Sort the keys
                    sorted_data = sort_json_recursive(data)

                    # Overwrite with ensure_ascii=False to keep special characters
                    with open(file_path, "w", encoding="utf-8") as f:
                        json.dump(
                            sorted_data, 
                            f, 
                            indent=4, 
                            ensure_ascii=False
                        )
                    
                    print(f"Successfully sorted: {file_path}")

                except Exception as e:
                    print(f"Failed to process {file_path}: {e}")


if __name__ == "__main__":
    # Change '.' to the specific path you want to target
    target_directory = "packages/shared/src/i18n/languages"
    process_directory(target_directory)