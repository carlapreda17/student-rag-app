import json

def parse_options(val):
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val) if val else {}
    except Exception:
        return {}