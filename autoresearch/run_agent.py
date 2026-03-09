#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-genai>=1.0.0"]
# ///
import os, subprocess, sys
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai>=1.0.0"])
    from google import genai
    from google.genai import types

API_KEY  = os.environ.get("GEMINI_API_KEY", "")
REPO_DIR = Path(__file__).parent

PREFERRED = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

def pick_model(client):
    try:
        available = {m.name.replace("models/", "") for m in client.models.list()}
        for name in PREFERRED:
            if name in available:
                return name
        for name in available:
            if "flash" in name:
                return name
        return next(iter(available))
    except Exception:
        return "gemini-2.0-flash-lite"

def read_file(path):
    try: return (REPO_DIR / path).read_text(encoding="utf-8")
    except Exception as e: return f"ERROR: {e}"

def write_file(path, content):
    try:
        p = REPO_DIR / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return f"OK: wrote {len(content)} chars to {path}"
    except Exception as e: return f"ERROR: {e}"

def run_command(command, timeout=700):
    try:
        r = subprocess.run(command, shell=True, capture_output=True,
                           text=True, timeout=int(timeout), cwd=REPO_DIR)
        out = (r.stdout + r.stderr).strip()
        if len(out) > 8000: out = out[:2000] + "\n[...]\n" + out[-4000:]
        return out or "(no output)"
    except subprocess.TimeoutExpired: return f"ERROR: timeout after {timeout}s"
    except Exception as e: return f"ERROR: {e}"

def list_files(directory="."):
    try:
        return "\n".join(sorted(
            str(f.relative_to(REPO_DIR))
            for f in (REPO_DIR / directory).rglob("*") if f.is_file()
        )[:100])
    except Exception as e: return f"ERROR: {e}"

TOOL_MAP = {"read_file": read_file, "write_file": write_file,
            "run_command": run_command, "list_files": list_files}

TOOLS = types.Tool(function_declarations=[
    types.FunctionDeclaration(name="read_file", description="Read a file from the repo.",
        parameters=types.Schema(type=types.Type.OBJECT,
            properties={"path": types.Schema(type=types.Type.STRING, description="Path relative to repo root")},
            required=["path"])),
    types.FunctionDeclaration(name="write_file", description="Write (overwrite) a file.",
        parameters=types.Schema(type=types.Type.OBJECT,
            properties={"path": types.Schema(type=types.Type.STRING),
                        "content": types.Schema(type=types.Type.STRING)},
            required=["path", "content"])),
    types.FunctionDeclaration(name="run_command",
        description="Run a shell command. Use timeout=700 for training runs.",
        parameters=types.Schema(type=types.Type.OBJECT,
            properties={"command": types.Schema(type=types.Type.STRING),
                        "timeout": types.Schema(type=types.Type.INTEGER)},
            required=["command"])),
    types.FunctionDeclaration(name="list_files", description="List files in a directory.",
        parameters=types.Schema(type=types.Type.OBJECT,
            properties={"directory": types.Schema(type=types.Type.STRING)})),
])

def run_agent():
    if not API_KEY:
        print('Set key first:\n  $env:GEMINI_API_KEY = "your_key"')
        sys.exit(1)

    client = genai.Client(api_key=API_KEY)
    model  = pick_model(client)
    print(f"[run_agent] Using model: {model}")

    config = types.GenerateContentConfig(
        tools=[TOOLS],
        system_instruction="You are a completely autonomous ML research agent. "
                           "Follow program.md exactly. Never ask the human for input. Never stop.",
    )

    seed = (f"{read_file('program.md')}\n\n--- README.md ---\n{read_file('README.md')}\n\n"
            "Begin setup immediately. Run the experiment loop FOREVER. "
            "The human is asleep. Never stop, never ask.")

    print("[run_agent] Agent started — Ctrl+C to stop.\n")
    history = [types.Content(role="user", parts=[types.Part(text=seed)])]

    while True:
        response  = client.models.generate_content(model=model, contents=history, config=config)
        candidate = response.candidates[0]
        history.append(candidate.content)

        fn_calls = []
        for part in candidate.content.parts:
            if part.text and part.text.strip(): print(f"\n[AGENT] {part.text.strip()}\n")
            if part.function_call: fn_calls.append(part.function_call)

        if not fn_calls:
            history.append(types.Content(role="user",
                parts=[types.Part(text="Continue. Keep running the experiment loop.")]))
            continue

        tool_parts = []
        for fc in fn_calls:
            args   = dict(fc.args) if fc.args else {}
            print(f"[TOOL] {fc.name}({args})")
            result = TOOL_MAP.get(fc.name, lambda **k: "ERROR: unknown tool")(**args)
            print(f"[RESULT] {result[:300]}{'...' if len(result) > 300 else ''}\n")
            tool_parts.append(types.Part(function_response=types.FunctionResponse(
                name=fc.name, response={"result": result})))

        history.append(types.Content(role="user", parts=tool_parts))

if __name__ == "__main__":
    run_agent()
